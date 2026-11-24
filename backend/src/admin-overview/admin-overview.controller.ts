import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

@UseGuards(AdminJwtGuard)
@Controller('admin')
export class AdminOverviewController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('overview')
  async getOverview() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      todayOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      paidOrdersAll,
      paidOrdersToday,
      totalProducts,
      publishedProducts,
      totalIngredients,
      ingredientsWithInventory,
      recentOrders,
      recentMovements,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count({ where: { status: 'COMPLETED' } }),
      this.prisma.order.count({ where: { status: 'CANCELLED' } }),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { paymentStatus: 'PAID', status: { not: 'CANCELLED' } },
      }),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: {
          paymentStatus: 'PAID',
          status: { not: 'CANCELLED' },
          createdAt: { gte: startOfToday },
        },
      }),
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.ingredient.count({ where: { isActive: true } }),
      this.prisma.ingredient.findMany({
        where: { isActive: true },
        include: { inventory: true },
      }),
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          total: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
        },
      }),
      this.prisma.stockMovement.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { ingredient: { select: { name: true } } },
      }),
    ]);

    let lowStockIngredients = 0;
    let outOfStockIngredients = 0;

    for (const ing of ingredientsWithInventory) {
      const qty = ing.inventory?.quantity ?? new Prisma.Decimal(0);
      const reorder = ing.inventory?.reorderLevel ?? new Prisma.Decimal(0);
      if (qty.lte(0)) outOfStockIngredients += 1;
      if (qty.lte(reorder)) lowStockIngredients += 1;
    }

    return {
      orders: {
        total: totalOrders,
        today: todayOrders,
        pending: pendingOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
      },
      revenue: {
        totalSales: (paidOrdersAll._sum.total ?? new Prisma.Decimal(0)).toFixed(2),
        todayRevenue: (paidOrdersToday._sum.total ?? new Prisma.Decimal(0)).toFixed(2),
        currency: 'PKR',
      },
      catalog: {
        totalProducts,
        publishedProducts,
      },
      inventory: {
        totalIngredients,
        lowStockIngredients,
        outOfStockIngredients,
      },
      recentOrders,
      recentInventoryActivity: recentMovements,
    };
  }

  @Get('customers')
  async getCustomers(@Query('search') search?: string) {
    const q = search?.trim().toLowerCase() ?? '';
    const orders = await this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        deliveryCity: true,
        total: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
      },
    });

    const map = new Map<
      string,
      {
        customerKey: string;
        name: string;
        phone: string;
        email: string | null;
        city: string;
        totalOrders: number;
        totalSpent: Prisma.Decimal;
        lastOrderAt: Date;
        orders: typeof orders;
      }
    >();

    for (const o of orders) {
      const key = (o.customerPhone || o.customerEmail || o.customerName).trim().toLowerCase();
      const existing = map.get(key);
      const countsTowardSpend = o.status !== 'CANCELLED' && o.paymentStatus === 'PAID';
      if (!existing) {
        map.set(key, {
          customerKey: key,
          name: o.customerName,
          phone: o.customerPhone,
          email: o.customerEmail,
          city: o.deliveryCity,
          totalOrders: 1,
          totalSpent: countsTowardSpend ? o.total : new Prisma.Decimal(0),
          lastOrderAt: o.createdAt,
          orders: [o],
        });
      } else {
        existing.totalOrders += 1;
        if (countsTowardSpend) {
          existing.totalSpent = existing.totalSpent.add(o.total);
        }
        existing.orders.push(o);
      }
    }

    const list = Array.from(map.values())
      .filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.email ?? '').toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q)
        );
      })
      .map((c) => ({
        ...c,
        totalSpent: c.totalSpent.toFixed(2),
      }));

    return { customers: list };
  }

  @Get('settings')
  async getSettings() {
    const existing = await this.prisma.storeSetting.findUnique({
      where: { id: 'default' },
    });
    if (existing) return existing;
    return this.prisma.storeSetting.create({
      data: { id: 'default' },
    });
  }

  @Patch('settings')
  async updateSettings(
    @Body()
    body: {
      storeName?: string;
      tagline?: string;
      contactPhone?: string;
      contactEmail?: string;
      address?: string;
      city?: string;
      deliveryFee?: number | string;
      freeDeliveryAbove?: number | string | null;
      minOrderAmount?: number | string;
      codEnabled?: boolean;
      onlinePaymentEnabled?: boolean;
    },
  ) {
    await this.getSettings();
    return this.prisma.storeSetting.update({
      where: { id: 'default' },
      data: {
        ...(body.storeName !== undefined ? { storeName: body.storeName.trim() } : {}),
        ...(body.tagline !== undefined ? { tagline: body.tagline.trim() } : {}),
        ...(body.contactPhone !== undefined ? { contactPhone: body.contactPhone.trim() } : {}),
        ...(body.contactEmail !== undefined ? { contactEmail: body.contactEmail.trim() } : {}),
        ...(body.address !== undefined ? { address: body.address.trim() } : {}),
        ...(body.city !== undefined ? { city: body.city.trim() } : {}),
        ...(body.deliveryFee !== undefined
          ? { deliveryFee: new Prisma.Decimal(body.deliveryFee) }
          : {}),
        ...(body.freeDeliveryAbove !== undefined
          ? {
              freeDeliveryAbove:
                body.freeDeliveryAbove === null || body.freeDeliveryAbove === ''
                  ? null
                  : new Prisma.Decimal(body.freeDeliveryAbove),
            }
          : {}),
        ...(body.minOrderAmount !== undefined
          ? { minOrderAmount: new Prisma.Decimal(body.minOrderAmount) }
          : {}),
        ...(body.codEnabled !== undefined ? { codEnabled: Boolean(body.codEnabled) } : {}),
        ...(body.onlinePaymentEnabled !== undefined
          ? { onlinePaymentEnabled: Boolean(body.onlinePaymentEnabled) }
          : {}),
      },
    });
  }
}
