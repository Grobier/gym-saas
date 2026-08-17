import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import type { Gym } from '@gym-saas/types';

interface CreateGymInput {
  name: string;
  slug: string;
}

interface UpdateGymInput {
  name?: string;
  subscriptionPlan?: string;
  status?: string;
}

@Injectable()
export class GymsService {
  private supabase = createClient(
    this.configService.getOrThrow('NEXT_PUBLIC_SUPABASE_URL'),
    this.configService.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
  );

  constructor(private configService: ConfigService) {}

  /**
   * Create new gym (admin only)
   */
  async create(userId: string, input: CreateGymInput): Promise<Gym> {
    // Validate slug
    if (!input.slug.match(/^[a-z0-9-]+$/)) {
      throw new BadRequestException('Invalid slug format');
    }

    // Check slug uniqueness
    const { data: existing } = await this.supabase
      .from('gyms')
      .select('id')
      .eq('slug', input.slug)
      .single();

    if (existing) {
      throw new BadRequestException('Slug already exists');
    }

    // Create gym
    const { data: gym, error } = await this.supabase
      .from('gyms')
      .insert({
        name: input.name,
        slug: input.slug,
        status: 'trial',
        subscription_plan: 'starter',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to create gym');
    }

    // Add creator as admin
    await this.supabase.from('gym_access').insert({
      user_id: userId,
      gym_id: gym.id,
      role: 'admin',
      is_primary: true,
    });

    return this.formatGym(gym);
  }

  /**
   * Get gym by ID (with access check)
   */
  async getById(userId: string, gymId: string): Promise<Gym> {
    // 1. Verify user has access to gym
    const { data: access } = await this.supabase
      .from('gym_access')
      .select('*')
      .eq('user_id', userId)
      .eq('gym_id', gymId)
      .eq('status', 'active')
      .single();

    if (!access) {
      throw new ForbiddenException('No access to this gym');
    }

    // 2. Get gym data
    const { data: gym, error } = await this.supabase
      .from('gyms')
      .select('*')
      .eq('id', gymId)
      .single();

    if (error || !gym) {
      throw new NotFoundException('Gym not found');
    }

    return this.formatGym(gym);
  }

  /**
   * List all gyms for user
   */
  async listUserGyms(userId: string): Promise<Gym[]> {
    const { data: access, error: accessError } = await this.supabase
      .from('gym_access')
      .select('gym_id')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (accessError || !access) {
      return [];
    }

    const gymIds = access.map((a: any) => a.gym_id);
    if (gymIds.length === 0) {
      return [];
    }

    const { data: gyms, error } = await this.supabase
      .from('gyms')
      .select('*')
      .in('id', gymIds)
      .is('archived_at', null);

    if (error || !gyms) {
      return [];
    }

    return gyms.map((g) => this.formatGym(g));
  }

  /**
   * Update gym (admin only)
   */
  async update(userId: string, gymId: string, input: UpdateGymInput): Promise<Gym> {
    // Verify admin access
    await this.verifyAdminAccess(userId, gymId);

    const { data: gym, error } = await this.supabase
      .from('gyms')
      .update({
        ...input,
        updated_by: userId,
        updated_at: new Date(),
      })
      .eq('id', gymId)
      .select()
      .single();

    if (error || !gym) {
      throw new BadRequestException('Failed to update gym');
    }

    return this.formatGym(gym);
  }

  /**
   * Verify user is gym admin
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
   * Format gym response
   */
  private formatGym(gym: any): Gym {
    return {
      id: gym.id,
      name: gym.name,
      slug: gym.slug,
      status: gym.status,
      createdAt: new Date(gym.created_at),
      updatedAt: new Date(gym.updated_at),
    };
  }
}
