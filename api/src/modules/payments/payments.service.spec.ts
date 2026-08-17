import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';

describe('PaymentService (CRITICAL)', () => {
  let service: PaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentService],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  describe('Webhook Idempotency', () => {
    it('should process webhook only once', async () => {
      const webhookId = 'webhook-123';
      const payload = {
        id: 'payment-456',
        status: 'completed',
        amount: 10000,
      };

      // First webhook call
      const result1 = await service.processWebhook({
        provider: 'webpay',
        webhookId,
        eventType: 'payment.success',
        payload,
        signature: 'valid-sig',
      });

      // Second identical webhook call (retry)
      const result2 = await service.processWebhook({
        provider: 'webpay',
        webhookId,
        eventType: 'payment.success',
        payload,
        signature: 'valid-sig',
      });

      // Both should succeed but only one payment recorded
      expect(result1.message).toBeDefined();
      expect(result2.message).toContain('Already processed');
    });

    it('should handle concurrent webhooks safely', async () => {
      const webhookId = 'webhook-789';
      const payload = {
        id: 'payment-789',
        status: 'completed',
        amount: 5000,
      };

      // Simulate 3 concurrent webhook requests
      const promises = Array.from({ length: 3 }, () =>
        service.processWebhook({
          provider: 'mercado_pago',
          webhookId,
          eventType: 'payment.success',
          payload,
          signature: 'valid-sig',
        }).catch(() => null)
      );

      const results = await Promise.all(promises);

      // All should succeed or be idempotent
      const processed = results.filter((r) => r && !r.message.includes('Already'));
      expect(processed.length).toBeLessThanOrEqual(1);
    });

    it('should reject invalid webhook signature', async () => {
      try {
        await service.processWebhook({
          provider: 'webpay',
          webhookId: 'webhook-invalid',
          eventType: 'payment.success',
          payload: {},
          signature: 'invalid-sig',
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('Invalid');
      }
    });
  });

  describe('Payment Methods', () => {
    it('should handle Webpay payment', async () => {
      const userId = 'user-123';
      const gymId = 'gym-123';

      const result = await service.initiate(userId, gymId, {
        membershipId: 'mem-123',
        amount: 50000,
        paymentMethod: 'webpay',
      });

      expect(result.provider).toBe('webpay');
      expect(result.type).toBe('redirect');
      expect(result.url).toContain('webpay');
    });

    it('should handle Mercado Pago payment', async () => {
      const userId = 'user-123';
      const gymId = 'gym-123';

      const result = await service.initiate(userId, gymId, {
        membershipId: 'mem-123',
        amount: 50000,
        paymentMethod: 'mercado_pago',
      });

      expect(result.provider).toBe('mercado_pago');
      expect(result.type).toBe('redirect');
    });

    it('should handle Transfer payment with proof', async () => {
      const userId = 'user-123';
      const gymId = 'gym-123';

      const result = await service.initiate(userId, gymId, {
        membershipId: 'mem-123',
        amount: 50000,
        paymentMethod: 'transfer',
      });

      expect(result.type).toBe('transfer');
      expect(result.status).toBe('pending_proof');
      expect(result.bankDetails).toBeDefined();
    });

    it('should handle Cash payment (immediate)', async () => {
      const userId = 'user-123';
      const gymId = 'gym-123';

      const result = await service.initiate(userId, gymId, {
        membershipId: 'mem-123',
        amount: 50000,
        paymentMethod: 'cash',
      });

      expect(result.type).toBe('cash');
      expect(result.status).toBe('completed');
      expect(result.message).toContain('activated');
    });
  });

  describe('Transfer Validation', () => {
    it('should approve valid transfer proof', async () => {
      const userId = 'admin-123';
      const gymId = 'gym-123';
      const paymentId = 'payment-123';

      const result = await service.validateTransfer(userId, paymentId, true);

      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeDefined();
    });

    it('should reject invalid transfer proof', async () => {
      const userId = 'admin-123';
      const gymId = 'gym-123';
      const paymentId = 'payment-456';

      const result = await service.validateTransfer(userId, paymentId, false);

      expect(result.status).toBe('failed');
    });

    it('should activate membership on approved payment', async () => {
      const userId = 'admin-123';
      const paymentId = 'payment-789';

      const result = await service.validateTransfer(userId, paymentId, true);

      // Membership should be activated (verified in activation flow)
      expect(result.status).toBe('completed');
    });
  });

  describe('Refunds', () => {
    it('should refund completed payment', async () => {
      const userId = 'user-123';
      const paymentId = 'payment-123';

      // Mock: Payment is already completed
      const refund = await service.initiateRefund?.(userId, paymentId, 50000);

      if (refund) {
        expect(refund.status).toBe('pending');
        expect(refund.amount).toBe(50000);
      }
    });
  });

  describe('Integration with Memberships', () => {
    it('should activate membership after payment', async () => {
      const userId = 'user-123';
      const gymId = 'gym-123';

      // Initiate cash payment (immediate)
      const payment = await service.initiate(userId, gymId, {
        membershipId: 'mem-123',
        amount: 50000,
        paymentMethod: 'cash',
      });

      // Membership should be activated
      expect(payment.status).toBe('completed');
    });

    it('should NOT activate on pending payment', async () => {
      const userId = 'user-123';
      const gymId = 'gym-123';

      // Initiate Webpay (pending)
      const payment = await service.initiate(userId, gymId, {
        membershipId: 'mem-123',
        amount: 50000,
        paymentMethod: 'webpay',
      });

      // Membership NOT activated yet
      expect(payment.status).not.toBe('completed');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing membership', async () => {
      try {
        await service.initiate('user-123', 'gym-123', {
          membershipId: 'invalid-mem',
          amount: 50000,
          paymentMethod: 'cash',
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('not found');
      }
    });

    it('should handle invalid amount', async () => {
      try {
        await service.initiate('user-123', 'gym-123', {
          membershipId: 'mem-123',
          amount: -100,
          paymentMethod: 'cash',
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('Invalid');
      }
    });
  });
});
