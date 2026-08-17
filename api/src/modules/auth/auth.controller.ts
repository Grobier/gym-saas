import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthLoginRequest, AuthRegisterRequest, AuthLoginResponse } from '@gym-saas/types';
import { LoginSchema, RegisterSchema } from '@gym-saas/validation';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() input: AuthRegisterRequest): Promise<AuthLoginResponse> {
    // Validate input
    RegisterSchema.parse(input);
    return this.authService.register(input);
  }

  @Post('login')
  async login(@Body() input: AuthLoginRequest): Promise<AuthLoginResponse> {
    // Validate input
    LoginSchema.parse(input);
    return this.authService.login(input);
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string): Promise<{ accessToken: string }> {
    if (!refreshToken) {
      throw new Error('Refresh token required');
    }
    return this.authService.refreshToken(refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Req() req: any): Promise<any> {
    return this.authService.getCurrentUser(req.user.sub);
  }
}
