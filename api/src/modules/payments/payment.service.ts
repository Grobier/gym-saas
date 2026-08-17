import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

interface InitiatePaymentInput {
  membershipId: string;
  amount: number;
  paymentMethod: 'webpay' | 'mercado_pago' | 'transfer' | 'cash';
  description?: string;
}

interface ProcessWebhookInput {
  provider: string;
  webhookId: string;
  eventType: string;
  payload: any;
  signature: string;
}

@Injectable()
export class PaymentService {
  private supabase = createClient(
    this.configService.getOrThrow('NEXT_PUBLIC_SUPABASE_URL'),
    this.configService.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
  );

  constructor(private configService: ConfigService) {}

  /**
   * Initiate payment for membership
   */
  async initiate(userId: string, gymId: string, input: InitiatePaymentInput): Promise<any> {
    // 1. Get membership
    const { data: membership, error: memberError } = await this.supabase
      .from('memberships')
      .select('*')
      .eq('gym_id', gymId)
      .eq('id', input.membershipId)
      .single();

    if (memberError || !membership) {
      throw new NotFoundException('Membership not found');
    }

    // 2. Get student
    const { data: student } = await this.supabase
      .from('students')
      .select('*')
      .eq('id', membership.student_id)
      .single();

    // 3. Create payment record
    const { data: payment, error: paymentError } = await this.supabase
      .from('payments')
      .insert({
        gym_id: gymId,
        student_id: student.id,
        membership_id: input.membershipId,
        amount: input.amount,
        currency: 'CLP',
        status: 'pending',
        payment_method: input.paymentMethod,
        created_by: userId,
      })
      .select()
      .single();

    if (paymentError) {
      throw new BadRequestException('Failed to create payment');
    }

    // 4. Route to payment provider
    let response: any;

    switch (input.paymentMethod) {
      case 'webpay':
        response = await this.initiateWebpay(payment);
        break;
      case 'mercado_pago':
        response = await this.initiateMercadoPago(payment);
        break;
      case 'transfer':
        response = await this.initiateTransfer(payment);
        break;
      case 'cash':
        response = await this.initiateCash(payment, userId);
        break;
      default:
        throw new BadRequestException('Invalid payment method');
    }

    return response;
  }

