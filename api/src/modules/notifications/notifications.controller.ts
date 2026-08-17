import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RegisterTokenRequest {
  token: string;
  gymId: string;
}

interface SendNotificationRequest {
  title: string;
  body: string;
  data?: Record<string, string>;
  userIds?: string[];
  gymId: string;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post('token/register')
  @UseGuards(JwtAuthGuard)
  async registerToken(
    @Req() req: any,
    @Body() input: RegisterTokenRequest,
  ): Promise<{ message: string }> {
    await this.notificationsService.registerToken(
      req.user.sub,
      input.gymId,
      input.token,
    );
    return { message: 'Token registered' };
  }

  @Post('token/unregister')
  @UseGuards(JwtAuthGuard)
  async unregisterToken(
    @Body() input: { token: string },
  ): Promise<{ message: string }> {
    await this.notificationsService.unregisterToken(input.token);
    return { message: 'Token unregistered' };
  }

  @Post('send')
  @UseGuards(JwtAuthGuard)
  async sendNotification(
    @Body() input: SendNotificationRequest,
  ): Promise<{ message: string }> {
    if (input.userIds) {
      await this.notificationsService.sendToUsers(
        input.userIds,
        input.gymId,
        {
          title: input.title,
          body: input.body,
          data: input.data,
        },
      );
    } else {
      await this.notificationsService.sendToGym(input.gymId, {
        title: input.title,
        body: input.body,
        data: input.data,
      });
    }

    return { message: 'Notification sent' };
  }
}
