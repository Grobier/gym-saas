import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { DisciplinesService } from './disciplines.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface CreateDisciplineRequest {
  name: string;
  description?: string;
  durationMinutes: number;
  level?: string;
  color?: string;
}

interface UpdateDisciplineRequest {
  name?: string;
  description?: string;
  durationMinutes?: number;
  level?: string;
  color?: string;
}

@Controller('gyms/:gymId/disciplines')
export class DisciplinesController {
  constructor(private disciplinesService: DisciplinesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Req() req: any,
    @Param('gymId') gymId: string,
    @Body() input: CreateDisciplineRequest,
  ): Promise<any> {
    return this.disciplinesService.create(req.user.sub, gymId, input);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Param('gymId') gymId: string): Promise<any[]> {
    return this.disciplinesService.listByGym(gymId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(
    @Param('gymId') gymId: string,
    @Param('id') disciplineId: string,
  ): Promise<any> {
    return this.disciplinesService.getById(gymId, disciplineId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Req() req: any,
    @Param('gymId') gymId: string,
    @Param('id') disciplineId: string,
    @Body() input: UpdateDisciplineRequest,
  ): Promise<any> {
    return this.disciplinesService.update(req.user.sub, gymId, disciplineId, input);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async archive(
    @Req() req: any,
    @Param('gymId') gymId: string,
    @Param('id') disciplineId: string,
  ): Promise<{ message: string }> {
    await this.disciplinesService.archive(req.user.sub, gymId, disciplineId);
    return { message: 'Discipline archived' };
  }
}
