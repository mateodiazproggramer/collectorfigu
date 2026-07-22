import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async publicForProduct(productId: string) {
    await this.ensurePublicProduct(productId);
    const [reviews, aggregate] = await this.prisma.$transaction([
      this.prisma.productReview.findMany({
        where: { productId, status: ReviewStatus.APPROVED },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          name: true,
          city: true,
          rating: true,
          title: true,
          comment: true,
          createdAt: true,
        },
      }),
      this.prisma.productReview.aggregate({
        where: { productId, status: ReviewStatus.APPROVED },
        _avg: { rating: true },
        _count: { id: true },
      }),
    ]);
    return {
      summary: {
        count: aggregate._count.id,
        average: Number((aggregate._avg.rating ?? 0).toFixed(1)),
      },
      reviews,
    };
  }

  async create(productId: string, dto: CreateReviewDto, context: { ip?: string; userAgent?: string }) {
    await this.ensurePublicProduct(productId);
    return this.prisma.productReview.create({
      data: {
        productId,
        name: dto.name.trim(),
        city: dto.city?.trim() || null,
        rating: dto.rating,
        title: dto.title?.trim() || null,
        comment: dto.comment.trim(),
        ip: context.ip,
        userAgent: context.userAgent,
      },
      select: { id: true, status: true, createdAt: true },
    });
  }

  async adminList(status?: ReviewStatus) {
    const where: Prisma.ProductReviewWhereInput = status ? { status } : {};
    const [items, summary] = await this.prisma.$transaction([
      this.prisma.productReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { product: { select: { id: true, name: true, slug: true, sku: true } } },
      }),
      this.prisma.productReview.groupBy({ by: ['status'], _count: { _all: true }, orderBy: { status: 'asc' } }),
    ]);
    return { items, summary };
  }

  async updateStatus(id: string, status: ReviewStatus) {
    const review = await this.prisma.productReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Resena no encontrada');
    return this.prisma.productReview.update({
      where: { id },
      data: {
        status,
        approvedAt: status === ReviewStatus.APPROVED ? new Date() : null,
      },
      include: { product: { select: { id: true, name: true, slug: true, sku: true } } },
    });
  }

  async delete(id: string) {
    const review = await this.prisma.productReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Resena no encontrada');
    await this.prisma.productReview.delete({ where: { id } });
    return { ok: true };
  }

  private async ensurePublicProduct(productId: string) {
    if (!productId) throw new BadRequestException('Producto requerido');
    const product = await this.prisma.product.findFirst({ where: { id: productId, status: ProductStatus.ACTIVE }, select: { id: true } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }
}
