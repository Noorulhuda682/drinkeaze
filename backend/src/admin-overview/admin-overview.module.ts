import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';
import { AdminOverviewController } from './admin-overview.controller.js';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminOverviewController],
})
export class AdminOverviewModule {}
