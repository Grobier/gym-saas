import { Controller, Get, Post, Put, Param, Body, UseGuards, Req } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface CreatePlanRequest {
  name: string;
  description?: string;
  durationDays: number;
  classesPerCycle: number | null;
  price: number;
  maxDisciplines?: number;
  allowedDisciplines?: string[];
  isRecurring?: boolean;
}

interface CreateMembershipRequest {
  studentId: string;
  planId: string;
  startsAt: string;
}

interface ExtendMembershipRequest {
  extensionDays?: number;
}

interface GiftClassesRequest {
  quantity: number;
  reason: string;
}

@Controller('gyms/:gymId/memberships')
export class MembershipsController {
  constructor(private membershipsService: MembershipsService) {}

  @Post('plans')
  @UseGuards(JwtAuthGuard)
  async createPlan(
    @Req() req: any,
    @Param('gymId') gymId: string,
    @Body() input: CreatePlanRequest,
  ): Promise<any> {
    return this.membershipsService.createPlan(req.user.sub, gymId, input);
  }

  @Get('plans')
  @UseGuards(JwtAuthGuard)
  async listPlans(@Param('gymId') gymId: string): Promise<any[]> {
    return this.membershipsService.listPlans(gymId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createMembership(
    @Req() req: any,
    @Param('gymId') gymId: string,
    @Body() input: CreateMembershipRequest,
  ): Promise<any> {
    return this.membershipsService.createMembership(req.user.sub, gymId, input);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(
    @Param('gymId') gymId: string,
    @Param('id') membershipId: string,
  ): Promise<any> {
    return this.membershipsService.getById(gymId, membershipId);
  }

  @Put(':id/freeze')
  @UseGuards(JwtAuthGuard)
  async freeze(
    @Req() req: any,
    @Param('gymId') gymId: string,
    @Param('id') membershipId: string,
  ): Promise<any> {
    return this.membershipsService.freeze(req.user.sub, gymId, membershipId);
  }

  @Put(':id/extend')
  @UseGuards(JwtAuthGuard)
  async extend(
    @Req() req: any,
    @Param('gymId') gymId: string,
    @Param('id') membershipId: string,
    @Body() input: ExtendMembershipRequest,
  ): Promise<any> {
    return this.membershipsService.extend(req.user.sub, gymId, membershipId, input);
  }

  @Post(':id/gift-classes')
  @UseGuards(JwtAuthGuard)
  async giftClasses(
    @Req() req: any,
    @Param('gymId') gymId: string,
    @Param('id') membershipId: string,
    @Body() input: GiftClassesRequest,
  ): Promise<{ message: string }> {
    await this.membershipsService.giftClasses(
      req.user.sub,
      gymId,
      membershipId,
      input.quantity,
      input.reason,
    );
    return { message: 'Classes gifted' };
  }
}
