import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

/**
 * Multi-Tenancy Middleware
 * Validates that user has access to requested gym_id
 * Extracts gym_id from URL params or query params
 */
@Injectable()
export class GymTenantMiddleware implements NestMiddleware {
  private supabase = createClient(
    this.configService.getOrThrow('NEXT_PUBLIC_SUPABASE_URL'),
    this.configService.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
  );

  constructor(private configService: ConfigService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Skip middleware for public endpoints (auth, health)
    const publicPaths = ['/auth/login', '/auth/register', '/health'];
    if (publicPaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    // Skip if no user (will be caught by JwtAuthGuard)
    if (!req.user?.sub) {
      return next();
    }

    // Extract gym_id from URL params (e.g., /gyms/:id)
    const gymIdFromUrl = req.params.id;
    // Extract gym_id from query params (e.g., ?gym_id=xyz)
    const gymIdFromQuery = req.query.gym_id as string;
    // Extract from body (for POST/PUT requests)
    const gymIdFromBody = (req.body as any)?.gym_id;

    const gymId = gymIdFromUrl || gymIdFromQuery || gymIdFromBody;

    // If gym_id is specified, validate access
    if (gymId) {
      const hasAccess = await this.validateGymAccess(req.user.sub, gymId);

      if (!hasAccess) {
        throw new ForbiddenException('No access to this gym');
      }

      // Attach gym_id to request for later use
      (req as any).gymId = gymId;
    }

    next();
  }

  /**
   * Validate user has access to gym
   */
  private async validateGymAccess(userId: string, gymId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('gym_access')
      .select('id')
      .eq('user_id', userId)
      .eq('gym_id', gymId)
      .eq('status', 'active')
      .single();

    return !error && !!data;
  }
}
