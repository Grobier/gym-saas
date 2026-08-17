import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface CreateClassSeriesRequest {
  locationId: string;
  disciplineId: string;
  coachId: string;
  title: string;
  description?: string;
  capacity: number;
  timeStart: string;
  timeEnd: string;
  recurrencePattern: 'once' | 'weekly' | 'custom';
  recurrenceConfig?: any;
  startDate: string;
}

@Controller('gyms/:gymId/classes')
export class ClassesController {
  constructor(private classesService: ClassesService) {}

  @Post('series')
  @UseGuards(JwtAuthGuard)
  async createSeries(
    @Req() req: any,
    @Param('gymId') gymId: string,
    @Body() input: CreateClassSeriesRequest,
  ): Promise<any> {
    return this.classesService.createSeries(req.user.sub, gymId, input);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @Param('gymId') gymId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('disciplineId') disciplineId?: string,
  ): Promise<any[]> {
    if (!from || !to) {
      throw new Error('from and to dates required');
    }
    return this.classesService.listByDateRange(gymId, from, to, disciplineId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(
    @Param('gymId') gymId: string,
    @Param('id') classId: string,
  ): Promise<any> {
    return this.classesService.getById(gymId, classId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async cancel(
    @Req() req: any,
    @Param('gymId') gymId: string,
    @Param('id') classId: string,
    @Body('reason') reason: string,
  ): Promise<{ message: string }> {
    await this.classesService.cancel(req.user.sub, gymId, classId, reason);
    return { message: 'Class cancelled and students refunded' };
  }
}
