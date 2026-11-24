import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRecipeIngredientDto } from './dto/create-recipe-ingredient.dto.js';
import { UpdateRecipeIngredientDto } from './dto/update-recipe-ingredient.dto.js';
import { calculateVariantRecipeMetrics, toBaseQuantity } from './recipe-math.util.js';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  private async validateVariant(variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        product: { isActive: true },
      },
      select: { id: true, price: true },
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found or inactive.');
    }

    return variant;
  }

  async addIngredient(
    variantId: string,
    data: CreateRecipeIngredientDto & { unit?: string },
  ) {
    await this.validateVariant(variantId);

    const ingredient = await this.prisma.ingredient.findFirst({
      where: {
        id: data.ingredientId,
        isActive: true,
      },
      include: { inventory: true },
    });

    if (!ingredient || !ingredient.inventory) {
      throw new NotFoundException(
        'Active ingredient or its inventory was not found.',
      );
    }

    const enteredUnit = (data.unit ?? ingredient.inventory.unit).trim();
    const normalizedQty = toBaseQuantity(
      data.quantity,
      enteredUnit,
      ingredient.inventory.unit,
    );

    try {
      return await this.prisma.productIngredient.create({
        data: {
          variantId,
          ingredientId: data.ingredientId,
          quantity: normalizedQty,
          enteredQuantity: new Prisma.Decimal(data.quantity),
          enteredUnit,
        },
        include: {
          ingredient: {
            include: { inventory: true },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This ingredient already exists in the product recipe.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new NotFoundException(
          'Product variant or ingredient was not found.',
        );
      }

      throw error;
    }
  }

  async getRecipe(variantId: string) {
    const variant = await this.validateVariant(variantId);

    const items = await this.prisma.productIngredient.findMany({
      where: { variantId },
      include: {
        ingredient: {
          include: { inventory: true },
        },
      },
      orderBy: { ingredient: { name: 'asc' } },
    });

    const costing = calculateVariantRecipeMetrics(
      items.map((row) => ({
        ingredientId: row.ingredientId,
        ingredientName: row.ingredient.name,
        baseUnit: row.ingredient.inventory?.unit ?? 'kg',
        enteredQuantity: row.enteredQuantity,
        enteredUnit: row.enteredUnit,
        baseQuantity: row.quantity,
        purchaseCostPerUnit: row.ingredient.purchaseCostPerUnit,
        availableStock: row.ingredient.inventory?.quantity ?? new Prisma.Decimal(0),
        reorderLevel: row.ingredient.inventory?.reorderLevel ?? new Prisma.Decimal(0),
      })),
      variant.price,
    );

    return {
      items,
      costing,
    };
  }

  async updateIngredient(
    variantId: string,
    ingredientId: string,
    data: UpdateRecipeIngredientDto & { unit?: string },
  ) {
    await this.validateVariant(variantId);

    const recipeIngredient = await this.prisma.productIngredient.findUnique({
      where: {
        variantId_ingredientId: {
          variantId,
          ingredientId,
        },
      },
      include: {
        ingredient: { include: { inventory: true } },
      },
    });

    if (!recipeIngredient || !recipeIngredient.ingredient.inventory) {
      throw new NotFoundException(
        'Ingredient was not found in this product recipe.',
      );
    }

    const enteredUnit = (data.unit ?? recipeIngredient.enteredUnit ?? recipeIngredient.ingredient.inventory.unit).trim();
    const normalizedQty = toBaseQuantity(
      data.quantity,
      enteredUnit,
      recipeIngredient.ingredient.inventory.unit,
    );

    return this.prisma.productIngredient.update({
      where: { id: recipeIngredient.id },
      data: {
        quantity: normalizedQty,
        enteredQuantity: new Prisma.Decimal(data.quantity),
        enteredUnit,
      },
      include: {
        ingredient: {
          include: { inventory: true },
        },
      },
    });
  }

  async removeIngredient(variantId: string, ingredientId: string) {
    await this.validateVariant(variantId);

    const recipeIngredient = await this.prisma.productIngredient.findUnique({
      where: {
        variantId_ingredientId: {
          variantId,
          ingredientId,
        },
      },
    });

    if (!recipeIngredient) {
      throw new NotFoundException(
        'Ingredient was not found in this product recipe.',
      );
    }

    await this.prisma.productIngredient.delete({
      where: { id: recipeIngredient.id },
    });

    return {
      message: 'Ingredient removed from product recipe successfully.',
    };
  }
}
