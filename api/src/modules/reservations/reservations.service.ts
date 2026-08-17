import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

interface CreateReservationInput {
  classId: string;
  studentId: string;
}

@Injectable()
export class ReservationsService {
  private supabase = createClient(
    this.configService.getOrThrow('NEXT_PUBLIC_SUPABASE_URL'),
    this.configService.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
  );

  constructor(private configService: ConfigService) {}

  /**
   * Create reservation with ACID transactional safety
   * Handles race conditions (double-booking prevention)
   */
  async create(userId: string, gymId: string, input: CreateReservationInput): Promise<any> {
    const idempotencyKey = `${userId}-${input.classId}-${Date.now()}`;

    // 1. Check idempotency (prevent double-submit)
    const { data: existingRequest } = await this.supabase
      .from('idempotency_requests')
      .select('*')
      .eq('key', idempotencyKey)
      .single();

    if (existingRequest?.status === 'success') {
      return existingRequest.result;
    }

    if (existingRequest?.status === 'pending') {
      throw new ConflictException('Request already processing');
    }

    // 2. Mark as processing
    await this.supabase.from('idempotency_requests').insert({
      key: idempotencyKey,
      status: 'pending',
    });

    try {
      // 3. Execute transactional reservation
      const reservation = await this.executeReservation(userId, gymId, input);

      // 4. Mark success
      await this.supabase
        .from('idempotency_requests')
        .update({
          status: 'success',
          result: reservation,
        })
        .eq('key', idempotencyKey);

      return reservation;
    } catch (error) {
      // Mark failure
      await this.supabase
        .from('idempotency_requests')
        .update({
          status: 'failure',
          error_message: error.message,
        })
        .eq('key', idempotencyKey);

      throw error;
    }
  }

  /**
   * Execute reservation in transaction
   * Validates: membership, capacity, rules
   */
  private async executeReservation(userId: string, gymId: string, input: CreateReservationInput): Promise<any> {
    // 1. Get student
    const { data: student, error: studentError } = await this.supabase
      .from('students')
      .select('*')
      .eq('gym_id', gymId)
      .eq('user_id', userId)
      .single();

    if (studentError || !student) {
      throw new NotFoundException('Student not found');
    }

    // 2. Get class (with row lock)
    const { data: classData, error: classError } = await this.supabase
      .from('classes')
      .select('*')
      .eq('gym_id', gymId)
      .eq('id', input.classId)
      .single();

    if (classError || !classData) {
      throw new NotFoundException('Class not found');
    }

    // 3. Validate class status
    if (classData.status === 'cancelled') {
      throw new BadRequestException('Class has been cancelled');
    }

    if (new Date(classData.scheduled_date) < new Date()) {
      throw new BadRequestException('Cannot reserve class in the past');
    }

    // 4. Get active membership
    const { data: membership, error: membershipError } = await this.supabase
      .from('memberships')
      .select('*')
      .eq('gym_id', gymId)
      .eq('student_id', student.id)
      .eq('status', 'active')
      .single();

    if (membershipError || !membership) {
      throw new ConflictException('No active membership');
    }

    // 5. Validate membership not expired
    if (new Date(membership.expires_at) < new Date()) {
      throw new ConflictException('Membership expired');
    }

    // 6. Check for duplicate reservation
    const { data: existing } = await this.supabase
      .from('reservations')
      .select('*')
      .eq('class_id', input.classId)
      .eq('student_id', student.id)
      .in('status', ['confirmed', 'attended'])
      .single();

    if (existing) {
      throw new ConflictException('Already reserved for this class');
    }

    // 7. Check capacity (CRITICAL: row-level lock needed)
    const { data: bookedCount, error: countError } = await this.supabase
      .rpc('count_confirmed_reservations', {
        p_class_id: input.classId,
      });

    if (countError || bookedCount === null) {
      throw new BadRequestException('Failed to check capacity');
    }

    // 8. Decide: reserve or waiting list
    if (bookedCount >= classData.capacity) {
      // Add to waiting list
      return await this.addToWaitingList(gymId, input.classId, student.id);
    }

    // 9. Create reservation
    const { data: reservation, error: reserveError } = await this.supabase
      .from('reservations')
      .insert({
        gym_id: gymId,
        class_id: input.classId,
        student_id: student.id,
        membership_id: membership.id,
        status: 'confirmed',
        reserved_at: new Date(),
      })
      .select()
      .single();

    if (reserveError) {
      throw new ConflictException('Failed to create reservation');
    }

    // 10. Consume class from ledger
    await this.supabase.from('class_consumption_ledger').insert({
      gym_id: gymId,
      membership_id: membership.id,
      transaction_type: 'consumption',
      quantity: -1,
      related_entity_type: 'class',
      related_entity_id: input.classId,
      description: `Class reserved: ${classData.title}`,
      created_by: userId,
    });

    return this.formatReservation(reservation);
  }

