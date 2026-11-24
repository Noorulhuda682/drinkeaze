import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Body, Controller, Headers, Param, Post, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { InitiatePaymentDto } from './dto/initiate-payment.dto.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('orders/:orderNumber/initiate')
  initiate(
    @Param('orderNumber') orderNumber: string,
    @Headers('x-order-tracking-token') trackingToken: string | undefined,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiate(orderNumber, trackingToken, dto);
  }

  @Post('orders/:orderNumber/verify')
  verifyPayment(
    @Param('orderNumber') orderNumber: string,
    @Headers('x-order-tracking-token') trackingToken: string | undefined,
  ) {
    return this.paymentsService.reconcileSafepayPayment(
      orderNumber,
      trackingToken,
    );
  }

  @Post('webhooks/safepay')
  safepayWebhook(
    @Body() payload: any,
    @Headers('x-sfpy-signature') signature: string | undefined,
    @Req() request: RawBodyRequest<Request>,
  ) {
    return this.paymentsService.handleSafepayWebhook(
      payload,
      signature,
      request.rawBody,
    );
  }
}
