import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

interface CreateClassSeriesInput {
  locationId: string;
  disciplineId: string;
  coachId: string;
  title: string;
  description?: string;
  capacity: number;
  timeStart: string; // HH:mm
  timeEnd: string; // HH:mm
  recurrencePattern: 'once' | 'weekly' | 'custom';
  recurrenceConfig?: {
    days?: number[]; // 0=Sunday, 1=Monday, etc
    until?: string; // YYYY-MM-DD
  };
  startDate: string; // YYYY-MM-DD
}

interface UpdateClassInput {
  title?: string;
  description?: string;
  capacity?: number;
  coachId?: string;
  status?: string;
}

@Injectable()
export class ClassesService {
  private supabase = createClient(
    this.configService.getOrThrow('NEXT_PUBLIC_SUPABASE_URL'),
    this.configService.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
  );

  constructor(private configService: ConfigService) {}

  /**
   * Create class series (admin/coach)
   */
  async createSeries(userId: string, gymId: string, input: CreateClassSeriesInput): Promise<any> {
    // Verify access
    await this.verifyCoachAccess(userId, gymId);

    // Validate
    if (input.capacity < 1) {
      throw new BadRequestException('Capacity must be at least 1');
    }

    // Create series
    const { data: series, error } = await this.supabase
      .from('class_series')
      .insert({
        gym_id: gymId,
        location_id: input.locationId,
        discipline_id: input.disciplineId,
        coach_id: input.coachId,
        title: input.title,
        description: input.description,
        capacity: input.capacity,
        time_start: input.timeStart,
        time_end: input.timeEnd,
        recurrence_pattern: input.recurrencePattern,
        recurrence_config: input.recurrenceConfig || {},
        status: 'active',
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to create class series');
    }

    // Generate individual classes
    await this.generateClasses(gymId, series, input.startDate);

    return this.formatSeries(series);
  }

  /**
   * Get class by ID
   */
  async getById(gymId: string, classId: string): Promise<any> {
    const { data: classData, error } = await this.supabase
      .from('classes')
      .select('*')
      .eq('gym_id', gymId)
      .eq('id', classId)
      .single();

    if (error || !classData) {
      throw new NotFoundException('Class not found');
    }

    return this.formatClass(classData);
  }

  /**
   * List classes for date range
   */
  async listByDateRange(
    gymId: string,
    fromDate: string,
    toDate: string,
    disciplineId?: string,
  ): Promise<any[]> {
    let query = this.supabase
      .from('classes')
      .select('*')
      .eq('gym_id', gymId)
      .eq('status', 'scheduled')
      .gte('scheduled_date', fromDate)
      .lte('scheduled_date', toDate);

    if (disciplineId) {
      query = query.eq('discipline_id', disciplineId);
    }

    const { data: classes, error } = await query.order('scheduled_date').order('time_start');

    if (error) {
      return [];
    }

    return classes.map((c) => this.formatClass(c));
  }

  /**
   * Cancel class (returns classes to students)
   */
  async cancel(userId: string, gymId: string, classId: string, reason: string): Promise<void> {
    // Verify admin
    await this.verifyAdminAccess(userId, gymId);

    // Get class
    const { data: classData } = await this.supabase
      .from('classes')
      .select('*')
      .eq('gym_id', gymId)
      .eq('id', classId)
      .single();

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    // Cancel class
    await this.supabase
      .from('classes')
      .update({
        status: 'cancelled',
        cancelled_at: new Date(),
        cancelled_by: userId,
        cancellation_reason: reason,
      })
      .eq('id', classId);

    // Get all reservations
    const { data: reservations } = await this.supabase
      .from('reservations')
      .select('*')
      .eq('class_id', classId)
      .eq('status', 'confirmed');

    if (reservations && reservations.length > 0) {
      // Return classes to memberships
      for (const reservation of reservations) {
        // Insert ledger entry (refund)
        await this.supabase.from('class_consumption_ledger').insert({
          gym_id: gymId,
          membership_id: reservation.membership_id,
          transaction_type: 'refund',
          quantity: 1,
          related_entity_type: 'cancellation',
          related_entity_id: classId,
          description: `Class cancelled: ${reason}`,
          created_by: userId,
        });

        // Cancel reservation
        await this.supabase
          .from('reservations')
          .update({ status: 'cancelled' })
          .eq('id', reservation.id);
      }
    }
  }

  /**
   * Generate individual classes from series
   */
  private async generateClasses(
    gymId: string,
    series: any,
    startDate: string,
  ): Promise<void> {
    const pattern = series.recurrence_pattern;
    const config = series.recurrence_config || {};
    const dates: string[] = [];

    const currentDate = new Date(startDate);
    const until = config.until ? new Date(config.until) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    while (currentDate <= until) {
      if (pattern === 'once') {
        dates.push(currentDate.toISOString().split('T')[0]);
        break;
      } else if (pattern === 'weekly' && config.days) {
        if (config.days.includes(currentDate.getDay())) {
          dates.push(currentDate.toISOString().split('T')[0]);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Insert classes
    for (const date of dates) {
      await this.supabase.from('classes').insert({
        gym_id: gymId,
        series_id: series.id,
        location_id: series.location_id,
        discipline_id: series.discipline_id,
        scheduled_date: date,
        time_start: series.time_start,
        time_end: series.time_end,
        capacity: series.capacity,
        coaches: [series.coach_id],
        status: 'scheduled',
        created_by: series.created_by,
      });
    }
  }

  /**
   * Verify coach access
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
      throw new ForbiddenException('Coach access required');
    }
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
   * Format class response
   */
  private formatClass(classData: any): any {
    return {
      id: classData.id,
      gymId: classData.gym_id,
      seriesId: classData.series_id,
      locationId: classData.location_id,
      disciplineId: classData.discipline_id,
      scheduledDate: classData.scheduled_date,
      timeStart: classData.time_start,
      timeEnd: classData.time_end,
      capacity: classData.capacity,
      coaches: classData.coaches,
      status: classData.status,
      createdAt: new Date(classData.created_at),
    };
  }

  /**
   * Format series response
   */
  private formatSeries(series: any): any {
    return {
      id: series.id,
      gymId: series.gym_id,
      title: series.title,
      recurrencePattern: series.recurrence_pattern,
      capacity: series.capacity,
      status: series.status,
      createdAt: new Date(series.created_at),
    };
  }
}
