import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface InitiatePaymentRequest {
  membershipId: string;
  amount: number;
  paymentMethod: 'webpay' | 'mercado_pago' | 'transfer' | 'cash';
  description?: string;
}

interface ProcessWebhookRequest {
  provider: string;
  webhookId: string;
  eventType: string;
  payload: any;
  signature: string;
}

interface ValidateTransferRequest {
  approved: boolean;
}

@Controller('gyms/:gymId/payments')
export class PaymentsController {
  constructor(private paymentService: PaymentService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async initiate(
    @Req() req: any,
    @Param('gymId') gymId: string,
    @Body() input: InitiatePaymentRequest,
  ): Promise<any> {
    return this.paymentService.initiate(req.user.sub, gymId, input);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(
    @Param('gymId') gymId: string,
    @Param('id') paymentId: string,
  ): Promise<any> {
    return this.paymentService.getById(gymId, paymentId);
  }

  @Post(':id/transfer-proof')
  @UseGuards(JwtAuthGuard)
  async uploadTransferProof(
    @Req() req: any,
    @Param('gymId') gymId: string,
    @Param('id') paymentId: string,
    @Body() body: { fileName: string; fileContent: string },
  ): Promise<any> {
    // fileContent is base64
    if (!body.fileName || !body.fileContent) {
      throw new BadRequestException('fileName and fileContent required');
    }

    const buffer = Buffer.from(body.fileContent, 'base64');
    return this.paymentService.uploadTransferProof(
      req.user.sub,
      paymentId,
      body.fileName,
      buffer,
    );
  }

  @Put(':id/transfer-validation')
  @UseGuards(JwtAuthGuard)
  async validateTransfer(
    @Req() req: any,
    @Param('gymId') gymId: string,
    @Param('id') paymentId: string,
    @Body() input: ValidateTransferRequest,
  ): Promise<any> {
    return this.paymentService.validateTransfer(
      req.user.sub,
      paymentId,
      input.approved,
    );
  }

  @Post('webhooks/webpay')
  async webhookWebpay(@Body() body: any, @Req() req: any): Promise<any> {
    // Extract signature from header
    const signature = req.headers['x-webpay-signature'] || '';

    return this.paymentService.processWebhook({
      provider: 'webpay',
      webhookId: body.webhookId || body.id,
      eventType: body.type,
      payload: body,
      signature,
    });
  }

  @Post('webhooks/mercado-pago')
  async webhookMercadoPago(@Body() body: any, @Req() req: any): Promise<any> {
    const signature = req.headers['x-signature'] || '';

    return this.paymentService.processWebhook({
      provider: 'mercado_pago',
      webhookId: body.id,
      eventType: body.type,
      payload: body,
      signature,
    });
  }
}
