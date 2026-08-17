import { Controller, Post, Get, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface CreateReservationRequest {
  classId: string;
  studentId?: string;
}

@Controller('gyms/:gymId/reservations')
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Req() req: any,
    @Param('gymId') gymId: string,
    @Body() input: CreateReservationRequest,
  ): Promise<any> {
    const studentId = input.studentId || req.user.sub;
    return this.reservationsService.create(req.user.sub, gymId, {
      classId: input.classId,
      studentId,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async listMyReservations(@Req() req: any, @Param('gymId') gymId: string): Promise<any[]> {
    return this.reservationsService.listByStudent(req.user.sub, gymId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async cancel(
    @Req() req: any,
    @Param('gymId') gymId: string,
    @Param('id') reservationId: string,
  ): Promise<{ message: string }> {
    await this.reservationsService.cancel(req.user.sub, gymId, reservationId);
    return { message: 'Reservation cancelled' };
  }
}
