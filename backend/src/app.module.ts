import { PaymentsModule } from './payments/payments.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { ProductsModule } from './products/products.module.js';
import { RecipesModule } from './recipes/recipes.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { AdminAuthModule } from './admin-auth/admin-auth.module.js';
import { AdminOverviewModule } from './admin-overview/admin-overview.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    PaymentsModule,
    OrdersModule,
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'drinkeaze-backend',
    }),
    PrismaModule,
    HealthModule,
    CategoriesModule,
    ProductsModule,
    InventoryModule,
    AdminAuthModule,
    AdminOverviewModule,
    RecipesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
