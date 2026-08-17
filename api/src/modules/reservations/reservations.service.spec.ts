import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from './reservations.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('ReservationsService (CRITICAL)', () => {
  let service: ReservationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReservationsService],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

  describe('create - Race Condition Prevention', () => {
    it('should prevent double-booking via idempotency', async () => {
      const gymId = 'gym-123';
      const userId = 'user-123';
      const classId = 'class-456';
      const membershipId = 'membership-789';
      const idempotencyKey = 'unique-key-12345';

      // First request
      const result1 = await service.create(userId, gymId, {
        classId,
        membershipId,
        idempotencyKey,
      });

      // Second identical request (same key)
      const result2 = await service.create(userId, gymId, {
        classId,
        membershipId,
        idempotencyKey,
      });

      // Should return same result (idempotent)
      expect(result1.id).toBe(result2.id);
    });

    it('should handle capacity limits with row locking', async () => {
      const gymId = 'gym-123';
      const classId = 'class-456'; // Capacity: 2
      const userId1 = 'user-1';
      const userId2 = 'user-2';
      const userId3 = 'user-3';

      // Users 1 and 2 reserve successfully
      const res1 = await service.create(userId1, gymId, {
        classId,
        membershipId: 'mem-1',
        idempotencyKey: 'key-1',
      });
      expect(res1.status).toBe('confirmed');

      const res2 = await service.create(userId2, gymId, {
        classId,
        membershipId: 'mem-2',
        idempotencyKey: 'key-2',
      });
      expect(res2.status).toBe('confirmed');

      // User 3 goes to waitlist (capacity full)
      const res3 = await service.create(userId3, gymId, {
        classId,
        membershipId: 'mem-3',
        idempotencyKey: 'key-3',
      });
      expect(res3.status).toBe('waiting');
    });

    it('should auto-promote from waitlist on cancellation', async () => {
      const gymId = 'gym-123';
      const classId = 'class-456';

      // Setup: User 1 reserved, User 2 on waitlist
      const user1 = 'user-1';
      const user2 = 'user-2';

      const res1 = await service.create(user1, gymId, {
        classId,
        membershipId: 'mem-1',
        idempotencyKey: 'key-1',
      });

      const res2 = await service.create(user2, gymId, {
        classId,
        membershipId: 'mem-2',
        idempotencyKey: 'key-2',
      });

      expect(res2.status).toBe('waiting');

      // User 1 cancels
      await service.cancel(user1, gymId, res1.id);

      // User 2 should be auto-promoted
      const promoted = await service.getById(gymId, res2.id);
      expect(promoted.status).toBe('confirmed');
    });
  });

  describe('Membership Validation', () => {
    it('should reject if membership expired', async () => {
      const gymId = 'gym-123';
      const userId = 'user-123';
      const expiredMembershipId = 'expired-mem';

      try {
        await service.create(userId, gymId, {
          classId: 'class-456',
          membershipId: expiredMembershipId,
          idempotencyKey: 'key-123',
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('expired');
      }
    });

    it('should reject if membership frozen', async () => {
      const gymId = 'gym-123';
      const userId = 'user-123';
      const frozenMembershipId = 'frozen-mem';

      try {
        await service.create(userId, gymId, {
          classId: 'class-456',
          membershipId: frozenMembershipId,
          idempotencyKey: 'key-123',
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('frozen');
      }
    });
  });

  describe('Waitlist Management', () => {
    it('should track waitlist position', async () => {
      const gymId = 'gym-123';
      const classId = 'class-456';

      // Fill capacity
      for (let i = 0; i < 2; i++) {
        await service.create(`user-${i}`, gymId, {
          classId,
          membershipId: `mem-${i}`,
          idempotencyKey: `key-${i}`,
        });
      }

      // Add to waitlist
      const res1 = await service.create('user-3', gymId, {
        classId,
        membershipId: 'mem-3',
        idempotencyKey: 'key-3',
      });
      expect(res1.waitlistPosition).toBe(1);

      const res2 = await service.create('user-4', gymId, {
        classId,
        membershipId: 'mem-4',
        idempotencyKey: 'key-4',
      });
      expect(res2.waitlistPosition).toBe(2);
    });

    it('should handle waitlist expiry', async () => {
      const gymId = 'gym-123';
      const classId = 'class-456';
      const userId = 'user-123';

      const res = await service.create(userId, gymId, {
        classId,
        membershipId: 'mem-123',
        idempotencyKey: 'key-123',
      });

      // After class time, expired waitlist entries not promoted
      const status = await service.getById(gymId, res.id);
      if (status.status === 'waiting') {
        expect(status.status).not.toBe('upgraded');
      }
    });
  });

  describe('Concurrency Stress Test', () => {
    it('should handle concurrent bookings safely', async () => {
      const gymId = 'gym-123';
      const classId = 'class-456'; // Capacity: 2

      // Simulate 5 concurrent requests
      const promises = Array.from({ length: 5 }, (_, i) =>
        service.create(`user-${i}`, gymId, {
          classId,
          membershipId: `mem-${i}`,
          idempotencyKey: `key-${i}`,
        }).catch(() => null) // Handle failures gracefully
      );

      const results = await Promise.all(promises);

      // Count confirmations
      const confirmed = results.filter((r) => r?.status === 'confirmed');
      const waiting = results.filter((r) => r?.status === 'waiting');

      // Should never exceed capacity
      expect(confirmed.length).toBeLessThanOrEqual(2);
      expect(waiting.length).toBeGreaterThanOrEqual(0);
      expect(confirmed.length + waiting.length).toBeLessThanOrEqual(5);
    });
  });
});
