import { Body, Controller, Get, Header, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SubscribeLeadDto } from './dto/subscribe-lead.dto';
import { MarketingService } from './marketing.service';

@ApiTags('Marketing')
@Controller()
export class MarketingController {
  constructor(private marketing: MarketingService) {}

  @Post('leads/subscribe')
  subscribe(@Body() dto: SubscribeLeadDto) {
    return this.marketing.subscribeLead(dto);
  }

  @Get('coupons/validate/:code')
  validate(@Param('code') code: string, @Query('subtotal') subtotal?: string) {
    return this.marketing.validateCoupon(code, Number(subtotal ?? 0) || 0);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get('leads')
  list() {
    return this.marketing.listLeads();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="collectorfigu-leads.csv"')
  @Get('leads/export.csv')
  exportCsv() {
    return this.marketing.exportLeadsCsv();
  }
}
