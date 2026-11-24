import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminJwtGuard, type AdminRequest } from '../admin-auth/admin-jwt.guard.js';
import { UnauthorizedException } from '@nestjs/common';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { CollectCodPaymentDto } from './dto/collect-cod-payment.dto.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrdersService } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ordersService.create(dto, idempotencyKey);
  }

  @Get('number/:orderNumber')
  findByOrderNumber(
    @Param('orderNumber') orderNumber: string,
    @Headers('x-order-tracking-token') trackingToken?: string,
  ) {
    return this.ordersService.findByOrderNumber(orderNumber, trackingToken);
  }

  @Get('admin')
  @UseGuards(AdminJwtGuard)
  listAdminOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.ordersService.listAdminOrders(page, limit, status);
  }

  @Get('admin/:id')
  @UseGuards(AdminJwtGuard)
  getAdminOrder(@Param('id') id: string) {
    return this.ordersService.getAdminOrderById(id);
  }

  @Patch('admin/:id/status')
  @UseGuards(AdminJwtGuard)
  updateAdminOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() request: AdminRequest,
  ) {
    if (!request.admin) {
      throw new UnauthorizedException('Authenticated admin is required.');
    }

    return this.ordersService.updateAdminOrderStatus(
      id,
      dto.status,
      request.admin.id,
      dto.note,
    );
  }

  @Patch('admin/:id/collect-cod')
  @UseGuards(AdminJwtGuard)
  collectCodPayment(
    @Param('id') id: string,
    @Body() dto: CollectCodPaymentDto,
    @Req() request: AdminRequest,
  ) {
    if (!request.admin) {
      throw new UnauthorizedException('Authenticated admin is required.');
    }

    return this.ordersService.collectCodPayment(
      id,
      request.admin.id,
      dto.note,
    );
  }

  @Patch('admin/:id/cancel')
  @UseGuards(AdminJwtGuard)
  cancelAdminOrder(@Param('id') id: string) {
    return this.ordersService.cancelAdminOrder(id);
  }
}
