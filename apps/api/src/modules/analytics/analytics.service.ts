import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';

const KEY_EVENTS = ['PageView', 'ViewContent', 'AddToCart', 'BuyNowClick', 'InitiateCheckout', 'Purchase'];
const groupCount = (entry: { _count?: unknown }) => Number((entry._count as { _all?: number; id?: number } | undefined)?._all ?? (entry._count as { id?: number } | undefined)?.id ?? 0);

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAnalyticsEventDto, context: { ip?: string; userAgent?: string }) {
    const metadata = dto.metadata ? this.sanitizeMetadata(dto.metadata) : undefined;
    await this.prisma.analyticsEvent.create({
      data: {
        event: dto.event.trim().slice(0, 80),
        path: dto.path?.trim().slice(0, 500) || null,
        productId: dto.productId?.trim().slice(0, 120) || null,
        sessionId: dto.sessionId?.trim().slice(0, 120) || null,
        metadata: metadata as Prisma.InputJsonValue | undefined,
        ip: context.ip,
        userAgent: context.userAgent,
      },
    });
    return { ok: true };
  }

  async summary(days = 30) {
    const safeDays = Math.min(Math.max(Number(days) || 30, 1), 120);
    const since = new Date();
    since.setDate(since.getDate() - safeDays);

    const [total, byEvent, recent, topProducts] = await this.prisma.$transaction([
      this.prisma.analyticsEvent.count({ where: { createdAt: { gte: since } } }),
      this.prisma.analyticsEvent.groupBy({
        by: ['event'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { id: true, event: true, path: true, productId: true, metadata: true, createdAt: true },
      }),
      this.prisma.analyticsEvent.groupBy({
        by: ['productId'],
        where: { createdAt: { gte: since }, productId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    const productIds = topProducts.map((entry) => entry.productId).filter((id): id is string => Boolean(id));
    const products = productIds.length
      ? await this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, slug: true } })
      : [];
    const productById = new Map(products.map((product) => [product.id, product]));
    const eventMap = new Map(byEvent.map((entry) => [entry.event, groupCount(entry)]));

    return {
      days: safeDays,
      total,
      byEvent: byEvent.map((entry) => ({ event: entry.event, count: groupCount(entry) })),
      keyEvents: KEY_EVENTS.map((event) => ({ event, count: eventMap.get(event) ?? 0 })),
      topProducts: topProducts.map((entry) => ({
        productId: entry.productId,
        count: groupCount(entry),
        product: entry.productId ? productById.get(entry.productId) ?? null : null,
      })),
      recent,
    };
  }

  private sanitizeMetadata(metadata: Record<string, unknown>) {
    const serialized = JSON.stringify(metadata);
    if (serialized.length <= 5000) return metadata;
    return { truncated: true };
  }
}
