import {
  BadRequestException,
  Inject,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import {
  PaymentAttemptStatus,
  PaymentHistorySource,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  WebhookEventStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { PAYMENT_GATEWAY, type PaymentGateway } from './payment-gateway.interface.js';
import { InitiatePaymentDto } from './dto/initiate-payment.dto.js';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  private get paymentProvider(): PaymentProvider {
    if (
      this.gateway.provider !== PaymentProvider.SAFEPAY &&
      this.gateway.provider !== PaymentProvider.PAYFAST
    ) {
      throw new BadRequestException('The configured payment provider is not supported.');
    }
    return this.gateway.provider as PaymentProvider;
  }

  async initiate(
    orderNumber: string,
    trackingToken: string | undefined,
    dto: InitiatePaymentDto,
  ) {
    if (!trackingToken) {
      throw new UnauthorizedException('Order tracking token is required.');
    }

    const tokenHash = createHash('sha256').update(trackingToken).digest('hex');
    const order = await this.prisma.order.findUnique({ where: { orderNumber } });

    if (!order || !order.trackingTokenHash || order.trackingTokenHash !== tokenHash) {
      throw new UnauthorizedException('Invalid order tracking credentials.');
    }

    if (order.paymentMethod !== PaymentMethod.ONLINE) {
      throw new BadRequestException('This order is not an online payment order.');
    }

    if (order.status === 'CANCELLED' || order.paymentStatus === PaymentStatus.PAID) {
      throw new ConflictException('This order cannot accept another payment.');
    }

    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });

    if (existing) {
      if (existing.orderId !== order.id || existing.method !== dto.method) {
        throw new ConflictException('Idempotency key was already used for another payment request.');
      }

      if (existing.checkoutUrl) {
        return {
          paymentId: existing.id,
          status: existing.status,
          checkoutUrl: existing.checkoutUrl,
          currency: existing.currency,
          amount: existing.amount.toString(),
        };
      }

      throw new ConflictException('This payment attempt is already being processed.');
    }

    let payment;

    try {
      payment = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${order.id} FOR UPDATE`;

        const activePayment = await tx.payment.findFirst({
          where: {
            orderId: order.id,
            provider: this.paymentProvider,
            status: {
              in: [
                PaymentAttemptStatus.INITIATED,
                PaymentAttemptStatus.PENDING,
              ],
            },
          },
        });

        if (activePayment) {
          throw new ConflictException(
            'An online payment attempt is already active for this order.',
          );
        }

        return tx.payment.create({
          data: {
            orderId: order.id,
            provider: this.paymentProvider,
            method: dto.method as any,
            status: PaymentAttemptStatus.INITIATED,
            amount: order.total,
            currency: order.currency,
            idempotencyKey: dto.idempotencyKey,
          },
        });
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        const concurrent = await this.prisma.payment.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
        });

        if (concurrent) {
          if (
            concurrent.orderId !== order.id ||
            concurrent.method !== dto.method
          ) {
            throw new ConflictException(
              'Idempotency key was already used for another payment request.',
            );
          }

          if (concurrent.checkoutUrl) {
            return {
              paymentId: concurrent.id,
              status: concurrent.status,
              checkoutUrl: concurrent.checkoutUrl,
              currency: concurrent.currency,
              amount: concurrent.amount.toString(),
            };
          }

          throw new ConflictException(
            'This payment attempt is already being processed.',
          );
        }
      }

      throw error;
    }

    try {
      const result = await this.gateway.initiate({
        amount: Math.round(Number(order.total) * 100),
        currency: order.currency,
        orderId: order.orderNumber,
        method: dto.method,
        idempotencyKey: dto.idempotencyKey,
      });

      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerPaymentId: result.tracker,
          checkoutUrl: result.checkoutUrl,
          status: PaymentAttemptStatus.PENDING,
        },
      });

      return {
        paymentId: updated.id,
        status: updated.status,
        checkoutUrl: updated.checkoutUrl,
        currency: updated.currency,
        amount: updated.amount.toString(),
      };
    } catch (error) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentAttemptStatus.FAILED,
          failureCode: 'GATEWAY_INITIATION_FAILED',
          failureMessage: 'Safepay checkout initiation failed.',
        },
      }).catch(() => undefined);
      throw error;
    }
  }

  async reconcileSafepayPayment(
    orderNumber: string,
    trackingToken: string | undefined,
  ) {
    if (!trackingToken) {
      throw new UnauthorizedException('Order tracking token is required.');
    }

    const tokenHash = createHash('sha256')
      .update(trackingToken)
      .digest('hex');

    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
    });

    if (
      !order ||
      !order.trackingTokenHash ||
      order.trackingTokenHash !== tokenHash
    ) {
      throw new UnauthorizedException('Invalid order tracking credentials.');
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        orderId: order.id,
        provider: this.paymentProvider,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment?.providerPaymentId) {
      throw new ConflictException('No Safepay transaction exists for this order.');
    }

    const reporterResponse = await this.gateway.fetchPayment(
      payment.providerPaymentId,
    );

    const verification = this.gateway.verify(
      reporterResponse,
      Math.round(Number(payment.amount) * 100),
      payment.currency,
    );

    if (!verification.verified) {
      const terminalFailure = this.gateway.terminalFailureReason(reporterResponse);
      if (!terminalFailure) {
        throw new ConflictException(
          `Payment could not be reconciled: ${verification.reason}`,
        );
      }

      return this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE
        `;
        const currentPayment = await tx.payment.findUnique({ where: { id: payment.id } });
        const currentOrder = await tx.order.findUnique({ where: { id: order.id } });
        if (!currentPayment || !currentOrder) {
          throw new ConflictException('Payment or order no longer exists.');
        }
        if (
          currentPayment.status === PaymentAttemptStatus.SUCCEEDED ||
          currentOrder.paymentStatus === PaymentStatus.PAID
        ) {
          return {
            reconciled: true,
            alreadyReconciled: true,
            paymentStatus: currentPayment.status,
            orderPaymentStatus: currentOrder.paymentStatus,
            message: 'Payment was already confirmed.',
          };
        }
        if (currentOrder.status === 'CANCELLED') {
          throw new ConflictException('The order is cancelled and cannot accept a payment update.');
        }
        if (currentPayment.status !== PaymentAttemptStatus.FAILED) {
          await tx.payment.update({
            where: { id: currentPayment.id },
            data: {
              status: PaymentAttemptStatus.FAILED,
              failureCode: 'GATEWAY_PAYMENT_FAILED',
              failureMessage: terminalFailure.slice(0, 500),
            },
          });
          await tx.order.update({
            where: { id: currentOrder.id },
            data: { paymentStatus: PaymentStatus.FAILED },
          });
          await tx.paymentHistory.create({
            data: {
              fromStatus: currentOrder.paymentStatus,
              toStatus: PaymentStatus.FAILED,
              amount: currentOrder.total,
              currency: currentOrder.currency,
              paymentMethod: PaymentMethod.ONLINE,
              source: PaymentHistorySource.GATEWAY,
              provider: this.paymentProvider,
              orderId: currentOrder.id,
              note: terminalFailure.slice(0, 500),
            },
          });
        }
        return {
          reconciled: false,
          paymentStatus: PaymentAttemptStatus.FAILED,
          orderPaymentStatus: PaymentStatus.FAILED,
          message: terminalFailure,
        };
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE
      `;

      const currentPayment = await tx.payment.findUnique({
        where: { id: payment.id },
      });

      const currentOrder = await tx.order.findUnique({
        where: { id: order.id },
      });

      if (!currentPayment || !currentOrder) {
        throw new ConflictException('Payment or order no longer exists.');
      }

      if (currentPayment.status === PaymentAttemptStatus.SUCCEEDED) {
        return {
          reconciled: true,
          alreadyReconciled: true,
          paymentStatus: currentPayment.status,
          orderPaymentStatus: currentOrder.paymentStatus,
          message: 'Payment was already reconciled.',
        };
      }

      if (currentOrder.paymentStatus === PaymentStatus.PAID) {
        throw new ConflictException(
          'Order is already paid by another payment attempt. Manual review is required.',
        );
      }

      if (currentOrder.status === 'CANCELLED') {
        throw new ConflictException(
          'Order is cancelled. Manual review is required for this captured payment.',
        );
      }

      const paidAt = new Date();

      await tx.payment.update({
        where: { id: currentPayment.id },
        data: {
          status: PaymentAttemptStatus.SUCCEEDED,
          paidAt,
          failureCode: null,
          failureMessage: null,
        },
      });

      await tx.order.update({
        where: { id: currentOrder.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          paidAt,
        },
      });

      await tx.paymentHistory.create({
        data: {
          fromStatus: currentOrder.paymentStatus,
          toStatus: PaymentStatus.PAID,
          amount: currentOrder.total,
          currency: currentOrder.currency,
          paymentMethod: PaymentMethod.ONLINE,
          source: PaymentHistorySource.GATEWAY,
          provider: this.paymentProvider,
          orderId: currentOrder.id,
          note: 'Safepay payment verified and reconciled through reporter API.',
        },
      });

      return {
        reconciled: true,
        alreadyReconciled: false,
        paymentStatus: PaymentAttemptStatus.SUCCEEDED,
        orderPaymentStatus: PaymentStatus.PAID,
        message: 'Safepay payment successfully reconciled.',
      };
    });
  }

  async inspectSafepayPayment(
    orderNumber: string,
    trackingToken: string | undefined,
  ) {
    if (!trackingToken) {
      throw new UnauthorizedException('Order tracking token is required.');
    }

    const tokenHash = createHash('sha256').update(trackingToken).digest('hex');
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
    });

    if (!order || !order.trackingTokenHash || order.trackingTokenHash !== tokenHash) {
      throw new UnauthorizedException('Invalid order tracking credentials.');
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        orderId: order.id,
        provider: this.paymentProvider,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment?.providerPaymentId) {
      throw new ConflictException('No payment transaction exists for this order.');
    }

    const response = await this.gateway.fetchPayment(payment.providerPaymentId);

    const sanitize = (value: any, key = ''): any => {
      if (/token|secret|authorization|card|email|phone|address|customer|name|tracker|id/i.test(key)) {
        return '[REDACTED]';
      }

      if (Array.isArray(value)) {
        return value.map((item) => sanitize(item));
      }

      if (value && typeof value === 'object') {
        return Object.fromEntries(
          Object.entries(value).map(([childKey, childValue]) => [
            childKey,
            sanitize(childValue, childKey),
          ]),
        );
      }

      if (/state|status|amount|currency|message|error|code|intent|mode|environment|success|paid/i.test(key)) {
        return value;
      }

      return value === null ? null : '[OMITTED]';
    };

    return {
      paymentId: payment.id,
      localPaymentStatus: payment.status,
      localOrderPaymentStatus: order.paymentStatus,
      reporterResponse: sanitize(response),
    };
  }

  async handleSafepayWebhook(
    payload: any,
    signature: string | undefined,
    rawBody: Buffer | undefined,
  ) {
    if (this.gateway.provider !== PaymentProvider.SAFEPAY) {
      throw new BadRequestException('The Safepay webhook is not active for the configured payment provider.');
    }

    if (!Buffer.isBuffer(rawBody)) {
      throw new BadRequestException('Original webhook request body is unavailable.');
    }

    const secret = process.env.SAFEPAY_WEBHOOK_SECRET;

    if (!secret || !signature) {
      throw new UnauthorizedException('Webhook signature configuration is missing.');
    }

    const expected = createHmac('sha512', secret)
      .update(rawBody)
      .digest('hex');

    const supplied = signature.trim().replace(/^sha512=/i, '');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const suppliedBuffer = Buffer.from(supplied, 'hex');

    if (
      expectedBuffer.length !== suppliedBuffer.length ||
      !timingSafeEqual(expectedBuffer, suppliedBuffer)
    ) {
      throw new UnauthorizedException('Invalid Safepay webhook signature.');
    }

    const tracker = payload?.data?.tracker;
    const state = payload?.data?.state;

    if (typeof tracker !== 'string' || typeof state !== 'string' || !tracker || !state) {
      throw new BadRequestException('Invalid Safepay webhook payload.');
    }

    const payloadHash = createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    const eventId = `${tracker}:${state}`;

    let payment;
    let retryClaimed = false;

    try {
      payment = await this.prisma.payment.findFirst({
        where: {
          provider: PaymentProvider.SAFEPAY,
          providerPaymentId: tracker,
        },
      });

      await this.prisma.paymentWebhookEvent.create({
        data: {
          provider: PaymentProvider.SAFEPAY,
          eventId,
          eventType: state,
          payloadHash,
          status: WebhookEventStatus.RECEIVED,
          paymentId: payment?.id,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const existingEvent =
          await this.prisma.paymentWebhookEvent.findUnique({
            where: {
              provider_eventId: {
                provider: PaymentProvider.SAFEPAY,
                eventId,
              },
            },
          });

        if (existingEvent?.status === WebhookEventStatus.FAILED) {
          const retryClaim =
            await this.prisma.paymentWebhookEvent.updateMany({
              where: {
                provider: PaymentProvider.SAFEPAY,
                eventId,
                status: WebhookEventStatus.FAILED,
              },
              data: {
                status: WebhookEventStatus.RECEIVED,
                failureReason: null,
                processedAt: null,
              },
            });

          if (retryClaim.count !== 1) {
            return { received: true, duplicate: true };
          }

          retryClaimed = true;
          console.log(
            `Retrying previously failed Safepay webhook: ${eventId}`,
          );
        } else {
          return { received: true, duplicate: true };
        }
      }
      if (!retryClaimed) throw error;
    }

    if (!payment) {
      await this.prisma.paymentWebhookEvent.update({
        where: {
          provider_eventId: {
            provider: PaymentProvider.SAFEPAY,
            eventId,
          },
        },
        data: {
          status: WebhookEventStatus.FAILED,
          failureReason: 'No matching local payment attempt was found. Retry required.',
          attempts: { increment: 1 },
        },
      });

      throw new ConflictException(
        'No matching local payment attempt was found. Safepay webhook should be retried.',
      );
    }

    try {
      const reporterResponse = await this.gateway.fetchPayment(tracker);
      const verification = this.gateway.verify(
        reporterResponse,
        Math.round(Number(payment.amount) * 100),
        payment.currency,
      );

      if (!verification.verified) {
        const terminalFailure = this.gateway.terminalFailureReason(reporterResponse);
        if (!terminalFailure) {
          await this.prisma.paymentWebhookEvent.update({
            where: {
              provider_eventId: {
                provider: PaymentProvider.SAFEPAY,
                eventId,
              },
            },
            data: {
              status: WebhookEventStatus.FAILED,
              failureReason: verification.reason.slice(0, 500),
              attempts: { increment: 1 },
            },
          });

          return {
            received: true,
            verified: false,
            message: verification.reason,
          };
        }

        await this.prisma.$transaction(async (tx) => {
          await tx.$queryRaw`
            SELECT id FROM "Order" WHERE id = ${payment.orderId} FOR UPDATE
          `;
          const currentPayment = await tx.payment.findUnique({ where: { id: payment.id } });
          const order = await tx.order.findUnique({ where: { id: payment.orderId } });
          if (!currentPayment || !order) {
            throw new ConflictException('Payment or order no longer exists.');
          }

          if (
            currentPayment.status !== PaymentAttemptStatus.SUCCEEDED &&
            order.paymentStatus !== PaymentStatus.PAID
          ) {
            await tx.payment.update({
              where: { id: currentPayment.id },
              data: {
                status: PaymentAttemptStatus.FAILED,
                failureCode: 'GATEWAY_PAYMENT_FAILED',
                failureMessage: terminalFailure.slice(0, 500),
              },
            });
            if (order.paymentStatus !== PaymentStatus.FAILED) {
              await tx.order.update({
                where: { id: order.id },
                data: { paymentStatus: PaymentStatus.FAILED },
              });
              await tx.paymentHistory.create({
                data: {
                  fromStatus: order.paymentStatus,
                  toStatus: PaymentStatus.FAILED,
                  amount: order.total,
                  currency: order.currency,
                  paymentMethod: PaymentMethod.ONLINE,
                  source: PaymentHistorySource.GATEWAY,
                  provider: PaymentProvider.SAFEPAY,
                  orderId: order.id,
                  note: terminalFailure.slice(0, 500),
                },
              });
            }
          }

          await tx.paymentWebhookEvent.update({
            where: {
              provider_eventId: {
                provider: PaymentProvider.SAFEPAY,
                eventId,
              },
            },
            data: {
              status: WebhookEventStatus.PROCESSED,
              processedAt: new Date(),
              attempts: { increment: 1 },
            },
          });
        });

        return {
          received: true,
          verified: false,
          settled: true,
          paymentStatus: PaymentAttemptStatus.FAILED,
          message: terminalFailure,
        };
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT id FROM "Order" WHERE id = ${payment.orderId} FOR UPDATE
        `;

        const currentPayment = await tx.payment.findUnique({
          where: { id: payment.id },
        });
        const order = await tx.order.findUnique({
          where: { id: payment.orderId },
        });

        if (!currentPayment || !order) {
          throw new ConflictException('Payment or order no longer exists.');
        }

        if (currentPayment.status === PaymentAttemptStatus.SUCCEEDED ||
            order.paymentStatus === PaymentStatus.PAID) {
          await tx.paymentWebhookEvent.update({
            where: {
              provider_eventId: {
                provider: PaymentProvider.SAFEPAY,
                eventId,
              },
            },
            data: {
              status: WebhookEventStatus.PROCESSED,
              processedAt: new Date(),
              attempts: { increment: 1 },
            },
          });
          return;
        }

        if (order.status === 'CANCELLED') {
          throw new ConflictException('A cancelled order cannot be settled automatically.');
        }

        await tx.payment.update({
          where: { id: currentPayment.id },
          data: {
            status: PaymentAttemptStatus.SUCCEEDED,
            paidAt: new Date(),
            failureCode: null,
            failureMessage: null,
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            paidAt: new Date(),
          },
        });

        await tx.paymentHistory.create({
          data: {
            fromStatus: order.paymentStatus,
            toStatus: PaymentStatus.PAID,
            amount: order.total,
            currency: order.currency,
            paymentMethod: PaymentMethod.ONLINE,
            source: PaymentHistorySource.GATEWAY,
            provider: PaymentProvider.SAFEPAY,
            orderId: order.id,
            note: 'Safepay payment verified through reporter API.',
          },
        });

        await tx.paymentWebhookEvent.update({
          where: {
            provider_eventId: {
              provider: PaymentProvider.SAFEPAY,
              eventId,
            },
          },
          data: {
            status: WebhookEventStatus.PROCESSED,
            processedAt: new Date(),
            attempts: { increment: 1 },
          },
        });
      });

      return { received: true, verified: true, settled: true };
    } catch (error) {
      await this.prisma.paymentWebhookEvent.update({
        where: {
          provider_eventId: {
            provider: PaymentProvider.SAFEPAY,
            eventId,
          },
        },
        data: {
          status: WebhookEventStatus.FAILED,
          failureReason: 'Payment verification or settlement failed.',
          attempts: { increment: 1 },
        },
      }).catch(() => undefined);

      throw error;
    }
  }
}
