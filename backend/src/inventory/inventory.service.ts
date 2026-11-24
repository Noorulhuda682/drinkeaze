import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateIngredientDto } from './dto/create-ingredient.dto.js';
import { UpdateIngredientDto } from './dto/update-ingredient.dto.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';
import { normalizeBaseUnit, toBaseQuantity } from '../recipes/recipe-math.util.js';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private inferBaseUnit(unit: string): 'kg' | 'L' | 'unit' {
    return normalizeBaseUnit(unit);
  }

  async createIngredient(data: CreateIngredientDto & { purchaseCostPerUnit?: number | string; supplierName?: string }) {
    const name = data.name.trim();
    const normalizedName = name.toLowerCase();
    const rawUnit = data.unit.trim();
    const baseUnit = this.inferBaseUnit(rawUnit);

    if (!name || !rawUnit) {
      throw new BadRequestException('Name and unit are required.');
    }

    const initialQty = toBaseQuantity(data.quantity, rawUnit, baseUnit);
    const reorderLevel = toBaseQuantity(data.reorderLevel, rawUnit, baseUnit);
    const purchaseCostPerUnit = new Prisma.Decimal(data.purchaseCostPerUnit ?? 0);

    if (purchaseCostPerUnit.lessThan(0)) {
      throw new BadRequestException('Purchase cost cannot be negative.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.ingredient.create({
          data: {
            name,
            normalizedName,
            description: data.description?.trim() || null,
            purchaseCostPerUnit,
            supplierName: data.supplierName?.trim() || null,
            inventory: {
              create: {
                quantity: initialQty,
                unit: baseUnit,
                reorderLevel,
              },
            },
          },
          include: { inventory: true },
        });

        if (initialQty.greaterThan(0)) {
          await tx.stockMovement.create({
            data: {
              type: StockMovementType.ADJUSTMENT,
              quantity: initialQty,
              previousQuantity: new Prisma.Decimal(0),
              newQuantity: initialQty,
              note: data.description?.trim() || 'Initial stock on ingredient creation',
              reason: 'INITIAL_STOCK',
              ingredientId: created.id,
            },
          });
        }

        return created;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An ingredient with this name already exists.',
        );
      }
      throw error;
    }
  }

  async findAll() {
    const rows = await this.prisma.ingredient.findMany({
      where: { isActive: true },
      include: { inventory: true },
      orderBy: { name: 'asc' },
    });

    return rows.map((item) => {
      const qty = item.inventory?.quantity ?? new Prisma.Decimal(0);
      const reorder = item.inventory?.reorderLevel ?? new Prisma.Decimal(0);
      return {
        ...item,
        isOutOfStock: qty.lte(0),
        isLowStock: qty.lte(reorder),
      };
    });
  }

  async findOne(id: string) {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id, isActive: true },
      include: { inventory: true },
    });

    if (!ingredient || !ingredient.inventory) {
      throw new NotFoundException('Ingredient or inventory not found.');
    }

    return {
      ...ingredient,
      isOutOfStock: ingredient.inventory.quantity.lte(0),
      isLowStock: ingredient.inventory.quantity.lte(ingredient.inventory.reorderLevel),
    };
  }

  async findLowStock() {
    const ingredients = await this.findAll();
    return ingredients.filter((ingredient) => ingredient.isLowStock);
  }

  async updateIngredient(
    id: string,
    data: UpdateIngredientDto & {
      purchaseCostPerUnit?: number | string;
      supplierName?: string;
      reorderLevel?: number | string;
      unit?: string;
    },
  ) {
    const existing = await this.findOne(id);
    if (!existing.inventory) {
      throw new NotFoundException('Ingredient inventory not found.');
    }

    const updateData: Prisma.IngredientUpdateInput = {};

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) {
        throw new BadRequestException('Ingredient name cannot be empty.');
      }
      updateData.name = name;
      updateData.normalizedName = name.toLowerCase();
    }

    if (data.description !== undefined) {
      updateData.description = data.description.trim() || null;
    }

    if (data.supplierName !== undefined) {
      updateData.supplierName = data.supplierName.trim() || null;
    }

    if (data.purchaseCostPerUnit !== undefined) {
      const cost = new Prisma.Decimal(data.purchaseCostPerUnit);
      if (cost.lessThan(0)) {
        throw new BadRequestException('Purchase cost cannot be negative.');
      }
      updateData.purchaseCostPerUnit = cost;
    }

    const baseUnit = existing.inventory.unit;
    const invUpdate: Prisma.InventoryUpdateInput = {};
    if (data.reorderLevel !== undefined) {
      invUpdate.reorderLevel = toBaseQuantity(
        data.reorderLevel,
        data.unit ?? baseUnit,
        baseUnit,
      );
    }

    try {
      return await this.prisma.ingredient.update({
        where: { id },
        data: {
          ...updateData,
          ...(Object.keys(invUpdate).length > 0
            ? { inventory: { update: invUpdate } }
            : {}),
        },
        include: { inventory: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An ingredient with this name already exists.',
        );
      }
      throw error;
    }
  }

  async adjustStock(
    id: string,
    data: AdjustStockDto & { unit?: string; reason?: string; adminId?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "Inventory"
        WHERE "ingredientId" = ${id}
        FOR UPDATE
      `;

      if (lockedRows.length !== 1) {
        throw new NotFoundException('Ingredient inventory not found.');
      }

      const inventory = await tx.inventory.findUnique({
        where: { ingredientId: id },
      });

      if (!inventory) {
        throw new NotFoundException('Ingredient inventory not found.');
      }

      const amount = toBaseQuantity(
        data.quantity,
        data.unit ?? inventory.unit,
        inventory.unit,
      );
      if (amount.lte(0)) {
        throw new BadRequestException('Quantity must be greater than zero.');
      }

      const previousQuantity = inventory.quantity;
      const isAddition =
        data.type === 'IN' ||
        (data.type as string) === 'PURCHASE' ||
        (data.type as string) === 'RESTORATION';

      const newQuantity = isAddition
        ? previousQuantity.plus(amount)
        : previousQuantity.minus(amount);

      if (newQuantity.lessThan(0)) {
        throw new BadRequestException(
          'Insufficient stock. Stock cannot become negative.',
        );
      }

      const updatedInventory = await tx.inventory.update({
        where: { ingredientId: id },
        data: { quantity: newQuantity },
      });

      const movement = await tx.stockMovement.create({
        data: {
          type: data.type,
          quantity: amount,
          previousQuantity,
          newQuantity,
          note: data.note?.trim() || null,
          reason: data.reason?.trim() || data.note?.trim() || data.type,
          adminId: data.adminId ?? null,
          ingredientId: id,
        },
      });

      return {
        inventory: updatedInventory,
        movement,
      };
    });
  }

  async recordPurchase(input: {
    ingredientId: string;
    quantity: number | string;
    unit: string;
    totalCost: number | string;
    supplierName?: string;
    notes?: string;
    purchasedAt?: string;
    adminId?: string;
  }) {
    const qtyInput = new Prisma.Decimal(input.quantity);
    const totalCost = new Prisma.Decimal(input.totalCost);
    if (qtyInput.lte(0)) {
      throw new BadRequestException('Purchase quantity must be greater than zero.');
    }
    if (totalCost.lt(0)) {
      throw new BadRequestException('Purchase cost cannot be negative.');
    }

    return this.prisma.$transaction(async (tx) => {
      const ingredient = await tx.ingredient.findFirst({
        where: { id: input.ingredientId, isActive: true },
        include: { inventory: true },
      });
      if (!ingredient || !ingredient.inventory) {
        throw new NotFoundException('Ingredient or inventory not found.');
      }

      const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Inventory" WHERE "ingredientId" = ${input.ingredientId} FOR UPDATE
      `;
      if (lockedRows.length !== 1) {
        throw new NotFoundException('Ingredient inventory not found.');
      }

      const baseQty = toBaseQuantity(qtyInput, input.unit, ingredient.inventory.unit);
      const unitCostInBase = totalCost.div(baseQty);
      const previousQuantity = ingredient.inventory.quantity;
      const newQuantity = previousQuantity.plus(baseQty);

      const purchase = await tx.ingredientPurchase.create({
        data: {
          ingredientId: ingredient.id,
          enteredQuantity: qtyInput,
          enteredUnit: input.unit.trim(),
          baseQuantity: baseQty,
          totalCost,
          unitCostInBase,
          supplierName: input.supplierName?.trim() || ingredient.supplierName || null,
          notes: input.notes?.trim() || null,
          adminId: input.adminId ?? null,
          purchasedAt: input.purchasedAt ? new Date(input.purchasedAt) : new Date(),
        },
      });

      const updatedInventory = await tx.inventory.update({
        where: { ingredientId: ingredient.id },
        data: { quantity: newQuantity },
      });

      await tx.ingredient.update({
        where: { id: ingredient.id },
        data: {
          purchaseCostPerUnit: unitCostInBase,
          ...(input.supplierName?.trim() ? { supplierName: input.supplierName.trim() } : {}),
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          type: StockMovementType.PURCHASE,
          quantity: baseQty,
          previousQuantity,
          newQuantity,
          note: input.notes?.trim() || `Purchase: ${qtyInput.toString()} ${input.unit}`,
          reason: 'PURCHASE',
          purchaseId: purchase.id,
          adminId: input.adminId ?? null,
          ingredientId: ingredient.id,
        },
      });

      return { purchase, inventory: updatedInventory, movement };
    });
  }

  async getMovementHistory(id: string) {
    await this.findOne(id);

    return this.prisma.stockMovement.findMany({
      where: { ingredientId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
