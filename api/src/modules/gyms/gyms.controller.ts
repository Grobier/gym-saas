import { Controller, Get, Post, Put, Param, Body, UseGuards, Req } from '@nestjs/common';
import { GymsService } from './gyms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Gym } from '@gym-saas/types';

interface CreateGymRequest {
  name: string;
  slug: string;
}

interface UpdateGymRequest {
  name?: string;
  subscriptionPlan?: string;
  status?: string;
}

@Controller('gyms')
export class GymsController {
  constructor(private gymsService: GymsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Req() req: any, @Body() input: CreateGymRequest): Promise<Gym> {
    return this.gymsService.create(req.user.sub, input);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async listUserGyms(@Req() req: any): Promise<Gym[]> {
    return this.gymsService.listUserGyms(req.user.sub);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(@Req() req: any, @Param('id') gymId: string): Promise<Gym> {
    return this.gymsService.getById(req.user.sub, gymId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Req() req: any,
    @Param('id') gymId: string,
    @Body() input: UpdateGymRequest,
  ): Promise<Gym> {
    return this.gymsService.update(req.user.sub, gymId, input);
  }
}
