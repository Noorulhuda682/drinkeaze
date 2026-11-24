import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('payment/success')
  paymentSuccess(
    @Query('order_id') orderId?: string,
    @Query('tracker') tracker?: string,
  ) {
    return {
      success: true,
      message: 'Payment checkout completed. Your payment is being confirmed.',
      orderId: orderId ?? null,
      tracker: tracker ?? null,
    };
  }

  @Get('payment/cancel')
  paymentCancel(@Query('order_id') orderId?: string) {
    return {
      success: false,
      message: 'Payment checkout was cancelled.',
      orderId: orderId ?? null,
    };
  }
}
