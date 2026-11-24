export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface InitiateGatewayPaymentInput {
  amount: number;
  currency: string;
  orderId: string;
  method: string;
  idempotencyKey: string;
}

export interface InitiateGatewayPaymentResult {
  tracker: string;
  checkoutUrl: string;
  expiresAt?: Date;
}

export interface PaymentGatewayVerification {
  verified: boolean;
  reason: string;
}

export interface PaymentGateway {
  readonly provider: string;
  initiate(input: InitiateGatewayPaymentInput): Promise<InitiateGatewayPaymentResult>;
  fetchPayment(tracker: string): Promise<unknown>;
  verify(
    response: unknown,
    expectedAmount: number,
    expectedCurrency: string,
  ): PaymentGatewayVerification;
  terminalFailureReason(response: unknown): string | null;
}
