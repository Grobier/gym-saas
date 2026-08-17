import { Controller, Get, Post, Put, Param, Body, UseGuards, Req, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface CheckInRequest {
  reservationId: string;
  qrCode: string;
  manualOverride?: boolean;
}

interface MarkAttendanceRequest {
  reservationId: string;
  status: 'attended' | 'no_show';
  notes?: string;
}

@Controller('gyms/:gymId/attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Post('check-in')
  @UseGuards(JwtAuthGuard)
  async checkIn(
    @Req() req: any,
    @Param('gymId') gymId: string,
    @Body() input: CheckInRequest,
  ): Promise<any> {
    return this.attendanceService.checkIn(req.user.sub, gymId, input);
  }

  @Post('mark')
  @UseGuards(JwtAuthGuard)
  async markAttendance(
    @Req() req: any,
    @Param('gymId') gymId: string,
    @Body() input: MarkAttendanceRequest,
  ): Promise<any> {
    return this.attendanceService.markAttendance(req.user.sub, gymId, input);
  }

  @Get('classes/:classId')
  @UseGuards(JwtAuthGuard)
  async getClassAttendance(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
  ): Promise<any[]> {
    return this.attendanceService.getClassAttendance(gymId, classId);
  }

  @Get('students/:studentId')
  @UseGuards(JwtAuthGuard)
  async getStudentAttendance(
    @Param('gymId') gymId: string,
    @Param('studentId') studentId: string,
    @Query('limit') limit = '20',
  ): Promise<any[]> {
    return this.attendanceService.getStudentAttendance(
      gymId,
      studentId,
      parseInt(limit),
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(
    @Param('gymId') gymId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<any> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format');
    }

    return this.attendanceService.getAttendanceStats(gymId, start, end);
  }

  @Post('classes/:classId/qr')
  @UseGuards(JwtAuthGuard)
  async generateQr(
    @Param('classId') classId: string,
  ): Promise<{ qrCode: string }> {
    const secret = process.env.QR_SECRET || 'fallback-secret';
    const qrCode = await this.attendanceService.generateQrForClass(classId, secret);
    return { qrCode };
  }
}
