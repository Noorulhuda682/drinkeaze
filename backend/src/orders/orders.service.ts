import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, OrderStatus, PaymentStatus } from '@prisma/client';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private getTrackingEncryptionKey(): Buffer {
    const value = process.env.ORDER_TRACKING_ENCRYPTION_KEY;

    if (!value || !/^[0-9a-f]{64}$/i.test(value)) {
      throw new Error('ORDER_TRACKING_ENCRYPTION_KEY must be a 32-byte hexadecimal key.');
    }

    return Buffer.from(value, 'hex');
  }

  private encryptTrackingToken(token: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(
      'aes-256-gcm',
      this.getTrackingEncryptionKey(),
      iv,
    );

    const encrypted = Buffer.concat([
      cipher.update(token, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted.toString('hex'),
    ].join('.');
  }

  private decryptTrackingToken(value: string): string {
    const parts = value.split('.');

    if (
      parts.length !== 3 ||
      !/^[0-9a-f]{24}$/i.test(parts[0]!) ||
      !/^[0-9a-f]{32}$/i.test(parts[1]!) ||
      !/^(?:[0-9a-f]{2})+$/i.test(parts[2]!)
    ) {
      throw new Error('Stored order tracking token is invalid.');
    }

    const [ivHex, tagHex, encryptedHex] = parts;

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.getTrackingEncryptionKey(),
      Buffer.from(ivHex!, 'hex'),
    );

    decipher.setAuthTag(Buffer.from(tagHex!, 'hex'));

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedHex!, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  }

  private returnOrderWithTrackingToken<T extends {
    trackingTokenEncrypted: string | null;
  }>(order: T) {
    if (!order.trackingTokenEncrypted) {
      throw new ConflictException(
        'Tracking is unavailable for this older order. Please contact support.',
      );
    }

    return {
      ...order,
      trackingToken: this.decryptTrackingToken(order.trackingTokenEncrypted),
    };
  }

  private getRequestHash(dto: CreateOrderDto): string {
    const canonicalRequest = {
      customerName: dto.customerName.trim(),
      customerPhone: dto.customerPhone.trim(),
      customerEmail: dto.customerEmail?.trim().toLowerCase() ?? null,
      deliveryAddress: dto.deliveryAddress.trim(),
      deliveryCity: dto.deliveryCity.trim(),
      deliveryInstructions: dto.deliveryInstructions?.trim() ?? null,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes?.trim() ?? null,
      items: dto.items
        .map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        }))
        .sort(
          (a, b) =>
            a.variantId.localeCompare(b.variantId) || a.quantity - b.quantity,
        ),
    };

    return createHash('sha256')
      .update(JSON.stringify(canonicalRequest))
      .digest('hex');
  }

  private assertRequestMatches(
    existing: { requestHash: string | null },
    requestHash: string,
  ): void {
    if (!existing.requestHash) {
      throw new ConflictException(
        'This key belongs to an older order and cannot be safely reused. Generate a new Idempotency-Key.',
      );
    }

    if (existing.requestHash !== requestHash) {
      throw new ConflictException(
        'This Idempotency-Key was already used for a different checkout request. Use a new key for a new order.',
      );
    }
  }

  async create(dto: CreateOrderDto, idempotencyKey?: string) {
    const key = idempotencyKey?.trim();

    if (!key) {
      throw new BadRequestException('Idempotency-Key header is required.');
    }

    if (key.length < 8 || key.length > 100) {
      throw new BadRequestException('Invalid Idempotency-Key header.');
    }

    const requestHash = this.getRequestHash(dto);

    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey: key },
      include: { items: true },
    });

    if (existing) {
      this.assertRequestMatches(existing, requestHash);
      return this.returnOrderWithTrackingToken(existing);
    }

    const trackingToken = randomBytes(32).toString('base64url');
    const trackingTokenHash = createHash('sha256')
      .update(trackingToken)
      .digest('hex');
    const trackingTokenEncrypted = this.encryptTrackingToken(trackingToken);

    try {
      const order = await this.prisma.$transaction(
        async (tx) => {
          const variantIds = [
            ...new Set(dto.items.map((item) => item.variantId)),
          ];

          const variants = await tx.productVariant.findMany({
            where: {
              id: { in: variantIds },
              isAvailable: true,
              product: { isActive: true },
            },
            include: {
              product: true,
              recipe: {
                include: {
                  ingredient: {
                    include: { inventory: true },
                  },
                },
              },
            },
          });

          if (variants.length !== variantIds.length) {
            throw new BadRequestException(
              'One or more products or variants are unavailable.',
            );
          }

          const variantMap = new Map(
            variants.map((variant) => [variant.id, variant]),
          );

          const requiredStock = new Map<
            string,
            { quantity: Prisma.Decimal; unit: string }
          >();

          let subtotal = new Prisma.Decimal(0);

          const orderItems = dto.items.map((item) => {
            const variant = variantMap.get(item.variantId);

            if (!variant) {
              throw new BadRequestException('Invalid product variant.');
            }

            if (variant.recipe.length === 0) {
              throw new BadRequestException(
                `${variant.product.name} (${variant.name}) has no recipe configured.`,
              );
            }

            const unitPrice = new Prisma.Decimal(variant.price);
            const lineTotal = unitPrice.mul(item.quantity);

            subtotal = subtotal.add(lineTotal);

            for (const recipeItem of variant.recipe) {
              const ingredient = recipeItem.ingredient;
              const inventory = ingredient.inventory;

              if (!ingredient.isActive || !inventory) {
                throw new BadRequestException(
                  `Ingredient "${ingredient.name}" is inactive or has no inventory.`,
                );
              }

              // Recipe quantity uses the same unit as its inventory record.
              const required = new Prisma.Decimal(recipeItem.quantity).mul(
                item.quantity,
              );

              const previous = requiredStock.get(ingredient.id);

              requiredStock.set(ingredient.id, {
                quantity: previous ? previous.quantity.add(required) : required,
                unit: inventory.unit,
              });
            }

            return {
              variantId: variant.id,
              productName: variant.product.name,
              variantName: variant.name,
              sku: variant.sku,
              quantity: item.quantity,
              unitPrice,
              lineTotal,
            };
          });

          // Lock inventory rows in a consistent order to prevent
          // concurrent orders from overselling the same ingredients.
          const ingredientIds = [...requiredStock.keys()].sort();

          for (const ingredientId of ingredientIds) {
            await tx.$queryRaw`
              SELECT "id"
              FROM "Inventory"
              WHERE "ingredientId" = ${ingredientId}
              FOR UPDATE
            `;
          }

          const inventories = await tx.inventory.findMany({
            where: { ingredientId: { in: ingredientIds } },
          });

          const inventoryMap = new Map(
            inventories.map((inventory) => [inventory.ingredientId, inventory]),
          );

          for (const ingredientId of ingredientIds) {
            const requirement = requiredStock.get(ingredientId)!;
            const inventory = inventoryMap.get(ingredientId);

            if (!inventory) {
              throw new BadRequestException(
                'An ingredient inventory record is missing.',
              );
            }

            if (
              new Prisma.Decimal(inventory.quantity).lt(requirement.quantity)
            ) {
              const ingredient = await tx.ingredient.findUnique({
                where: { id: ingredientId },
                select: { name: true },
              });

              throw new BadRequestException(
                `Insufficient stock for ${ingredient?.name ?? 'an ingredient'}. Available: ${inventory.quantity.toString()} ${inventory.unit}; required: ${requirement.quantity.toString()} ${requirement.unit}.`,
              );
            }
          }

          const zero = new Prisma.Decimal(0);
          const paymentStatus =
            dto.paymentMethod === 'ONLINE'
              ? PaymentStatus.PENDING
              : PaymentStatus.UNPAID;

          const order = await tx.order.create({
            data: {
              orderNumber: `DE-${Date.now()}-${randomUUID()
                .slice(0, 8)
                .toUpperCase()}`,
              idempotencyKey: key,
              requestHash,
              trackingTokenHash,
              trackingTokenEncrypted,
              customerName: dto.customerName.trim(),
              customerPhone: dto.customerPhone.trim(),
              customerEmail: dto.customerEmail?.trim().toLowerCase(),
              deliveryAddress: dto.deliveryAddress.trim(),
              deliveryCity: dto.deliveryCity.trim(),
              deliveryInstructions: dto.deliveryInstructions?.trim(),
              subtotal,
              deliveryFee: zero,
              discount: zero,
              total: subtotal,
              paymentMethod: dto.paymentMethod,
              paymentStatus,
              notes: dto.notes?.trim(),
              items: { create: orderItems },
            },
            include: { items: true },
          });

          // Deduct stock and record the audit movement in the
          // same transaction as the order.
          for (const ingredientId of ingredientIds) {
            const requirement = requiredStock.get(ingredientId)!;
            const inventory = inventoryMap.get(ingredientId)!;

            const newQuantity = new Prisma.Decimal(inventory.quantity).sub(
              requirement.quantity,
            );

            await tx.inventory.update({
              where: { id: inventory.id },
              data: { quantity: newQuantity },
            });

            await tx.stockMovement.create({
              data: {
                type: 'OUT',
                quantity: requirement.quantity,
                previousQuantity: inventory.quantity,
                newQuantity,
                note: `Order ${order.orderNumber}`,
                ingredientId,
                orderId: order.id,
              },
            });
          }

          return order;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 10000,
          timeout: 20000,
        },
      );

      return {
        ...order,
        trackingToken,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.order.findUnique({
          where: { idempotencyKey: key },
          include: { items: true },
        });

        if (existing) {
          this.assertRequestMatches(existing, requestHash);
          return this.returnOrderWithTrackingToken(existing);
        }
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'Inventory changed during checkout. Please retry your order.',
        );
      }

      throw error;
    }
  }


  async listAdminOrders(pageInput = '1', limitInput = '20', statusInput?: string) {
    const page = Number(pageInput);
    const limit = Number(limitInput);

    if (!Number.isSafeInteger(page) || page < 1) {
      throw new BadRequestException('Page must be a positive integer.');
    }

    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100.');
    }

    const where: Prisma.OrderWhereInput = {};

    if (statusInput) {
      if (!Object.values(OrderStatus).includes(statusInput as OrderStatus)) {
        throw new BadRequestException('Invalid order status filter.');
      }

      where.status = statusInput as OrderStatus;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          deliveryAddress: true,
          deliveryCity: true,
          subtotal: true,
          deliveryFee: true,
          discount: true,
          total: true,
          currency: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
          paidAt: true,
          cancelledAt: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAdminOrderById(id: string) {
    if (!id || id.length > 100) {
      throw new BadRequestException('Invalid order ID.');
    }

    const order = await this.prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        deliveryAddress: true,
        deliveryCity: true,
        deliveryInstructions: true,
        subtotal: true,
        deliveryFee: true,
        discount: true,
        total: true,
        currency: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        paidAt: true,
        cancelledAt: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            productName: true,
            variantName: true,
            sku: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            variantId: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            note: true,
            createdAt: true,
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        paymentHistory: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            amount: true,
            currency: true,
            paymentMethod: true,
            note: true,
            createdAt: true,
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        stockMovements: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            type: true,
            quantity: true,
            previousQuantity: true,
            newQuantity: true,
            note: true,
            ingredientId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return order;
  }

  async cancelAdminOrder(id: string) {
    if (!id || id.length > 100) {
      throw new BadRequestException('Invalid order ID.');
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Serialize cancellation attempts for this order.
          const lockedOrders = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT "id"
            FROM "Order"
            WHERE "id" = ${id}
            FOR UPDATE
          `;

          if (lockedOrders.length === 0) {
            throw new NotFoundException('Order not found.');
          }

          const order = await tx.order.findUnique({
            where: { id },
            select: {
              id: true,
              orderNumber: true,
              status: true,
              paymentStatus: true,
            },
          });

          if (!order) {
            throw new NotFoundException('Order not found.');
          }

          if (order.status === OrderStatus.CANCELLED) {
            throw new ConflictException('Order has already been cancelled.');
          }

          if (
            order.status !== OrderStatus.PENDING &&
            order.status !== OrderStatus.CONFIRMED
          ) {
            throw new ConflictException(
              'Only pending or confirmed orders can be cancelled.',
            );
          }

          if (
            order.paymentStatus !== PaymentStatus.UNPAID &&
            order.paymentStatus !== PaymentStatus.FAILED
          ) {
            throw new ConflictException(
              'This order cannot be cancelled because its payment is not eligible for cancellation. Resolve payment or refund processing first.',
            );
          }

          // Original checkout movements are the source of truth.
          // Never use the current recipe to calculate a stock refund.
          const movements = await tx.stockMovement.findMany({
            where: {
              orderId: id,
              type: 'OUT',
            },
            orderBy: { ingredientId: 'asc' },
            select: {
              ingredientId: true,
              quantity: true,
            },
          });

          if (movements.length === 0) {
            throw new ConflictException(
              'Cannot safely restore inventory: this order has no recorded stock deductions.',
            );
          }

          const requiredStock = new Map<string, Prisma.Decimal>();

          for (const movement of movements) {
            const quantity = new Prisma.Decimal(movement.quantity);

            if (!quantity.isFinite() || quantity.lte(0)) {
              throw new ConflictException(
                'Invalid original stock movement. Manual inventory review is required.',
              );
            }

            const current = requiredStock.get(movement.ingredientId);

            requiredStock.set(
              movement.ingredientId,
              current ? current.add(quantity) : quantity,
            );
          }

          const ingredientIds = [...requiredStock.keys()].sort();

          // Lock inventory in deterministic order to reduce deadlocks.
          const lockedInventory = await tx.$queryRaw<
            Array<{ id: string; ingredientId: string }>
          >`
            SELECT "id", "ingredientId"
            FROM "Inventory"
            WHERE "ingredientId" IN (${Prisma.join(ingredientIds)})
            ORDER BY "ingredientId"
            FOR UPDATE
          `;

          if (lockedInventory.length !== ingredientIds.length) {
            throw new ConflictException(
              'Inventory records are missing. Cancellation requires manual inventory review.',
            );
          }

          const inventoryRows = await tx.inventory.findMany({
            where: { ingredientId: { in: ingredientIds } },
            orderBy: { ingredientId: 'asc' },
            select: {
              id: true,
              ingredientId: true,
              quantity: true,
            },
          });

          if (inventoryRows.length !== ingredientIds.length) {
            throw new ConflictException(
              'Inventory records changed unexpectedly. Please retry.',
            );
          }

          for (const inventory of inventoryRows) {
            const restoreQuantity = requiredStock.get(inventory.ingredientId);

            if (!restoreQuantity || restoreQuantity.lte(0)) {
              throw new ConflictException('Invalid inventory restoration quantity.');
            }

            const previousQuantity = new Prisma.Decimal(inventory.quantity);
            const newQuantity = previousQuantity.add(restoreQuantity);

            await tx.inventory.update({
              where: { id: inventory.id },
              data: { quantity: newQuantity },
            });

            await tx.stockMovement.create({
              data: {
                type: 'IN',
                quantity: restoreQuantity,
                previousQuantity,
                newQuantity,
                note: `Cancellation of order ${order.orderNumber}`,
                ingredientId: inventory.ingredientId,
                orderId: order.id,
              },
            });
          }

          // Inventory restoration and status change commit together.
          const cancelledOrder = await tx.order.update({
            where: { id },
            data: {
              status: OrderStatus.CANCELLED,
              cancelledAt: new Date(),
            },
            select: {
              id: true,
              orderNumber: true,
              status: true,
              paymentStatus: true,
              cancelledAt: true,
              total: true,
              currency: true,
              updatedAt: true,
            },
          });

          return {
            message: 'Order cancelled and inventory restored successfully.',
            order: cancelledOrder,
            restoredIngredients: ingredientIds.length,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 10000,
          timeout: 20000,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'A concurrent database change prevented cancellation. Please retry.',
        );
      }

      throw error;
    }
  }

  async updateAdminOrderStatus(
    id: string,
    nextStatus: OrderStatus,
    adminId: string,
    note?: string,
  ) {
    if (!id || id.length > 100) {
      throw new BadRequestException('Invalid order ID.');
    }

    if (!adminId || adminId.length > 100) {
      throw new BadRequestException('Invalid authenticated admin.');
    }

    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING],
      [OrderStatus.PREPARING]: [OrderStatus.READY],
      [OrderStatus.READY]: [OrderStatus.OUT_FOR_DELIVERY],
      [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.COMPLETED],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Serialize all status changes for this order.
          const locked = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT "id"
            FROM "Order"
            WHERE "id" = ${id}
            FOR UPDATE
          `;

          if (locked.length === 0) {
            throw new NotFoundException('Order not found.');
          }

          const order = await tx.order.findUnique({
            where: { id },
            select: {
              id: true,
              orderNumber: true,
              status: true,
              paymentMethod: true,
              paymentStatus: true,
            },
          });

          if (!order) {
            throw new NotFoundException('Order not found.');
          }

          const allowed = allowedTransitions[order.status];

          if (!allowed.includes(nextStatus)) {
            throw new ConflictException(
              `Invalid order status transition: ${order.status} → ${nextStatus}.`,
            );
          }

          // An online order must be paid before it can be completed.
          // COD collection is handled operationally at delivery.
          if (
            nextStatus === OrderStatus.COMPLETED &&
            order.paymentMethod === 'ONLINE' &&
            order.paymentStatus !== PaymentStatus.PAID
          ) {
            throw new ConflictException(
              'An online order cannot be completed until its payment is confirmed as PAID.',
            );
          }

          const admin = await tx.admin.findUnique({
            where: { id: adminId },
            select: { id: true },
          });

          if (!admin) {
            throw new ConflictException(
              'The authenticated admin is no longer available.',
            );
          }

          const updatedOrder = await tx.order.update({
            where: { id },
            data: { status: nextStatus },
            select: {
              id: true,
              orderNumber: true,
              status: true,
              paymentMethod: true,
              paymentStatus: true,
              updatedAt: true,
            },
          });

          const history = await tx.orderStatusHistory.create({
            data: {
              orderId: id,
              adminId,
              fromStatus: order.status,
              toStatus: nextStatus,
              note: note?.trim() || null,
            },
            select: {
              id: true,
              fromStatus: true,
              toStatus: true,
              note: true,
              createdAt: true,
              admin: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          });

          return {
            message: 'Order status updated successfully.',
            order: updatedOrder,
            history,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 10000,
          timeout: 20000,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'A concurrent database change prevented the status update. Please retry.',
        );
      }

      throw error;
    }
  }

  async collectCodPayment(
    id: string,
    adminId: string,
    note?: string,
  ) {
    if (!id || id.length > 100) {
      throw new BadRequestException('Invalid order ID.');
    }

    if (!adminId || adminId.length > 100) {
      throw new BadRequestException('Invalid authenticated admin.');
    }

    if (note !== undefined && (typeof note !== 'string' || note.length > 500)) {
      throw new BadRequestException('Payment note must not exceed 500 characters.');
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Serialize collection attempts for this order.
          const locked = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT "id"
            FROM "Order"
            WHERE "id" = ${id}
            FOR UPDATE
          `;

          if (locked.length === 0) {
            throw new NotFoundException('Order not found.');
          }

          const order = await tx.order.findUnique({
            where: { id },
            select: {
              id: true,
              orderNumber: true,
              total: true,
              currency: true,
              status: true,
              paymentMethod: true,
              paymentStatus: true,
            },
          });

          if (!order) {
            throw new NotFoundException('Order not found.');
          }

          if (order.paymentMethod !== 'CASH_ON_DELIVERY') {
            throw new ConflictException(
              'Cash collection is only allowed for Cash on Delivery orders.',
            );
          }

          if (
            order.status !== OrderStatus.OUT_FOR_DELIVERY &&
            order.status !== OrderStatus.COMPLETED
          ) {
            throw new ConflictException(
              'COD payment can only be collected when an order is out for delivery or completed.',
            );
          }

          if (order.paymentStatus !== PaymentStatus.UNPAID) {
            throw new ConflictException(
              `Payment cannot be collected because its current status is ${order.paymentStatus}.`,
            );
          }

          const admin = await tx.admin.findFirst({
            where: { id: adminId, isActive: true },
            select: { id: true },
          });

          if (!admin) {
            throw new ConflictException(
              'The authenticated admin is no longer active.',
            );
          }

          const paidAt = new Date();

          const updatedOrder = await tx.order.update({
            where: { id },
            data: {
              paymentStatus: PaymentStatus.PAID,
              paidAt,
            },
            select: {
              id: true,
              orderNumber: true,
              status: true,
              paymentMethod: true,
              paymentStatus: true,
              total: true,
              currency: true,
              paidAt: true,
              updatedAt: true,
            },
          });

          const history = await tx.paymentHistory.create({
            data: {
              orderId: id,
              adminId,
              fromStatus: PaymentStatus.UNPAID,
              toStatus: PaymentStatus.PAID,
              amount: order.total,
              currency: order.currency,
              paymentMethod: order.paymentMethod,
              note: note?.trim() || null,
            },
            select: {
              id: true,
              fromStatus: true,
              toStatus: true,
              amount: true,
              currency: true,
              paymentMethod: true,
              note: true,
              createdAt: true,
              admin: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          });

          return {
            message: 'COD payment collected successfully.',
            order: updatedOrder,
            history,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 10000,
          timeout: 20000,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'A concurrent payment update prevented collection. Please retry.',
        );
      }

      throw error;
    }
  }

  async findByOrderNumber(orderNumber: string, trackingToken?: string) {
    if (
      !trackingToken ||
      !/^[A-Za-z0-9_-]{43}$/.test(trackingToken)
    ) {
      throw new NotFoundException('Order not found.');
    }

    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      select: {
        orderNumber: true,
        trackingTokenHash: true,
        status: true,
        paymentStatus: true,
        total: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            productName: true,
            variantName: true,
            sku: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
          },
        },
      },
    });

    if (!order?.trackingTokenHash) {
      throw new NotFoundException('Order not found.');
    }

    const suppliedHash = createHash('sha256')
      .update(trackingToken)
      .digest();
    const storedHash = Buffer.from(order.trackingTokenHash, 'hex');

    if (
      storedHash.length !== suppliedHash.length ||
      !timingSafeEqual(storedHash, suppliedHash)
    ) {
      throw new NotFoundException('Order not found.');
    }

    const { trackingTokenHash: _hash, ...safeOrder } = order;
    return safeOrder;
  }
}
