import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

interface CreateDisciplineInput {
  name: string;
  description?: string;
  durationMinutes: number;
  level?: string;
  color?: string;
}

interface UpdateDisciplineInput {
  name?: string;
  description?: string;
  durationMinutes?: number;
  level?: string;
  color?: string;
}

@Injectable()
export class DisciplinesService {
  private supabase = createClient(
    this.configService.getOrThrow('NEXT_PUBLIC_SUPABASE_URL'),
    this.configService.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
  );

  constructor(private configService: ConfigService) {}

  /**
   * Create discipline (admin only)
   */
  async create(userId: string, gymId: string, input: CreateDisciplineInput): Promise<any> {
    // Verify admin access
    await this.verifyAdminAccess(userId, gymId);

    // Validate input
    if (!input.name || input.name.length < 2) {
      throw new BadRequestException('Discipline name required (min 2 chars)');
    }

    if (!input.durationMinutes || input.durationMinutes < 5) {
      throw new BadRequestException('Duration must be at least 5 minutes');
    }

    // Create discipline
    const { data: discipline, error } = await this.supabase
      .from('disciplines')
      .insert({
        gym_id: gymId,
        name: input.name,
        description: input.description,
        duration_minutes: input.durationMinutes,
        level: input.level || 'beginner',
        color: input.color || '#000000',
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to create discipline');
    }

    return this.formatDiscipline(discipline);
  }

  /**
   * Get discipline by ID
   */
  async getById(gymId: string, disciplineId: string): Promise<any> {
    const { data: discipline, error } = await this.supabase
      .from('disciplines')
      .select('*')
      .eq('gym_id', gymId)
      .eq('id', disciplineId)
      .is('archived_at', null)
      .single();

    if (error || !discipline) {
      throw new NotFoundException('Discipline not found');
    }

    return this.formatDiscipline(discipline);
  }

  /**
   * List disciplines for gym
   */
  async listByGym(gymId: string): Promise<any[]> {
    const { data: disciplines, error } = await this.supabase
      .from('disciplines')
      .select('*')
      .eq('gym_id', gymId)
      .is('archived_at', null)
      .order('name');

    if (error) {
      return [];
    }

    return disciplines.map((d) => this.formatDiscipline(d));
  }

  /**
   * Update discipline (admin only)
   */
  async update(
    userId: string,
    gymId: string,
    disciplineId: string,
    input: UpdateDisciplineInput,
  ): Promise<any> {
    // Verify admin access
    await this.verifyAdminAccess(userId, gymId);

    // Get discipline
    const { data: discipline } = await this.supabase
      .from('disciplines')
      .select('*')
      .eq('gym_id', gymId)
      .eq('id', disciplineId)
      .single();

    if (!discipline) {
      throw new NotFoundException('Discipline not found');
    }

    // Update
    const { data: updated, error } = await this.supabase
      .from('disciplines')
      .update({
        ...input,
        updated_by: userId,
        updated_at: new Date(),
      })
      .eq('id', disciplineId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to update discipline');
    }

    return this.formatDiscipline(updated);
  }

  /**
   * Archive discipline (soft delete)
   */
  async archive(userId: string, gymId: string, disciplineId: string): Promise<void> {
    // Verify admin access
    await this.verifyAdminAccess(userId, gymId);

    const { error } = await this.supabase
      .from('disciplines')
      .update({ archived_at: new Date() })
      .eq('gym_id', gymId)
      .eq('id', disciplineId);

    if (error) {
      throw new BadRequestException('Failed to archive discipline');
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
   * Format discipline response
   */
  private formatDiscipline(discipline: any): any {
    return {
      id: discipline.id,
      gymId: discipline.gym_id,
      name: discipline.name,
      description: discipline.description,
      durationMinutes: discipline.duration_minutes,
      level: discipline.level,
      color: discipline.color,
      createdAt: new Date(discipline.created_at),
      updatedAt: new Date(discipline.updated_at),
    };
  }
}
