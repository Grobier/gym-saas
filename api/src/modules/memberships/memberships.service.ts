import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

interface CreatePlanInput {
  name: string;
  description?: string;
  durationDays: number;
  classesPerCycle: number | null; // null = unlimited
  price: number;
  maxDisciplines?: number;
  allowedDisciplines?: string[];
  isRecurring?: boolean;
}

interface CreateMembershipInput {
  studentId: string;
  planId: string;
  startsAt: string;
}

interface MembershipActionInput {
  reason?: string;
  extensionDays?: number;
  newPlanId?: string;
}

@Injectable()
export class MembershipsService {
  private supabase = createClient(
    this.configService.getOrThrow('NEXT_PUBLIC_SUPABASE_URL'),
    this.configService.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
  );

  constructor(private configService: ConfigService) {}

  /**
   * Create plan (admin only)
   */
  async createPlan(userId: string, gymId: string, input: CreatePlanInput): Promise<any> {
    // Verify admin
    await this.verifyAdminAccess(userId, gymId);

    const { data: plan, error } = await this.supabase
      .from('plans')
      .insert({
        gym_id: gymId,
        name: input.name,
        description: input.description,
        duration_days: input.durationDays,
        classes_per_cycle: input.classesPerCycle,
        price: input.price,
        max_disciplines: input.maxDisciplines,
        allowed_disciplines: input.allowedDisciplines || [],
        is_recurring: input.isRecurring || false,
        status: 'active',
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to create plan');
    }

    return this.formatPlan(plan);
  }

  /**
   * Create membership for student
   */
  async createMembership(userId: string, gymId: string, input: CreateMembershipInput): Promise<any> {
    // Verify admin
    await this.verifyAdminAccess(userId, gymId);

    // Get plan
    const { data: plan, error: planError } = await this.supabase
      .from('plans')
      .select('*')
      .eq('gym_id', gymId)
      .eq('id', input.planId)
      .single();

    if (planError || !plan) {
      throw new NotFoundException('Plan not found');
    }

    // Calculate expiry
    const startsAt = new Date(input.startsAt);
    const expiresAt = new Date(startsAt.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);

    // Create membership
    const { data: membership, error: memberError } = await this.supabase
      .from('memberships')
      .insert({
        gym_id: gymId,
        student_id: input.studentId,
        plan_id: input.planId,
        status: 'active',
        starts_at: startsAt,
        expires_at: expiresAt,
        is_recurring: plan.is_recurring,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (memberError) {
      throw new BadRequestException('Failed to create membership');
    }

    // Initialize consumption ledger
    if (plan.classes_per_cycle) {
      await this.supabase.from('class_consumption_ledger').insert({
        gym_id: gymId,
        membership_id: membership.id,
        transaction_type: 'assignment',
        quantity: plan.classes_per_cycle,
        related_entity_type: 'plan',
        related_entity_id: input.planId,
        description: `Plan assigned: ${plan.name}`,
        created_by: userId,
      });
    }

    // Track history
    await this.supabase.from('membership_history').insert({
      gym_id: gymId,
      membership_id: membership.id,
      old_plan_id: null,
      new_plan_id: input.planId,
      change_reason: 'New membership',
      created_by: userId,
    });

    return this.formatMembership(membership);
  }

  /**
   * Get membership by ID
   */
  async getById(gymId: string, membershipId: string): Promise<any> {
    const { data: membership, error } = await this.supabase
      .from('memberships')
      .select('*')
      .eq('gym_id', gymId)
      .eq('id', membershipId)
      .single();

    if (error || !membership) {
      throw new NotFoundException('Membership not found');
    }

    // Get consumption
    const { data: ledger } = await this.supabase
      .from('class_consumption_ledger')
      .select('quantity, transaction_type')
      .eq('membership_id', membershipId);

    const consumed = -(ledger || [])
      .filter((l: any) => l.transaction_type === 'consumption')
      .reduce((sum: number, l: any) => sum + l.quantity, 0);

    const assigned = (ledger || [])
      .filter((l: any) => l.transaction_type === 'assignment')
      .reduce((sum: number, l: any) => sum + l.quantity, 0);

    const remaining = assigned - consumed;

    return {
      ...this.formatMembership(membership),
      classesAssigned: assigned,
      classesConsumed: consumed,
      classesRemaining: remaining,
    };
  }

  /**
   * List memberships for student
   */
  async listByStudent(gymId: string, studentId: string): Promise<any[]> {
    const { data: memberships, error } = await this.supabase
      .from('memberships')
      .select('*')
      .eq('gym_id', gymId)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      return [];
    }

    return Promise.all(
      (memberships || []).map(async (m) => {
        const { data: ledger } = await this.supabase
          .from('class_consumption_ledger')
          .select('quantity, transaction_type')
          .eq('membership_id', m.id);

        const consumed = -(ledger || [])
          .filter((l: any) => l.transaction_type === 'consumption')
          .reduce((sum: number, l: any) => sum + l.quantity, 0);

        const assigned = (ledger || [])
          .filter((l: any) => l.transaction_type === 'assignment')
          .reduce((sum: number, l: any) => sum + l.quantity, 0);

        return {
          ...this.formatMembership(m),
          classesRemaining: assigned - consumed,
        };
      }),
    );
  }

  /**
   * Freeze membership
   */
  async freeze(userId: string, gymId: string, membershipId: string): Promise<any> {
    await this.verifyAdminAccess(userId, gymId);

    const { data: membership, error } = await this.supabase
      .from('memberships')
      .update({
        status: 'frozen',
        frozen_at: new Date(),
        updated_by: userId,
        updated_at: new Date(),
      })
      .eq('gym_id', gymId)
      .eq('id', membershipId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to freeze membership');
    }

    return this.formatMembership(membership);
  }

  /**
   * Extend membership
   */
  async extend(
    userId: string,
    gymId: string,
    membershipId: string,
    input: MembershipActionInput,
  ): Promise<any> {
    await this.verifyAdminAccess(userId, gymId);

    const { data: membership, error: memberError } = await this.supabase
      .from('memberships')
      .select('*')
      .eq('gym_id', gymId)
      .eq('id', membershipId)
      .single();

    if (memberError || !membership) {
      throw new NotFoundException('Membership not found');
    }

    const currentExpiry = new Date(membership.expires_at);
    const newExpiry = new Date(currentExpiry.getTime() + (input.extensionDays || 30) * 24 * 60 * 60 * 1000);

    const { data: updated, error } = await this.supabase
      .from('memberships')
      .update({
        expires_at: newExpiry,
        updated_by: userId,
        updated_at: new Date(),
      })
      .eq('id', membershipId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to extend membership');
    }

    return this.formatMembership(updated);
  }

  /**
   * Gift classes to membership
   */
  async giftClasses(
    userId: string,
    gymId: string,
    membershipId: string,
    quantity: number,
    reason: string,
  ): Promise<void> {
    await this.verifyAdminAccess(userId, gymId);

    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    await this.supabase.from('class_consumption_ledger').insert({
      gym_id: gymId,
      membership_id: membershipId,
      transaction_type: 'gift',
      quantity,
      description: reason || 'Classes gifted by admin',
      created_by: userId,
    });
  }

  /**
   * Get plans for gym
   */
  async listPlans(gymId: string): Promise<any[]> {
    const { data: plans, error } = await this.supabase
      .from('plans')
      .select('*')
      .eq('gym_id', gymId)
      .eq('status', 'active')
      .order('price');

    if (error) {
      return [];
    }

    return (plans || []).map((p) => this.formatPlan(p));
  }

  /**
   * Verify admin access
   */
  private async verifyAdminAccess(userId: string, gymId: string): Promise<void> {
    const { data: access } = await this.supabase
      .from('gym_access')
      .select('*')
      .eq('user_id', userId)
      .eq('gym_id', gymId)
      .eq('role', 'admin')
      .single();

    if (!access) {
      throw new ForbiddenException('Admin access required');
    }
  }

  /**
   * Format membership response
   */
  private formatMembership(membership: any): any {
    return {
      id: membership.id,
      gymId: membership.gym_id,
      studentId: membership.student_id,
      planId: membership.plan_id,
      status: membership.status,
      startsAt: new Date(membership.starts_at),
      expiresAt: new Date(membership.expires_at),
      isRecurring: membership.is_recurring,
      createdAt: new Date(membership.created_at),
    };
  }

  /**
   * Format plan response
   */
  private formatPlan(plan: any): any {
    return {
      id: plan.id,
      gymId: plan.gym_id,
      name: plan.name,
      description: plan.description,
      durationDays: plan.duration_days,
      classesPerCycle: plan.classes_per_cycle,
      price: plan.price,
      maxDisciplines: plan.max_disciplines,
      allowedDisciplines: plan.allowed_disciplines,
      isRecurring: plan.is_recurring,
      status: plan.status,
      createdAt: new Date(plan.created_at),
    };
  }
}
