import { Injectable } from '@nestjs/common';
import { CouponType } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscribeLeadDto } from './dto/subscribe-lead.dto';

const WELCOME_DISCOUNT_PERCENT = 5;
const WELCOME_COUPON_VALID_DAYS = 30;

function generateCouponSuffix() {
  return randomBytes(4).toString('base64url').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6);
}

@Injectable()
export class MarketingService {
  constructor(private prisma: PrismaService) {}

  async subscribeLead(dto: SubscribeLeadDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.marketingLead.findUnique({ where: { email }, include: { coupon: true } });
    if (existing) {
      if (existing.couponCode) {
        return {
          email: existing.email,
          couponCode: existing.couponCode,
          discountPercent: WELCOME_DISCOUNT_PERCENT,
          alreadySubscribed: true,
          couponAvailable: existing.coupon ? existing.coupon.isActive && existing.coupon.usedCount < (existing.coupon.maxUses ?? 1) : false,
        };
      }
      const coupon = await this.issueWelcomeCoupon();
      const updated = await this.prisma.marketingLead.update({
        where: { id: existing.id },
        data: { phone: dto.phone, name: dto.name ?? existing.name, couponCode: coupon.code, couponId: coupon.id, marketingConsent: dto.marketingConsent ?? existing.marketingConsent },
      });
      return { email: updated.email, couponCode: coupon.code, discountPercent: WELCOME_DISCOUNT_PERCENT, alreadySubscribed: true, couponAvailable: true };
    }

    const coupon = await this.issueWelcomeCoupon();
    const lead = await this.prisma.marketingLead.create({
      data: {
        email,
        phone: dto.phone,
        name: dto.name,
        source: dto.source ?? 'productos_popup',
        marketingConsent: dto.marketingConsent ?? true,
        couponCode: coupon.code,
        couponId: coupon.id,
      },
    });
    return { email: lead.email, couponCode: coupon.code, discountPercent: WELCOME_DISCOUNT_PERCENT, alreadySubscribed: false, couponAvailable: true };
  }

  private async issueWelcomeCoupon() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `BIENVENIDA-${generateCouponSuffix()}`;
      try {
        return await this.prisma.coupon.create({
          data: {
            code,
            type: CouponType.PERCENTAGE,
            value: WELCOME_DISCOUNT_PERCENT,
            maxUses: 1,
            isActive: true,
            expiresAt: new Date(Date.now() + WELCOME_COUPON_VALID_DAYS * 24 * 60 * 60 * 1000),
          },
        });
      } catch {
        continue;
      }
    }
    throw new Error('No fue posible generar un cupon unico');
  }

  async validateCoupon(rawCode: string, subtotal: number) {
    const code = rawCode.trim().toUpperCase();
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon) return { valid: false, message: 'Cupon no encontrado' };
    if (!coupon.isActive) return { valid: false, message: 'Este cupon ya no esta activo' };
    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) return { valid: false, message: 'Este cupon ya vencio' };
    if (coupon.startsAt && coupon.startsAt.getTime() > Date.now()) return { valid: false, message: 'Este cupon todavia no esta disponible' };
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return { valid: false, message: 'Este cupon ya fue utilizado' };
    if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
      return { valid: false, message: `Este cupon aplica desde compras de ${coupon.minOrderAmount}` };
    }

    let discount = 0;
    if (coupon.type === CouponType.PERCENTAGE) discount = Math.round((subtotal * Number(coupon.value)) / 100);
    if (coupon.type === CouponType.FIXED_AMOUNT) discount = Math.min(Number(coupon.value), subtotal);
    if (coupon.type === CouponType.FREE_SHIPPING) discount = 0;

    return {
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: Number(coupon.value),
      discount,
      freeShipping: coupon.type === CouponType.FREE_SHIPPING,
    };
  }

  listLeads() {
    return this.prisma.marketingLead.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async exportLeadsCsv() {
    const leads = await this.listLeads();
    const header = 'email,telefono,nombre,consentimiento_marketing,origen,codigo_cupon,fecha_registro';
    const rows = leads.map((lead) => [
      lead.email,
      lead.phone,
      lead.name ?? '',
      lead.marketingConsent ? 'si' : 'no',
      lead.source ?? '',
      lead.couponCode ?? '',
      lead.createdAt.toISOString(),
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));
    return [header, ...rows].join('\n');
  }
}
