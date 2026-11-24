import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Safepay from '@sfpy/node-core';
import {
  InitiateGatewayPaymentInput,
  InitiateGatewayPaymentResult,
  PaymentGateway,
  PaymentGatewayVerification,
} from './payment-gateway.interface.js';

@Injectable()
export class SafepayAdapter implements PaymentGateway {
  readonly provider = 'SAFEPAY';

  private client(): any {
    const secret = process.env.SAFEPAY_SECRET_KEY;
    const environment = process.env.SAFEPAY_ENV ?? 'sandbox';

    if (!secret) {
      throw new InternalServerErrorException(
        'Safepay is not configured. SAFEPAY_SECRET_KEY is missing.',
      );
    }

    const hosts: Record<string, string> = {
      development: 'https://dev.api.getsafepay.com',
      sandbox: 'https://sandbox.api.getsafepay.com',
      production: 'https://api.getsafepay.com',
    };

    const host = hosts[environment];

    if (!host) {
      throw new InternalServerErrorException('Invalid SAFEPAY_ENV.');
    }

    return new (Safepay as any)(secret, {
      authType: 'secret',
      host,
      timeout: 30000,
    });
  }

  private readPath(value: any, paths: string[]): string | undefined {
    for (const path of paths) {
      const result = path.split('.').reduce((current, key) => current?.[key], value);
      if (typeof result === 'string' && result.length > 0) return result;
    }
    return undefined;
  }

  async initiate(
    input: InitiateGatewayPaymentInput,
  ): Promise<InitiateGatewayPaymentResult> {
    const apiKey = process.env.SAFEPAY_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException(
        'Safepay is not configured. SAFEPAY_API_KEY is missing.',
      );
    }

    const client = this.client();
    const payload = {
      amount: input.amount,
      intent: 'CYBERSOURCE',
      mode: 'payment',
      currency: input.currency,
      merchant_api_key: apiKey,
      order_id: input.orderId,
      source: 'hosted',
    };

    const passport = await client.client.passport.create(payload);
    const transaction = await client.payments.session.setup(payload);

    const tbt = this.readPath(passport, [
      'data.token',
      'data.tbt',
      'data',
      'token',
      'tbt',
    ]);

    const tracker = this.readPath(transaction, [
      'data.tracker.token',
      'data.tracker',
      'tracker.token',
      'tracker',
    ]);

    if (!tbt || !tracker) {
      throw new InternalServerErrorException(
        'Safepay returned an unexpected checkout response. No payment was marked successful.',
      );
    }

    const environment = process.env.SAFEPAY_ENV ?? 'sandbox';
    const redirectUrl = process.env.SAFEPAY_REDIRECT_URL;
    const cancelUrl = process.env.SAFEPAY_CANCEL_URL;

    const checkoutUrl = client.checkout.createCheckoutUrl({
      env: environment,
      tbt,
      tracker,
      source: 'hosted',
      order_id: input.orderId,
      ...(redirectUrl ? { redirect_url: redirectUrl } : {}),
      ...(cancelUrl ? { cancel_url: cancelUrl } : {}),
    });

    return { tracker, checkoutUrl };
  }

  async fetchPayment(tracker: string): Promise<unknown> {
    const client = this.client();
    return client.reporter.payments.fetch(tracker);
  }

  terminalFailureReason(response: unknown): string | null {
    const reporter = response as any;
    if (
      reporter?.data?.state?.toUpperCase?.() !== 'TRACKER_ENDED' ||
      !Array.isArray(reporter?.data?.attempts)
    ) {
      return null;
    }

    const hasSuccessfulCapture = reporter.data.attempts.some(
      (attempt: any) => attempt?.is_success === true,
    );
    return hasSuccessfulCapture
      ? null
      : 'Safepay transaction ended without a successful payment capture.';
  }

  verify(
    response: unknown,
    expectedAmount: number,
    expectedCurrency: string,
  ): PaymentGatewayVerification {
    const reporter = response as any;
    const state = reporter?.data?.state;
    if (typeof state !== 'string' || state.toUpperCase() !== 'TRACKER_ENDED') {
      return { verified: false, reason: 'Safepay transaction has not ended successfully.' };
    }

    const attempts = reporter?.data?.attempts;
    if (!Array.isArray(attempts)) {
      return { verified: false, reason: 'Safepay reporter response does not contain payment attempts.' };
    }

    const successfulAttempt = [...attempts].reverse().find((attempt: any) =>
      attempt?.is_success === true && attempt?.capture?.totals,
    );
    if (!successfulAttempt) {
      return { verified: false, reason: 'No successfully captured Safepay payment attempt was found.' };
    }

    const capturedAmount = Number(successfulAttempt.capture.totals.amount);
    const capturedCurrency = successfulAttempt.capture.totals.currency;
    if (!Number.isFinite(capturedAmount) || capturedAmount !== expectedAmount) {
      return { verified: false, reason: 'Safepay captured amount does not match the order.' };
    }
    if (
      typeof capturedCurrency !== 'string' ||
      capturedCurrency.toUpperCase() !== expectedCurrency.toUpperCase()
    ) {
      return { verified: false, reason: 'Safepay captured currency does not match the order.' };
    }
    return { verified: true, reason: 'Verified successful capture.' };
  }
}
