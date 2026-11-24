import { createHmac } from 'node:crypto';
import {
  PaymentAttemptStatus,
  PaymentHistorySource,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  WebhookEventStatus,
} from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentsService } from './payments.service.js';

describe('Safepay webhook settlement', () => {
  const secret = 'test-safepay-webhook-secret';
  const payload = { data: { tracker: 'test-tracker', state: 'TRACKER_ENDED' } };
  const rawBody = Buffer.from(JSON.stringify(payload));
  const signature = () => createHmac('sha512', secret).update(rawBody).digest('hex');

  const payment = {
    id: 'payment-1',
    orderId: 'order-1',
    amount: 650,
    currency: 'PKR',
    status: PaymentAttemptStatus.PENDING,
  };

  const order = {
    id: 'order-1',
    total: 650,
    currency: 'PKR',
    status: 'PENDING',
    paymentStatus: PaymentStatus.PENDING,
  };

  const reporter = (amount = 65000, currency = 'PKR') => ({
    data: {
      state: 'TRACKER_ENDED',
      attempts: [{
        is_success: true,
        capture: { totals: { amount, currency } },
      }],
    },
  });

  let service: PaymentsService;
  let prisma: any;
  let safepay: any;
  let tx: any;

  const deliver = () => service.handleSafepayWebhook(payload, signature(), rawBody);

  beforeEach(() => {
    process.env.SAFEPAY_WEBHOOK_SECRET = secret;

    tx = {
      $queryRaw: vi.fn(),
      payment: {
        findUnique: vi.fn().mockResolvedValue(payment),
        update: vi.fn().mockResolvedValue({}),
      },
      order: {
        findUnique: vi.fn().mockResolvedValue(order),
        update: vi.fn().mockResolvedValue({}),
      },
      paymentHistory: { create: vi.fn().mockResolvedValue({}) },
      paymentWebhookEvent: { update: vi.fn().mockResolvedValue({}) },
    };

    safepay = {
      fetchPayment: vi.fn().mockResolvedValue(reporter()),
      terminalFailureReason: vi.fn(() => null),
      verify: vi.fn((response: any, expectedAmount: number, expectedCurrency: string) => {
        const attempt = response?.data?.attempts?.find((entry: any) => entry.is_success);
        const verified =
          response?.data?.state === 'TRACKER_ENDED' &&
          Number(attempt?.capture?.totals?.amount) === expectedAmount &&
          attempt?.capture?.totals?.currency === expectedCurrency;
        return { verified, reason: verified ? 'Verified successful capture.' : 'Payment verification failed.' };
      }),
      provider: PaymentProvider.SAFEPAY,
    };

    prisma = {
      payment: { findFirst: vi.fn().mockResolvedValue(payment) },
      paymentWebhookEvent: {
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };

    service = new PaymentsService(prisma, safepay);
  });

  afterEach(() => {
    delete process.env.SAFEPAY_WEBHOOK_SECRET;
    vi.restoreAllMocks();
  });

  it('settles a verified payment and records history', async () => {
    await expect(deliver()).resolves.toMatchObject({
      received: true, verified: true, settled: true,
    });

    expect(tx.payment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: PaymentAttemptStatus.SUCCEEDED }),
    }));
    expect(tx.order.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ paymentStatus: PaymentStatus.PAID }),
    }));
    expect(tx.paymentHistory.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        fromStatus: PaymentStatus.PENDING,
        toStatus: PaymentStatus.PAID,
        paymentMethod: PaymentMethod.ONLINE,
        source: PaymentHistorySource.GATEWAY,
        provider: PaymentProvider.SAFEPAY,
      }),
    }));
  });

  it('ignores an already processed duplicate webhook', async () => {
    prisma.paymentWebhookEvent.create.mockRejectedValue({ code: 'P2002' });
    prisma.paymentWebhookEvent.findUnique.mockResolvedValue({
      status: WebhookEventStatus.PROCESSED,
    });

    await expect(deliver()).resolves.toMatchObject({
      received: true, duplicate: true,
    });

    expect(safepay.fetchPayment).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.paymentHistory.create).not.toHaveBeenCalled();
  });

  it('retries a failed webhook after a temporary Safepay outage', async () => {
    safepay.fetchPayment
      .mockRejectedValueOnce(new Error('Temporary Safepay outage'))
      .mockResolvedValueOnce(reporter());

    prisma.paymentWebhookEvent.create
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce({ code: 'P2002' });

    prisma.paymentWebhookEvent.findUnique.mockResolvedValue({
      status: WebhookEventStatus.FAILED,
    });
    prisma.paymentWebhookEvent.updateMany.mockResolvedValue({ count: 1 });

    await expect(deliver()).rejects.toThrow('Temporary Safepay outage');
    await expect(deliver()).resolves.toMatchObject({
      received: true, verified: true, settled: true,
    });

    expect(prisma.paymentWebhookEvent.updateMany).toHaveBeenCalledOnce();
    expect(safepay.fetchPayment).toHaveBeenCalledTimes(2);
    expect(tx.paymentHistory.create).toHaveBeenCalledOnce();
  });

  it('does not settle when the captured amount is incorrect', async () => {
    safepay.fetchPayment.mockResolvedValue(reporter(64000));

    await expect(deliver()).resolves.toMatchObject({
      received: true, verified: false,
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.paymentHistory.create).not.toHaveBeenCalled();
  });

  it('does not settle when the captured currency is incorrect', async () => {
    safepay.fetchPayment.mockResolvedValue(reporter(65000, 'USD'));

    await expect(deliver()).resolves.toMatchObject({
      received: true, verified: false,
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.paymentHistory.create).not.toHaveBeenCalled();
  });
});