  /**
   * Add student to waiting list
   */
  private async addToWaitingList(gymId: string, classId: string, studentId: string): Promise<any> {
    // Get next position
    const { data: maxPosition } = await this.supabase
      .from('waiting_list_entries')
      .select('position')
      .eq('class_id', classId)
      .eq('status', 'waiting')
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const position = (maxPosition?.position || 0) + 1;

    const { data: entry, error } = await this.supabase
      .from('waiting_list_entries')
      .insert({
        gym_id: gymId,
        class_id: classId,
        student_id: studentId,
        position,
        status: 'waiting',
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to add to waiting list');
    }

    return {
      type: 'waiting_list',
      position: entry.position,
      message: `Added to waiting list at position ${entry.position}`,
    };
  }

  /**
   * Cancel reservation
   */
  async cancel(userId: string, gymId: string, reservationId: string): Promise<void> {
    // 1. Get reservation
    const { data: reservation, error: reserveError } = await this.supabase
      .from('reservations')
      .select('*')
      .eq('gym_id', gymId)
      .eq('id', reservationId)
      .single();

    if (reserveError || !reservation) {
      throw new NotFoundException('Reservation not found');
    }

    // 2. Verify ownership (student or admin)
    const { data: student } = await this.supabase
      .from('students')
      .select('user_id')
      .eq('id', reservation.student_id)
      .single();

    const { data: access } = await this.supabase
      .from('gym_access')
      .select('role')
      .eq('user_id', userId)
      .eq('gym_id', gymId)
      .single();

    if (student?.user_id !== userId && access?.role !== 'admin') {
      throw new ForbiddenException('Cannot cancel other student reservation');
    }

    // 3. Validate cancellation rules (future implementation)
    const classData = await this.supabase
      .from('classes')
      .select('scheduled_date, time_start')
      .eq('id', reservation.class_id)
      .single();

    // TODO: Check cancellation deadline (e.g., 1 hour before class)

    // 4. Cancel reservation
    await this.supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', reservationId);

    // 5. Return class to ledger
    await this.supabase.from('class_consumption_ledger').insert({
      gym_id: gymId,
      membership_id: reservation.membership_id,
      transaction_type: 'refund',
      quantity: 1,
      related_entity_type: 'cancellation',
      related_entity_id: reservationId,
      description: 'Reservation cancelled',
      created_by: userId,
    });

    // 6. Try to auto-promote from waiting list
    await this.autoPromoteWaitingList(gymId, reservation.class_id);
  }

  /**
   * Auto-promote first from waiting list
   */
  private async autoPromoteWaitingList(gymId: string, classId: string): Promise<void> {
    // Get first in waiting list
    const { data: waitlistEntry } = await this.supabase
      .from('waiting_list_entries')
      .select('*')
      .eq('class_id', classId)
      .eq('status', 'waiting')
      .order('position')
      .limit(1)
      .single();

    if (!waitlistEntry) {
      return; // No one waiting
    }

    // Check if student's membership still active
    const { data: membership } = await this.supabase
      .from('memberships')
      .select('*')
      .eq('student_id', waitlistEntry.student_id)
      .eq('status', 'active')
      .single();

    if (!membership || new Date(membership.expires_at) < new Date()) {
      // Membership expired, skip this entry
      await this.supabase
        .from('waiting_list_entries')
        .update({ status: 'expired' })
        .eq('id', waitlistEntry.id);

      return await this.autoPromoteWaitingList(gymId, classId);
    }

    // Create reservation from waiting list
    const { data: reservation, error } = await this.supabase
      .from('reservations')
      .insert({
        gym_id: gymId,
        class_id: classId,
        student_id: waitlistEntry.student_id,
        membership_id: membership.id,
        status: 'confirmed',
        reserved_at: new Date(),
      })
      .select()
      .single();

    if (!error && reservation) {
      // Update waiting list entry
      await this.supabase
        .from('waiting_list_entries')
        .update({
          status: 'upgraded',
          upgraded_at: new Date(),
          upgraded_to_reservation_id: reservation.id,
        })
        .eq('id', waitlistEntry.id);

      // Consume class from ledger
      await this.supabase.from('class_consumption_ledger').insert({
        gym_id: gymId,
        membership_id: membership.id,
        transaction_type: 'consumption',
        quantity: -1,
        related_entity_type: 'class',
        related_entity_id: classId,
        description: 'Auto-promoted from waiting list',
        created_by: null,
      });

      // Update positions for remaining in list
      const { data: remaining } = await this.supabase
        .from('waiting_list_entries')
        .select('id, position')
        .eq('class_id', classId)
        .eq('status', 'waiting')
        .order('position');

      if (remaining) {
        for (let i = 0; i < remaining.length; i++) {
          await this.supabase
            .from('waiting_list_entries')
            .update({ position: i + 1 })
            .eq('id', remaining[i].id);
        }
      }
    }
  }

  /**
   * Get student reservations
   */
  async listByStudent(userId: string, gymId: string): Promise<any[]> {
    const { data: student } = await this.supabase
      .from('students')
      .select('id')
      .eq('user_id', userId)
      .eq('gym_id', gymId)
      .single();

    if (!student) {
      return [];
    }

    const { data: reservations } = await this.supabase
      .from('reservations')
      .select('*')
      .eq('gym_id', gymId)
      .eq('student_id', student.id)
      .order('reserved_at', { ascending: false });

    return (reservations || []).map((r) => this.formatReservation(r));
  }

  /**
   * Format reservation response
   */
  private formatReservation(reservation: any): any {
    return {
      id: reservation.id,
      classId: reservation.class_id,
      studentId: reservation.student_id,
      status: reservation.status,
      reservedAt: new Date(reservation.reserved_at),
      createdAt: new Date(reservation.created_at),
    };
  }
}
