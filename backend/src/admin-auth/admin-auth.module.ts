import { Global } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AdminAuthController } from './admin-auth.controller.js';
import { AdminAuthService } from './admin-auth.service.js';
import { AdminJwtGuard } from './admin-jwt.guard.js';
import { AdminRolesGuard } from './admin-roles.guard.js';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminJwtGuard, AdminRolesGuard],
  exports: [AdminAuthService, AdminJwtGuard, AdminRolesGuard],
})
export class AdminAuthModule {}
