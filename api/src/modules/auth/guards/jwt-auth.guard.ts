import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private logger = new Logger(JwtAuthGuard.name);

  handleRequest(err: any, user: any, info: any, context: any): any {
    if (err || !user) {
      this.logger.warn('JWT authentication failed', {
        error: err?.message,
        info: info?.message,
      });
      throw err || new UnauthorizedException('Invalid token');
    }
    return user;
  }
}
