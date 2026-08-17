import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

interface CheckInInput {
  reservationId: string;
  qrCode: string;
  manualOverride?: boolean;
}

interface MarkAttendanceInput {
  reservationId: string;
  status: 'attended' | 'no_show';
  notes?: string;
}

@Injectable()
export class AttendanceService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  constructor() {}

  /**
   * Generate QR code for class
   * QR contains: classId + timestamp + HMAC signature
   */
  async generateQrForClass(classId: string, secret: string): Promise<string> {
    const timestamp = Date.now();
    const data = `class:${classId}:${timestamp}`;

    // Create HMAC signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(data);
    const signature = hmac.digest('hex');

    const qrData = `${data}:${signature}`;

    // Generate QR code as data URL
    const qrCode = await QRCode.toDataURL(qrData);

    return qrCode;
  }

  /**
   * Verify QR code signature
   */
  private verifyQrSignature(qrData: string, secret: string): boolean {
    const parts = qrData.split(':');
    if (parts.length !== 4) return false;

    const [type, classId, timestamp, providedSignature] = parts;

    // Verify format
    if (type !== 'class') return false;

    // Verify timestamp (must be within 15 minutes)
    const qrTime = parseInt(timestamp);
    const now = Date.now();
    if (now - qrTime > 15 * 60 * 1000) return false;

    // Verify signature
    const data = `${type}:${classId}:${timestamp}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(data);
    const expectedSignature = hmac.digest('hex');

    return providedSignature === expectedSignature;
  }

  /**
   * Check in student using QR code
   */
  async checkIn(userId: string, gymId: string, input: CheckInInput): Promise<any> {
    // 1. Get reservation
    const { data: reservation, error: resError } = await this.supabase
      .from('reservations')
      .select('*, classes(*, disciplines(*))')
      .eq('id', input.reservationId)
      .eq('gym_id', gymId)
      .single();

    if (resError || !reservation) {
      throw new NotFoundException('Reservation not found');
    }

    // 2. Verify reservation belongs to student
    const { data: student } = await this.supabase
      .from('students')
      .select('*')
      .eq('user_id', userId)
      .eq('gym_id', gymId)
      .single();

    if (!student || reservation.student_id !== student.id) {
      throw new BadRequestException('Not your reservation');
    }

    // 3. Verify QR code (if not manual override)
    if (!input.manualOverride) {
      const classSecret = process.env.QR_SECRET || 'fallback-secret';
      if (!this.verifyQrSignature(input.qrCode, classSecret)) {
        throw new BadRequestException('Invalid or expired QR code');
      }
    }

    // 4. Check if already checked in
    const { data: existing } = await this.supabase
      .from('attendance')
      .select('*')
      .eq('reservation_id', input.reservationId)
      .single();

    if (existing) {
      throw new ConflictException('Already checked in');
    }

    // 5. Create attendance record
    const { data: attendance, error: attError } = await this.supabase
      .from('attendance')
      .insert({
        gym_id: gymId,
        class_id: reservation.class_id,
        reservation_id: input.reservationId,
        student_id: reservation.student_id,
        status: 'attended',
        checked_in_at: new Date(),
        check_in_method: input.manualOverride ? 'manual' : 'qr',
        created_by: userId,
      })
      .select()
      .single();

    if (attError) {
      throw new BadRequestException('Failed to record attendance');
    }

    // 6. Update reservation status
    await this.supabase
      .from('reservations')
      .update({
        status: 'attended',
        updated_at: new Date(),
      })
      .eq('id', input.reservationId);

    return this.formatAttendance(attendance);
  }

  /**
   * Manual attendance mark (admin/coach only)
   */
  async markAttendance(
    userId: string,
    gymId: string,
    input: MarkAttendanceInput,
  ): Promise<any> {
    // Verify admin/coach access
    await this.verifyCoachAccess(userId, gymId);

    // 1. Get reservation
    const { data: reservation } = await this.supabase
      .from('reservations')
      .select('*')
      .eq('id', input.reservationId)
      .eq('gym_id', gymId)
      .single();

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    // 2. Check if attendance already exists
    const { data: existing } = await this.supabase
      .from('attendance')
      .select('*')
      .eq('reservation_id', input.reservationId)
      .single();

    let attendance;

    if (existing) {
      // Update existing record
      const { data: updated, error: updError } = await this.supabase
        .from('attendance')
        .update({
          status: input.status,
          notes: input.notes,
          manual_override: true,
          override_reason: `Manually marked as ${input.status} by coach/admin`,
          updated_at: new Date(),
          updated_by: userId,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updError) throw new BadRequestException('Failed to update attendance');
      attendance = updated;
    } else {
      // Create new record
      const { data: created, error: createError } = await this.supabase
        .from('attendance')
        .insert({
          gym_id: gymId,
          class_id: reservation.class_id,
          reservation_id: input.reservationId,
          student_id: reservation.student_id,
          status: input.status,
          notes: input.notes,
          manual_override: true,
          override_reason: `Manually marked as ${input.status} by coach/admin`,
          check_in_method: 'manual',
          created_by: userId,
        })
        .select()
        .single();

      if (createError) throw new BadRequestException('Failed to create attendance');
      attendance = created;
    }

    // 3. Update reservation status
    await this.supabase
      .from('reservations')
      .update({
        status: input.status === 'attended' ? 'attended' : 'no_show',
        updated_at: new Date(),
      })
      .eq('id', input.reservationId);

    // 4. If no-show, log to audit
    if (input.status === 'no_show') {
      await this.logNoShow(reservation, userId);
    }

    return this.formatAttendance(attendance);
  }

  /**
   * Auto-mark no-shows (cron job)
   * Runs after class end time
   */
  async autoMarkNoShows(classId: string): Promise<number> {
    // 1. Get class
    const { data: classData } = await this.supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (!classData) return 0;

    // 2. Get all confirmed reservations without attendance
    const { data: reservations } = await this.supabase
      .from('reservations')
      .select('*')
      .eq('class_id', classId)
      .eq('status', 'confirmed')
      .is('attendance_id', null);

    if (!reservations || reservations.length === 0) return 0;

    // 3. Mark each as no-show
    const noShowIds = [];
    for (const reservation of reservations) {
      const { data: attendance } = await this.supabase
        .from('attendance')
        .insert({
          gym_id: reservation.gym_id,
          class_id: classId,
          reservation_id: reservation.id,
          student_id: reservation.student_id,
          status: 'no_show',
          check_in_method: 'auto_no_show',
          created_by: null,
        })
        .select()
        .single();

      if (attendance) {
        noShowIds.push(reservation.id);
      }
    }

    // 4. Update reservations
    if (noShowIds.length > 0) {
      await this.supabase
        .from('reservations')
        .update({ status: 'no_show' })
        .in('id', noShowIds);
    }

    return noShowIds.length;
  }

  /**
   * Get attendance for class
   */
  async getClassAttendance(gymId: string, classId: string): Promise<any[]> {
    const { data: attendance } = await this.supabase
      .from('attendance')
      .select('*')
      .eq('gym_id', gymId)
      .eq('class_id', classId)
      .order('checked_in_at', { ascending: false });

    return attendance?.map((a) => this.formatAttendance(a)) || [];
  }

  /**
   * Get student attendance history
   */
  async getStudentAttendance(gymId: string, studentId: string, limit = 20): Promise<any[]> {
    const { data: attendance } = await this.supabase
      .from('attendance')
      .select('*, classes(*)')
      .eq('gym_id', gymId)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return attendance?.map((a) => this.formatAttendance(a)) || [];
  }

  /**
   * Get attendance stats for gym
   */
  async getAttendanceStats(gymId: string, startDate: Date, endDate: Date): Promise<any> {
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    // Total classes
    const { data: totalClasses } = await this.supabase
      .from('classes')
      .select('id')
      .eq('gym_id', gymId)
      .gte('starts_at', startIso)
      .lte('starts_at', endIso);

    // Total attended
    const { data: attended } = await this.supabase
      .from('attendance')
      .select('id')
      .eq('gym_id', gymId)
      .eq('status', 'attended')
      .gte('created_at', startIso)
      .lte('created_at', endIso);

    // Total no-show
    const { data: noShow } = await this.supabase
      .from('attendance')
      .select('id')
      .eq('gym_id', gymId)
      .eq('status', 'no_show')
      .gte('created_at', startIso)
      .lte('created_at', endIso);

    const totalAttendance = (attended?.length || 0) + (noShow?.length || 0);
    const attendanceRate = totalAttendance > 0 ? ((attended?.length || 0) / totalAttendance) * 100 : 0;

    return {
      totalClasses: totalClasses?.length || 0,
      totalAttendance,
      attended: attended?.length || 0,
      noShow: noShow?.length || 0,
      attendanceRate: parseFloat(attendanceRate.toFixed(2)),
    };
  }

  /**
   * Verify coach/admin access
   */
  private async verifyCoachAccess(userId: string, gymId: string): Promise<void> {
    const { data: access } = await this.supabase
      .from('gym_access')
      .select('*')
      .eq('user_id', userId)
      .eq('gym_id', gymId)
      .in('role', ['coach', 'admin'])
      .single();

    if (!access) {
      throw new BadRequestException('Insufficient permissions');
    }
  }

  /**
   * Log no-show to audit
   */
  private async logNoShow(reservation: any, userId: string): Promise<void> {
    await this.supabase.from('audit_logs').insert({
      gym_id: reservation.gym_id,
      entity_type: 'reservation',
      entity_id: reservation.id,
      action: 'no_show_auto_marked',
      details: {
        student_id: reservation.student_id,
        class_id: reservation.class_id,
      },
      created_by: userId,
    });
  }

  /**
   * Format attendance response
   */
  private formatAttendance(attendance: any): any {
    return {
      id: attendance.id,
      reservationId: attendance.reservation_id,
      classId: attendance.class_id,
      studentId: attendance.student_id,
      status: attendance.status,
      checkInMethod: attendance.check_in_method,
      checkedInAt: attendance.checked_in_at ? new Date(attendance.checked_in_at) : null,
      notes: attendance.notes,
      manualOverride: attendance.manual_override,
      overrideReason: attendance.override_reason,
      createdAt: new Date(attendance.created_at),
    };
  }
}
