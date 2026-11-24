import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { Prisma } from '@prisma/client';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductDto) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: data.categoryId,
        isActive: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    const existingProduct = await this.prisma.product.findFirst({
      where: {
        OR: [{ name: data.name }, { slug: data.slug }],
      },
    });

    if (existingProduct) {
      throw new ConflictException(
        'A product with this name, slug, or catalog ID already exists.',
      );
    }

    const defaultVariants = data.variants.filter(
      (variant) => variant.isDefault === true,
    );

    if (defaultVariants.length > 1) {
      throw new ConflictException(
        'Only one variant can be the default variant.',
      );
    }

    const skus = data.variants
      .map((variant) => variant.sku)
      .filter((sku): sku is string => Boolean(sku));

    const duplicateSku = await this.prisma.productVariant.findFirst({
      where: {
        sku: {
          in: skus,
        },
      },
    });

    if (duplicateSku) {
      throw new ConflictException('One or more SKUs are already in use.');
    }

    try {
      return this.prisma.product.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          imageUrl: data.imageUrl,
          bvid: data.bvid,
          categoryId: data.categoryId,
          variants: {
            create: data.variants.map((variant, index) => ({
              name: variant.name,
              sku: variant.sku,
              price: variant.price,
              compareAtPrice: variant.compareAtPrice,
              isDefault: variant.isDefault ?? index === 0,
            })),
          },
        },
        include: {
          category: true,
          variants: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A product name, slug, or SKU already exists.',
        );
      }

      throw error;
    }
  }

  async findAll() {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        category: {
          isActive: true,
        },
      },
      include: {
        category: true,
        variants: {
          where: {
            isAvailable: true,
          },
          orderBy: {
            price: 'asc',
          },
          include: {
            recipe: {
              include: {
                ingredient: {
                  select: {
                    isActive: true,
                    inventory: { select: { quantity: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }).then((products) =>
      products.map((product) => ({
        ...product,
        variants: product.variants.map(({ recipe, ...variant }) => ({
          ...variant,
          isOrderable:
            recipe.length > 0 &&
            recipe.every(
              (entry) =>
                entry.ingredient.isActive &&
                entry.ingredient.inventory !== null &&
                entry.ingredient.inventory.quantity.gte(entry.quantity),
            ),
        })),
      })),
    );
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        isActive: true,
        category: {
          isActive: true,
        },
      },
      include: {
        category: true,
        variants: {
          where: {
            isAvailable: true,
          },
          orderBy: {
            price: 'asc',
          },
          include: {
            recipe: {
              include: {
                ingredient: {
                  select: {
                    isActive: true,
                    inventory: { select: { quantity: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    return {
      ...product,
      variants: product.variants.map(({ recipe, ...variant }) => ({
        ...variant,
        isOrderable:
          recipe.length > 0 &&
          recipe.every(
            (entry) =>
              entry.ingredient.isActive &&
              entry.ingredient.inventory !== null &&
              entry.ingredient.inventory.quantity.gte(entry.quantity),
          ),
      })),
    };
  }

  async update(id: string, data: UpdateProductDto) {
    await this.findOne(id);

    if (data.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: data.categoryId,
          isActive: true,
        },
      });

      if (!category) {
        throw new NotFoundException('Category not found.');
      }
    }

    const existingProduct = await this.prisma.product.findFirst({
      where: {
        id: { not: id },
        OR: [
          ...(data.name ? [{ name: data.name }] : []),
          ...(data.slug ? [{ slug: data.slug }] : []),
          ...(data.bvid ? [{ bvid: data.bvid }] : []),
        ],
      },
    });

    if (existingProduct) {
      throw new ConflictException(
        'Another product already uses this name, slug, or catalog ID.',
      );
    }

    try {
      return await this.prisma.product.update({
        where: { id },
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          imageUrl: data.imageUrl,
          categoryId: data.categoryId,
          ...(data.bvid !== undefined ? { bvid: data.bvid } : {}),
        },
        include: {
          category: true,
          variants: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A product with this name, slug, or catalog ID already exists.',
        );
      }

      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }
}
