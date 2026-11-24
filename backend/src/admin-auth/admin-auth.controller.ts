import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service.js';
import { AdminJwtGuard, AdminRequest } from './admin-jwt.guard.js';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto.js';
import { AdminLoginDto } from './dto/admin-login.dto.js';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AdminRequest>().admin,
);

@Controller('admin-auth')
export class AdminAuthController {
  constructor(private readonly authService: AdminAuthService) {}

  @Post('bootstrap')
  @HttpCode(HttpStatus.CREATED)
  bootstrap(
    @Body() dto: BootstrapAdminDto,
    @Headers('x-admin-bootstrap-secret') secret?: string,
  ) {
    return this.authService.bootstrap(dto, secret);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: AdminLoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(AdminJwtGuard)
  me(@CurrentAdmin() admin: unknown) {
    return admin;
  }
}
