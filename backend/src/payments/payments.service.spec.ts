import { createHmac } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentsService } from './payments.service.js';

describe('PaymentsService Safepay webhook signature', () => {
  const secret = 'test-safepay-webhook-secret';
  const rawBody = Buffer.from(
    '{"data":{"tracker":"test-tracker","state":"TRACKER_ENDED"}}',
  );

  let service: PaymentsService;
  let prisma: any;

  const validSignature = () =>
    createHmac('sha512', secret).update(rawBody).digest('hex');

  beforeEach(() => {
    process.env.SAFEPAY_WEBHOOK_SECRET = secret;

    prisma = {
      payment: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      paymentWebhookEvent: {
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    service = new PaymentsService(prisma, { provider: 'SAFEPAY' } as any);
  });

  afterEach(() => {
    delete process.env.SAFEPAY_WEBHOOK_SECRET;
    vi.restoreAllMocks();
  });

  it('accepts a valid raw-body HMAC signature', async () => {
    await expect(
      service.handleSafepayWebhook(
        JSON.parse(rawBody.toString()),
        validSignature(),
        rawBody,
      ),
    ).rejects.toThrow(ConflictException);

    expect(prisma.payment.findFirst).toHaveBeenCalledOnce();
    expect(prisma.paymentWebhookEvent.create).toHaveBeenCalledOnce();
    expect(prisma.paymentWebhookEvent.update).toHaveBeenCalledOnce();
  });

  it('rejects an invalid signature with UnauthorizedException', async () => {
    await expect(
      service.handleSafepayWebhook(
        JSON.parse(rawBody.toString()),
        'invalid-signature',
        rawBody,
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a missing raw request body', async () => {
    await expect(
      service.handleSafepayWebhook(
        JSON.parse(rawBody.toString()),
        validSignature(),
        undefined,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a missing webhook secret', async () => {
    delete process.env.SAFEPAY_WEBHOOK_SECRET;

    await expect(
      service.handleSafepayWebhook(
        JSON.parse(rawBody.toString()),
        validSignature(),
        rawBody,
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
  });
});
