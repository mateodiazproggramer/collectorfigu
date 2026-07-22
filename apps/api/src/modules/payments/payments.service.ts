import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  createWompiIntegritySignature(reference: string, amountInCents: number, currency = 'COP') {
    const integrity = process.env.WOMPI_INTEGRITY_SECRET ?? '';
    if (!integrity || (process.env.NODE_ENV === 'production' && integrity === 'test_integrity_secret')) throw new BadRequestException('Integridad Wompi no configurada');
    if (!reference || amountInCents <= 0 || currency !== 'COP') throw new BadRequestException('Datos de firma Wompi invalidos');
    return createHash('sha256').update(`${reference}${amountInCents}${currency}${integrity}`).digest('hex');
  }

  async handleWompiWebhook(payload: any, headerChecksum?: string) {
    if (!this.isValidWompiEvent(payload, headerChecksum)) throw new BadRequestException('Firma de evento Wompi inválida');
    const tx = payload?.data?.transaction;
    const reference = tx?.reference as string | undefined;
    const status = tx?.status as string | undefined;
    if (!reference) return { ok: true, ignored: true };

    const paymentStatus = status === 'APPROVED' ? PaymentStatus.APPROVED : status === 'DECLINED' ? PaymentStatus.DECLINED : status === 'VOIDED' ? PaymentStatus.VOIDED : status === 'ERROR' ? PaymentStatus.ERROR : PaymentStatus.PENDING;
    const payment = await this.prisma.payment.findFirst({ where: { order: { orderNumber: reference } }, include: { order: true } });
    if (!payment) return { ok: true, ignored: true };
    if (payment.status !== PaymentStatus.PENDING) return { ok: true, duplicate: true };

    const txAmount = Number(tx?.amount_in_cents ?? tx?.amountInCents ?? 0);
    const expectedAmount = Math.round(Number(payment.amount) * 100);
    if (!Number.isFinite(txAmount) || txAmount <= 0 || txAmount !== expectedAmount) throw new BadRequestException('Monto Wompi no coincide con el pedido');
    const txCurrency = tx?.currency as string | undefined;
    if (txCurrency && txCurrency !== payment.currency) throw new BadRequestException('Moneda Wompi no coincide con el pedido');

    await this.prisma.$transaction(async (db) => {
      await db.payment.update({ where: { id: payment.id }, data: { status: paymentStatus, providerRef: tx.id, providerPayload: payload, paidAt: paymentStatus === PaymentStatus.APPROVED ? new Date() : undefined } });
      if (paymentStatus === PaymentStatus.APPROVED) await this.markOrderPaid(db, payment.orderId);
      if (paymentStatus === PaymentStatus.DECLINED || paymentStatus === PaymentStatus.VOIDED || paymentStatus === PaymentStatus.ERROR) await this.cancelOrderAndReleaseStock(db, payment.orderId);
    });
    return { ok: true };
  }

  private async markOrderPaid(db: Prisma.TransactionClient, orderId: string) {
    await db.order.update({ where: { id: orderId }, data: { status: OrderStatus.PAID } });
    const items = await db.orderItem.findMany({ where: { orderId } });
    for (const item of items) {
      if (item.variantId) {
        await db.productVariant.update({ where: { id: item.variantId }, data: { stock: { decrement: item.quantity }, reserved: { decrement: item.quantity } } });
      }
      await db.inventory.update({ where: { productId: item.productId }, data: { stock: { decrement: item.quantity }, reserved: { decrement: item.quantity } } });
    }
  }

  private async cancelOrderAndReleaseStock(db: Prisma.TransactionClient, orderId: string) {
    await db.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED } });
    const items = await db.orderItem.findMany({ where: { orderId } });
    for (const item of items) {
      if (item.variantId) {
        await db.productVariant.update({ where: { id: item.variantId }, data: { reserved: { decrement: item.quantity } } });
      }
      await db.inventory.update({ where: { productId: item.productId }, data: { reserved: { decrement: item.quantity } } });
    }
  }

  private isValidWompiEvent(payload: any, headerChecksum?: string) {
    const secret = process.env.WOMPI_EVENTS_SECRET ?? '';
    const checksum = headerChecksum ?? payload?.signature?.checksum;
    const props: string[] = payload?.signature?.properties ?? [];
    if (!secret || !checksum || props.length === 0) return false;
    const data = props.map((path) => this.resolvePath(payload.data, path)).join('') + (payload?.timestamp ?? '') + secret;
    const expected = createHash('sha256').update(data).digest('hex');
    return this.safeCompare(expected, checksum);
  }

  private resolvePath(obj: any, path: string) {
    return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? '';
  }

  private safeCompare(a: string, b: string) {
    const aa = Buffer.from(a);
    const bb = Buffer.from(b);
    return aa.length === bb.length && timingSafeEqual(aa, bb);
  }
}
