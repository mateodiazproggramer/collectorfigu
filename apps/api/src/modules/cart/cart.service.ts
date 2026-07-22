import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const productInclude = {
  brand: true,
  category: true,
  variants: {
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' as const }, { colorName: 'asc' as const }],
    include: { images: { orderBy: [{ isMain: 'desc' as const }, { sortOrder: 'asc' as const }] } },
  },
  images: { orderBy: [{ isMain: 'desc' as const }, { sortOrder: 'asc' as const }] },
  inventory: true,
};

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async get(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: { coupon: true, items: { include: { variant: { include: { images: true } }, product: { include: productInclude } } } },
    });
  }

  async addItem(userId: string, productId: string, quantity: number, variantId?: string) {
    const cart = await this.get(userId);
    const product = await this.prisma.product.findUnique({ where: { id: productId }, include: { inventory: true, variants: true } });
    if (!product || product.status !== ProductStatus.ACTIVE) throw new NotFoundException('Producto no encontrado');
    const variant = variantId ? product.variants.find((entry) => entry.id === variantId && entry.isActive) : null;
    if (variantId && !variant) throw new NotFoundException('Color no encontrado');

    const existing = await this.prisma.cartItem.findFirst({ where: { cartId: cart.id, productId, variantId: variantId ?? null } });
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    const available = variant ? variant.stock - variant.reserved : (product.inventory?.stock ?? 0) - (product.inventory?.reserved ?? 0);
    if (available < nextQuantity) throw new BadRequestException('No hay inventario suficiente');

    if (existing) return this.prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: { increment: quantity }, unitPrice: product.price } });
    return this.prisma.cartItem.create({ data: { cartId: cart.id, productId, variantId: variantId ?? null, quantity, unitPrice: product.price } });
  }

  async updateItem(userId: string, itemId: string, quantity: number) {
    const item = await this.ensureOwnedItem(userId, itemId);
    const available = item.variant ? item.variant.stock - item.variant.reserved : (item.product.inventory?.stock ?? 0) - (item.product.inventory?.reserved ?? 0);
    if (available < quantity) throw new BadRequestException('No hay inventario suficiente');
    return this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }

  async removeItem(userId: string, itemId: string) {
    await this.ensureOwnedItem(userId, itemId);
    return this.prisma.cartItem.delete({ where: { id: itemId } });
  }

  async applyCoupon(userId: string, code: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon || !coupon.isActive) throw new BadRequestException('Cupon invalido');
    return this.prisma.cart.update({ where: { userId }, data: { couponId: coupon.id }, include: { coupon: true, items: true } });
  }

  async validateGuest(items: { productId: string; variantId?: string; quantity: number }[]) {
    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: productInclude,
    });
    const byId = new Map(products.map((product) => [product.id, product]));

    return {
      items: items.map((item) => {
        const product = byId.get(item.productId);
        const variant = item.variantId ? product?.variants.find((entry) => entry.id === item.variantId && entry.isActive) : null;
        const available = variant ? variant.stock - variant.reserved : product?.inventory ? product.inventory.stock - product.inventory.reserved : 0;
        const isAvailable = Boolean(product && product.status === ProductStatus.ACTIVE && (!item.variantId || variant) && available >= item.quantity);
        return {
          productId: item.productId,
          variantId: item.variantId,
          requestedQuantity: item.quantity,
          availableQuantity: Math.max(available, 0),
          isAvailable,
          variant,
          product,
        };
      }),
    };
  }

  private async ensureOwnedItem(userId: string, itemId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true, variant: true, product: { include: { inventory: true } } },
    });
    if (!item) throw new NotFoundException('Item no encontrado');
    if (item.cart.userId !== userId) throw new ForbiddenException('No puedes modificar este item');
    return item;
  }
}
