import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}
  async dashboard() {
    const startDay = new Date(); startDay.setHours(0, 0, 0, 0);
    const startMonth = new Date(startDay.getFullYear(), startDay.getMonth(), 1);
    const [salesDay, salesMonth, pendingOrders, lowInventory] = await Promise.all([
      this.prisma.order.aggregate({ where: { status: { in: [OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] }, createdAt: { gte: startDay } }, _sum: { grandTotal: true } }),
      this.prisma.order.aggregate({ where: { status: { in: [OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] }, createdAt: { gte: startMonth } }, _sum: { grandTotal: true } }),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.inventory.count({ where: { stock: { lte: 3 } } }),
    ]);
    return { salesDay: salesDay._sum.grandTotal ?? 0, salesMonth: salesMonth._sum.grandTotal ?? 0, pendingOrders, lowInventory };
  }
}
