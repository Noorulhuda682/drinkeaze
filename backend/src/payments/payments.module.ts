import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { SafepayAdapter } from './safepay.adapter.js';
import { PAYMENT_GATEWAY } from './payment-gateway.interface.js';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    SafepayAdapter,
    { provide: PAYMENT_GATEWAY, useExisting: SafepayAdapter },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