  /**
   * Process webhook from payment provider
   * CRITICAL: Must be idempotent (webhooks can retry)
   */
  async processWebhook(input: ProcessWebhookInput): Promise<any> {
    // 1. Check webhook idempotency
    const { data: existing } = await this.supabase
      .from('webhook_logs')
      .select('*')
      .eq('webhook_id', input.webhookId)
      .single();

    if (existing?.processed) {
      // Already processed, return success (idempotent)
      return { message: 'Already processed' };
    }

    // 2. Log webhook
    const { data: log } = await this.supabase
      .from('webhook_logs')
      .insert({
        provider: input.provider,
        webhook_id: input.webhookId,
        event_type: input.eventType,
        payload: input.payload,
        signature: input.signature,
        signature_valid: await this.verifySignature(input),
        processed: false,
      })
      .select()
      .single();

    if (!log.signature_valid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // 3. Route by provider
    let result: any;

    switch (input.provider) {
      case 'webpay':
        result = await this.processWebpayWebhook(input.payload);
        break;
      case 'mercado_pago':
        result = await this.processMercadoPagoWebhook(input.payload);
        break;
      default:
        throw new BadRequestException('Unknown provider');
    }

    // 4. Mark as processed
    await this.supabase
      .from('webhook_logs')
      .update({ processed: true })
      .eq('id', log.id);

    return result;
  }

  /**
   * Handle transfer proof upload
   */
  async uploadTransferProof(
    userId: string,
    paymentId: string,
    fileName: string,
    fileContent: Buffer,
  ): Promise<any> {
    // 1. Upload file to storage
    const filePath = `payments/${paymentId}/${fileName}`;
    const { data: uploadData, error: uploadError } = await this.supabase.storage
      .from('payments')
      .upload(filePath, fileContent, { upsert: false });

    if (uploadError) {
      throw new BadRequestException('Failed to upload proof');
    }

    // 2. Update payment with proof URL
    const { data: payment, error: updateError } = await this.supabase
      .from('payments')
      .update({
        transfer_proof_url: `payments/${uploadData.path}`,
        status: 'pending_validation',
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (updateError) {
      throw new BadRequestException('Failed to update payment');
    }

    return this.formatPayment(payment);
  }

  /**
   * Validate transfer (admin only)
   */
  async validateTransfer(userId: string, paymentId: string, approved: boolean): Promise<any> {
    // Get payment
    const { data: payment } = await this.supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const newStatus = approved ? 'completed' : 'failed';

    // 1. Update payment status
    const { data: updated } = await this.supabase
      .from('payments')
      .update({
        status: newStatus,
        completed_at: new Date(),
        completed_by: userId,
      })
      .eq('id', paymentId)
      .select()
      .single();

    // 2. If approved, activate membership
    if (approved) {
      await this.activateMembership(payment.membership_id);
    }

    return this.formatPayment(updated);
  }

  /**
   * Get payment by ID
   */
  async getById(gymId: string, paymentId: string): Promise<any> {
    const { data: payment, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('gym_id', gymId)
      .eq('id', paymentId)
      .single();

    if (error || !payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.formatPayment(payment);
  }

  /**
   * Activate membership after successful payment
   */
  private async activateMembership(membershipId: string): Promise<void> {
    const { data: membership } = await this.supabase
      .from('memberships')
      .select('*, plans(*)')
      .eq('id', membershipId)
      .single();

    if (!membership) return;

    const plan = membership.plans;
    if (!plan) return;

    // Set start/end dates
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);

    await this.supabase
      .from('memberships')
      .update({
        status: 'active',
        starts_at: startsAt,
        expires_at: expiresAt,
        updated_at: new Date(),
      })
      .eq('id', membershipId);

    // Initialize consumption ledger
    if (plan.classes_per_cycle) {
      await this.supabase.from('class_consumption_ledger').insert({
        gym_id: membership.gym_id,
        membership_id: membershipId,
        transaction_type: 'assignment',
        quantity: plan.classes_per_cycle,
        related_entity_type: 'payment',
        related_entity_id: membershipId,
        description: `Payment completed for: ${plan.name}`,
        created_by: null,
      });
    }
  }

  /**
   * Provider-specific implementations
   */

  private async initiateWebpay(payment: any): Promise<any> {
    // TODO: Call Webpay API
    // For now, return mock response
    return {
      provider: 'webpay',
      type: 'redirect',
      url: `https://webpay.example.com/pay?token=${payment.id}`,
      paymentId: payment.id,
    };
  }

  private async initiateMercadoPago(payment: any): Promise<any> {
    // TODO: Call Mercado Pago API
    return {
      provider: 'mercado_pago',
      type: 'redirect',
      url: `https://mercadopago.example.com/pay?id=${payment.id}`,
      paymentId: payment.id,
    };
  }

  private async initiateTransfer(payment: any): Promise<any> {
    return {
      type: 'transfer',
      status: 'pending_proof',
      paymentId: payment.id,
      message: 'Please upload transfer proof',
      bankDetails: {
        accountName: 'Gym SaaS Inc',
        accountNumber: '****1234',
        bankName: 'Bank Example',
      },
    };
  }

  private async initiateCash(payment: any, userId: string): Promise<any> {
    // Mark as completed immediately for cash payments
    await this.supabase
      .from('payments')
      .update({
        status: 'completed',
        completed_at: new Date(),
        completed_by: userId,
      })
      .eq('id', payment.id);

    // Activate membership
    await this.activateMembership(payment.membership_id);

    return {
      type: 'cash',
      status: 'completed',
      paymentId: payment.id,
      message: 'Payment recorded and membership activated',
    };
  }

  private async processWebpayWebhook(payload: any): Promise<any> {
    // TODO: Verify Webpay signature and process
    return { message: 'Webpay webhook processed' };
  }

  private async processMercadoPagoWebhook(payload: any): Promise<any> {
    // TODO: Verify Mercado Pago signature and process
    return { message: 'Mercado Pago webhook processed' };
  }

  private async verifySignature(input: ProcessWebhookInput): Promise<boolean> {
    // TODO: Implement signature verification based on provider
    // For now, accept all (to be implemented with actual provider keys)
    return true;
  }

  /**
   * Format payment response
   */
  private formatPayment(payment: any): any {
    return {
      id: payment.id,
      gymId: payment.gym_id,
      studentId: payment.student_id,
      membershipId: payment.membership_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.payment_method,
      providerReference: payment.provider_reference,
      transferProofUrl: payment.transfer_proof_url,
      createdAt: new Date(payment.created_at),
      completedAt: payment.completed_at ? new Date(payment.completed_at) : null,
    };
  }
}
