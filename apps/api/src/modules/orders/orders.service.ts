import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma, ProductStatus, RoleName } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CheckoutDto, CheckoutItemDto, PublicCheckoutDto } from './dto/checkout.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { createPublicCode } from '../../common/utils/public-code';

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private expirationTimer?: ReturnType<typeof setInterval>;

  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  onModuleInit() {
    if (process.env.DISABLE_ORDER_EXPIRATION_JOB === 'true') return;
    this.expirationTimer = setInterval(() => {
      this.cancelExpiredPendingOrders().catch((error) => console.error('No fue posible cancelar ordenes vencidas', error));
    }, 5 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.expirationTimer) clearInterval(this.expirationTimer);
  }

  async publicCheckout(dto: PublicCheckoutDto) {
    if (!dto.items?.length) throw new BadRequestException('El carrito esta vacio');
    if (dto.paymentMethod !== PaymentMethod.WOMPI && dto.paymentMethod !== PaymentMethod.CASH_ON_DELIVERY) {
      throw new BadRequestException('Metodo de pago no disponible en checkout publico');
    }
    if (dto.paymentMethod === PaymentMethod.CASH_ON_DELIVERY) this.validateCashOnDelivery(dto);
    if (dto.paymentMethod === PaymentMethod.WOMPI) this.assertWompiConfigured();

    const customerRole = await this.prisma.role.upsert({
      where: { name: RoleName.CUSTOMER },
      update: {},
      create: { name: RoleName.CUSTOMER, description: 'Cliente' },
    });
    const user = await this.prisma.user.upsert({
      where: { email: dto.email.toLowerCase() },
      update: { firstName: dto.firstName, lastName: dto.lastName, phone: dto.phone, document: dto.document },
      create: {
        email: dto.email.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        document: dto.document,
        phone: dto.phone,
        roles: { create: [{ roleId: customerRole.id }] },
        customer: { create: { document: dto.document } },
        cart: { create: {} },
      },
    });

    const order = await this.createOrderFromItems(user.id, dto, dto.items, dto.couponCode);
    const wompi = dto.paymentMethod === PaymentMethod.WOMPI ? this.buildWompiCheckout(order, dto) : null;
    await this.notifyOrderCreated(order, wompi?.checkoutUrl);
    return { order, wompi };
  }

  async checkout(userId: string, dto: CheckoutDto) {
    const cart = await this.prisma.cart.findUnique({ where: { userId }, include: { coupon: true, items: { include: { variant: true, product: { include: { inventory: true } } } } } });
    if (!cart || cart.items.length === 0) throw new BadRequestException('El carrito está vacío');

    const order = await this.prisma.$transaction(async (tx) => {
      let subtotal = new Prisma.Decimal(0);
      for (const item of cart.items) {
        const available = item.variant ? item.variant.stock - item.variant.reserved : (item.product.inventory?.stock ?? 0) - (item.product.inventory?.reserved ?? 0);
        if (available < item.quantity) throw new BadRequestException(`Inventario insuficiente para ${item.product.name}`);
        subtotal = subtotal.plus(item.unitPrice.mul(item.quantity));
      }
      const discountTotal = new Prisma.Decimal(0);
      const taxTotal = new Prisma.Decimal(0);
      const shippingTotal = subtotal.greaterThan(500000) ? new Prisma.Decimal(0) : new Prisma.Decimal(12000);
      const grandTotal = subtotal.minus(discountTotal).plus(taxTotal).plus(shippingTotal);

      const customer = await tx.customer.upsert({ where: { userId }, update: { document: dto.document }, create: { userId, document: dto.document } });
      const address = await tx.shippingAddress.create({ data: { customerId: customer.id, firstName: dto.firstName, lastName: dto.lastName, document: dto.document, phone: dto.phone, addressLine1: dto.addressLine1, addressLine2: dto.addressLine2, city: dto.city, department: dto.department } });
      const orderNumber = createPublicCode('ORD');
      const order = await tx.order.create({
        data: {
          orderNumber, userId, shippingAddressId: address.id, couponId: cart.couponId, subtotal, discountTotal, taxTotal, shippingTotal, grandTotal, paymentMethod: dto.paymentMethod, notes: dto.notes,
          status: dto.paymentMethod === PaymentMethod.CASH_ON_DELIVERY ? OrderStatus.PREPARING : OrderStatus.PENDING,
          items: { create: cart.items.map((item) => ({ productId: item.productId, variantId: item.variantId, skuSnapshot: item.variant?.sku ?? item.product.sku, nameSnapshot: item.product.name, variantSnapshot: item.variant?.colorName, quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.unitPrice.mul(item.quantity) })) },
          payments: { create: { method: dto.paymentMethod, status: dto.paymentMethod === PaymentMethod.CASH_ON_DELIVERY ? PaymentStatus.PENDING : PaymentStatus.PENDING, amount: grandTotal, currency: process.env.WOMPI_CURRENCY ?? 'COP', provider: dto.paymentMethod === PaymentMethod.WOMPI ? 'WOMPI' : undefined } },
        },
        include: { items: { include: { variant: { include: { images: { orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] } } }, product: { include: { images: { orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] } } } } }, payments: true, shippingAddress: true, user: true },
      });
      for (const item of cart.items) await this.reserveItem(tx, item.productId, item.quantity, item.variantId ?? undefined);
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return order;
    });
    await this.notifyOrderCreated(order);
    return order;
  }

  private async createOrderFromItems(userId: string, dto: CheckoutDto, items: CheckoutItemDto[], couponCode?: string) {
    return this.prisma.$transaction(async (tx) => {
      const productIds = items.map((item) => item.productId);
      const products = await tx.product.findMany({ where: { id: { in: productIds }, status: ProductStatus.ACTIVE }, include: { inventory: true, variants: true } });
      const productMap = new Map(products.map((product) => [product.id, product]));
      let subtotal = new Prisma.Decimal(0);

      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product) throw new BadRequestException('Uno de los productos ya no esta disponible');
        const variant = item.variantId ? product.variants.find((entry) => entry.id === item.variantId && entry.isActive) : null;
        if (item.variantId && !variant) throw new BadRequestException('Uno de los colores ya no esta disponible');
        const available = variant ? variant.stock - variant.reserved : (product.inventory?.stock ?? 0) - (product.inventory?.reserved ?? 0);
        if (available < item.quantity) throw new BadRequestException(`Inventario insuficiente para ${product.name}`);
        subtotal = subtotal.plus(product.price.mul(item.quantity));
      }

      let discountTotal = new Prisma.Decimal(0);
      let couponId: string | undefined;
      let freeShippingFromCoupon = false;
      if (couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: couponCode.trim().toUpperCase() } });
        if (!coupon) throw new BadRequestException('El cupon ingresado no existe');
        if (!coupon.isActive) throw new BadRequestException('Este cupon ya no esta activo');
        if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) throw new BadRequestException('Este cupon ya vencio');
        if (coupon.startsAt && coupon.startsAt.getTime() > Date.now()) throw new BadRequestException('Este cupon todavia no esta disponible');
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) throw new BadRequestException('Este cupon ya fue utilizado');
        if (coupon.minOrderAmount && subtotal.lessThan(coupon.minOrderAmount)) throw new BadRequestException('El cupon no aplica para este monto de compra');

        if (coupon.type === 'PERCENTAGE') discountTotal = subtotal.mul(coupon.value).div(100);
        if (coupon.type === 'FIXED_AMOUNT') discountTotal = coupon.value.greaterThan(subtotal) ? subtotal : new Prisma.Decimal(coupon.value);
        if (coupon.type === 'FREE_SHIPPING') freeShippingFromCoupon = true;
        couponId = coupon.id;
      }

      const taxTotal = new Prisma.Decimal(0);
      const shippingTotal = freeShippingFromCoupon || subtotal.greaterThan(500000) ? new Prisma.Decimal(0) : new Prisma.Decimal(12000);
      const grandTotal = subtotal.minus(discountTotal).plus(taxTotal).plus(shippingTotal);
      const customer = await tx.customer.upsert({ where: { userId }, update: { document: dto.document }, create: { userId, document: dto.document } });
      const address = await tx.shippingAddress.create({ data: { customerId: customer.id, firstName: dto.firstName, lastName: dto.lastName, document: dto.document, phone: dto.phone, addressLine1: dto.addressLine1, addressLine2: dto.addressLine2, city: dto.city, department: dto.department, notes: dto.notes } });
      const orderNumber = createPublicCode('ORD');
      const order = await tx.order.create({
        data: {
          orderNumber, userId, shippingAddressId: address.id, couponId, subtotal, discountTotal, taxTotal, shippingTotal, grandTotal, paymentMethod: dto.paymentMethod, notes: dto.notes,
          status: dto.paymentMethod === PaymentMethod.CASH_ON_DELIVERY ? OrderStatus.PREPARING : OrderStatus.PENDING,
          items: {
            create: items.map((item) => {
              const product = productMap.get(item.productId)!;
              const variant = item.variantId ? product.variants.find((entry) => entry.id === item.variantId) : null;
              return { productId: product.id, variantId: variant?.id, skuSnapshot: variant?.sku ?? product.sku, nameSnapshot: product.name, variantSnapshot: variant?.colorName, quantity: item.quantity, unitPrice: product.price, totalPrice: product.price.mul(item.quantity) };
            }),
          },
          payments: { create: { method: dto.paymentMethod, status: PaymentStatus.PENDING, amount: grandTotal, currency: process.env.WOMPI_CURRENCY ?? 'COP', provider: dto.paymentMethod === PaymentMethod.WOMPI ? 'WOMPI' : 'CASH_ON_DELIVERY' } },
        },
        include: { items: { include: { variant: { include: { images: { orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] } } }, product: { include: { images: { orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] } } } } }, payments: true, shippingAddress: true, user: true },
      });

      if (couponId) await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
      for (const item of items) await this.reserveItem(tx, item.productId, item.quantity, item.variantId);
      return order;
    });
  }

  private normalizeLocalPhone(phone: string) {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 12 && digits.startsWith('57') ? digits.slice(2) : digits;
  }

  private buildWompiCheckout(order: any, dto: CheckoutDto) {
    const publicKey = process.env.WOMPI_PUBLIC_KEY ?? '';
    const currency = process.env.WOMPI_CURRENCY ?? 'COP';
    const amountInCents = Math.round(Number(order.grandTotal) * 100);
    const reference = order.orderNumber;
    const signature = this.createWompiIntegritySignature(reference, amountInCents, currency);
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const params = new URLSearchParams({
      'public-key': publicKey,
      currency,
      'amount-in-cents': String(amountInCents),
      reference,
      'signature:integrity': signature,
      'redirect-url': `${frontendUrl}/checkout/resultado?reference=${encodeURIComponent(reference)}`,
      'customer-data:email': dto.email,
      'customer-data:full-name': `${dto.firstName} ${dto.lastName}`,
      'customer-data:phone-number': this.normalizeLocalPhone(dto.phone),
      'customer-data:phone-number-prefix': '+57',
      'customer-data:legal-id': dto.document.replace(/\D/g, '') || dto.document,
      'customer-data:legal-id-type': 'CC',
      'shipping-address:address-line-1': dto.addressLine1,
      'shipping-address:country': 'CO',
      'shipping-address:city': dto.city,
      'shipping-address:region': dto.department,
      'shipping-address:phone-number': this.normalizeLocalPhone(dto.phone),
    });
    const addressLine2 = dto.addressLine2?.trim();
    if (addressLine2 && addressLine2.length >= 4) {
      params.set('shipping-address:address-line-2', addressLine2);
    }

    return { checkoutUrl: `https://checkout.wompi.co/p/?${params.toString()}`, reference, amountInCents, currency, signature, publicKey };
  }

  private createWompiIntegritySignature(reference: string, amountInCents: number, currency = 'COP') {
    const integrity = process.env.WOMPI_INTEGRITY_SECRET ?? '';
    if (!integrity || (process.env.NODE_ENV === 'production' && integrity === 'test_integrity_secret')) throw new BadRequestException('Integridad Wompi no configurada');
    return createHash('sha256').update(`${reference}${amountInCents}${currency}${integrity}`).digest('hex');
  }

  private assertWompiConfigured() {
    const publicKey = process.env.WOMPI_PUBLIC_KEY ?? '';
    const integrity = process.env.WOMPI_INTEGRITY_SECRET ?? '';
    if (!publicKey || !publicKey.startsWith('pub_')) throw new BadRequestException('Llave publica Wompi no configurada');
    if (!integrity || (process.env.NODE_ENV === 'production' && integrity === 'test_integrity_secret')) throw new BadRequestException('Integridad Wompi no configurada');
  }

  private validateCashOnDelivery(dto: CheckoutDto) {
    const covered = ['bogota', 'bogotá', 'medellin', 'medellín', 'cali', 'barranquilla', 'cartagena', 'bucaramanga'];
    const city = dto.city.trim().toLowerCase();
    if (!covered.includes(city)) throw new BadRequestException('Pago contraentrega disponible por ahora solo en ciudades principales. Elige Wompi o contactanos por WhatsApp.');
    if (dto.phone.replace(/\D/g, '').length < 10) throw new BadRequestException('Para contraentrega necesitamos un numero de telefono valido para confirmar el pedido.');
  }

  my(userId: string) { return this.prisma.order.findMany({ where: { userId }, include: { items: true, payments: true, shippingAddress: true }, orderBy: { createdAt: 'desc' } }); }
  all() { return this.prisma.order.findMany({ include: { user: true, items: true, payments: true, shippingAddress: true, coupon: true }, orderBy: { createdAt: 'desc' } }); }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { user: true, items: { include: { variant: { include: { images: { orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] } } }, product: { include: { images: { orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] } } } } }, payments: true, shippingAddress: true } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    const updated = await this.prisma.$transaction(async (tx) => {
      if (status === OrderStatus.PAID && order.paymentMethod === PaymentMethod.CASH_ON_DELIVERY) {
        await this.captureCashOnDeliveryPayment(tx, order.id);
      }
      if (status === OrderStatus.CANCELLED) {
        await this.releasePendingReservation(tx, order.id);
      }
      return tx.order.update({ where: { id }, data: { status }, include: { user: true, items: { include: { variant: { include: { images: { orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] } } }, product: { include: { images: { orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] } } } } }, payments: true, shippingAddress: true } });
    });
    if (order.status !== status) await this.notifyOrderStatusChanged(updated, order.status);
    return updated;
  }

  async delete(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, select: { id: true, orderNumber: true, shippingAddressId: true } });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    return this.prisma.$transaction(async (tx) => {
      await this.releasePendingReservation(tx, order.id);
      await tx.order.delete({ where: { id: order.id } });

      const remainingOrdersForAddress = await tx.order.count({ where: { shippingAddressId: order.shippingAddressId } });
      if (remainingOrdersForAddress === 0) {
        await tx.shippingAddress.delete({ where: { id: order.shippingAddressId } }).catch(() => null);
      }

      return { deleted: true, id: order.id, orderNumber: order.orderNumber };
    });
  }

  async cancelExpiredPendingOrders(ttlMinutes = Number(process.env.ORDER_PENDING_TTL_MINUTES ?? 30)) {
    const expiresBefore = new Date(Date.now() - ttlMinutes * 60 * 1000);
    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        paymentMethod: PaymentMethod.WOMPI,
        createdAt: { lt: expiresBefore },
        payments: { some: { status: PaymentStatus.PENDING } },
      },
      select: { id: true, orderNumber: true },
      take: 100,
    });

    for (const order of orders) {
      await this.prisma.$transaction(async (tx) => {
        await this.releasePendingReservation(tx, order.id);
        await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED } });
      });
    }

    return { cancelled: orders.length, ttlMinutes };
  }

  private async captureCashOnDeliveryPayment(tx: Prisma.TransactionClient, orderId: string) {
    const payment = await tx.payment.findFirst({ where: { orderId, method: PaymentMethod.CASH_ON_DELIVERY, status: PaymentStatus.PENDING } });
    if (!payment) return;

    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const item of items) {
      await this.captureItem(tx, item.productId, item.quantity, item.variantId ?? undefined);
    }
    await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.APPROVED, paidAt: new Date() } });
  }

  private async releasePendingReservation(tx: Prisma.TransactionClient, orderId: string) {
    const payment = await tx.payment.findFirst({ where: { orderId, status: PaymentStatus.PENDING } });
    if (!payment) return;

    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const item of items) {
      await this.releaseItem(tx, item.productId, item.quantity, item.variantId ?? undefined);
    }
    await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.VOIDED } });
  }

  private async notifyOrderCreated(order: any, checkoutUrl?: string) {
    try {
      await this.notifications.sendOrderConfirmation(this.toOrderNotification(order, checkoutUrl));
    } catch (error) {
      console.warn(`No fue posible enviar confirmacion del pedido ${order.orderNumber}`, error);
    }
  }

  private async notifyOrderStatusChanged(order: any, previousStatus: OrderStatus) {
    try {
      await this.notifications.sendOrderStatusUpdate(this.toOrderNotification(order), previousStatus);
    } catch (error) {
      console.warn(`No fue posible enviar actualizacion del pedido ${order.orderNumber}`, error);
    }
  }

  private toOrderNotification(order: any, checkoutUrl?: string) {
    return {
      orderNumber: order.orderNumber,
      customerName: `${order.shippingAddress?.firstName ?? order.user?.firstName ?? ''} ${order.shippingAddress?.lastName ?? order.user?.lastName ?? ''}`.trim() || 'Cliente',
      email: order.user?.email,
      phone: order.shippingAddress?.phone ?? order.user?.phone,
      status: order.status,
      paymentMethod: order.paymentMethod,
      subtotal: order.subtotal,
      shippingTotal: order.shippingTotal,
      grandTotal: order.grandTotal,
      address: order.shippingAddress ? {
        addressLine1: order.shippingAddress.addressLine1,
        addressLine2: order.shippingAddress.addressLine2,
        city: order.shippingAddress.city,
        department: order.shippingAddress.department,
      } : null,
      items: (order.items ?? []).map((item: any) => ({
        nameSnapshot: item.nameSnapshot,
        variantSnapshot: item.variantSnapshot,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        imageUrl: item.variant?.images?.[0]?.url ?? item.product?.images?.[0]?.url,
      })),
      checkoutUrl,
    };
  }

  private async reserveItem(tx: Prisma.TransactionClient, productId: string, quantity: number, variantId?: string) {
    if (variantId) {
      await tx.productVariant.update({ where: { id: variantId }, data: { reserved: { increment: quantity } } });
      await tx.inventory.update({ where: { productId }, data: { reserved: { increment: quantity } } });
      return;
    }
    await tx.inventory.update({ where: { productId }, data: { reserved: { increment: quantity } } });
  }

  private async captureItem(tx: Prisma.TransactionClient, productId: string, quantity: number, variantId?: string) {
    if (variantId) {
      await tx.productVariant.update({ where: { id: variantId }, data: { stock: { decrement: quantity }, reserved: { decrement: quantity } } });
      await tx.inventory.update({ where: { productId }, data: { stock: { decrement: quantity }, reserved: { decrement: quantity } } });
      return;
    }
    await tx.inventory.update({ where: { productId }, data: { stock: { decrement: quantity }, reserved: { decrement: quantity } } });
  }

  private async releaseItem(tx: Prisma.TransactionClient, productId: string, quantity: number, variantId?: string) {
    if (variantId) {
      await tx.productVariant.update({ where: { id: variantId }, data: { reserved: { decrement: quantity } } });
      await tx.inventory.update({ where: { productId }, data: { reserved: { decrement: quantity } } });
      return;
    }
    await tx.inventory.update({ where: { productId }, data: { reserved: { decrement: quantity } } });
  }
}
