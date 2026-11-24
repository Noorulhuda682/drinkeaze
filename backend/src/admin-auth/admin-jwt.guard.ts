import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminAuthService, AuthenticatedAdmin } from './admin-auth.service.js';

export type AdminRequest = Request & {
  admin?: AuthenticatedAdmin;
};

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(private readonly authService: AdminAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const authorization = request.headers.authorization;

    if (
      typeof authorization !== 'string' ||
      !authorization.startsWith('Bearer ')
    ) {
      throw new UnauthorizedException('Bearer access token is required.');
    }

    const token = authorization.slice(7).trim();

    if (!token || token.length > 4096) {
      throw new UnauthorizedException('Invalid access token.');
    }

    request.admin = await this.authService.authenticateToken(token);
    return true;
  }
}
