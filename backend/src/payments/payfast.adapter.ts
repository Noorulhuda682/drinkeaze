import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  InitiateGatewayPaymentInput,
  InitiateGatewayPaymentResult,
  PaymentGateway,
  PaymentGatewayVerification,
} from './payment-gateway.interface.js';

@Injectable()
export class PayFastAdapter implements PaymentGateway {
  readonly provider = 'PAYFAST';

  async initiate(_input: InitiateGatewayPaymentInput): Promise<InitiateGatewayPaymentResult> {
    throw new ServiceUnavailableException(
      'PayFast gateway adapter is scaffolded. Configure PAYFAST_MERCHANT_ID, PAYFAST_SECURED_KEY, and PAYFAST_ENV before enabling.',
    );
  }

  async fetchPayment(_tracker: string): Promise<unknown> {
    throw new ServiceUnavailableException('PayFast status verification is not yet enabled.');
  }

  verify(): PaymentGatewayVerification {
    return {
      verified: false,
      reason: 'PayFast verification is not yet enabled.',
    };
  }

  terminalFailureReason(): string | null {
    return null;
  }
}
