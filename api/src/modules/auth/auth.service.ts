import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import type { AuthLoginRequest, AuthRegisterRequest, AuthLoginResponse } from '@gym-saas/types';

@Injectable()
export class AuthService {
  private supabase = createClient(
    this.configService.getOrThrow('NEXT_PUBLIC_SUPABASE_URL'),
    this.configService.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
  );

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Register new user
   */
  async register(input: AuthRegisterRequest): Promise<AuthLoginResponse> {
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      throw new BadRequestException('Failed to create user');
    }

    // 2. Create user profile in database
    const { data: userData, error: userError } = await this.supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
      })
      .select()
      .single();

    if (userError) {
      // Rollback: delete auth user
      await this.supabase.auth.admin.deleteUser(authData.user.id);
      throw new BadRequestException('Failed to create user profile');
    }

    // 3. Generate tokens
    const accessToken = this.jwtService.sign(
      { sub: userData.id, email: userData.email },
      { expiresIn: this.configService.getOrThrow('JWT_EXPIRATION') },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userData.id, type: 'refresh' },
      { expiresIn: this.configService.getOrThrow('REFRESH_TOKEN_EXPIRATION') },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        createdAt: new Date(userData.created_at),
        updatedAt: new Date(userData.updated_at),
      },
    };
  }

  /**
   * Login with email + password
   */
  async login(input: AuthLoginRequest): Promise<AuthLoginResponse> {
    // 1. Verify with Supabase Auth
    const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (authError || !authData.user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Get user profile
    const { data: userData, error: userError } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      throw new UnauthorizedException('User not found');
    }

    // 3. Generate tokens
    const accessToken = this.jwtService.sign(
      { sub: userData.id, email: userData.email },
      { expiresIn: this.configService.getOrThrow('JWT_EXPIRATION') },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userData.id, type: 'refresh' },
      { expiresIn: this.configService.getOrThrow('REFRESH_TOKEN_EXPIRATION') },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        createdAt: new Date(userData.created_at),
        updatedAt: new Date(userData.updated_at),
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(token: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(token);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const accessToken = this.jwtService.sign(
        { sub: payload.sub, email: payload.email },
        { expiresIn: this.configService.getOrThrow('JWT_EXPIRATION') },
      );

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): any {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Get current user from token
   */
  async getCurrentUser(userId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*, gym_access(gym_id, role, status)')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new UnauthorizedException('User not found');
    }

    return data;
  }
}
