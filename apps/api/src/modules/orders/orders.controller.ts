import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrderStatus, RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CheckoutDto, PublicCheckoutDto, UpdateOrderStatusDto } from './dto/checkout.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Post('public/checkout') publicCheckout(@Body() dto: PublicCheckoutDto) { return this.orders.publicCheckout(dto); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('checkout') checkout(@CurrentUser() user: any, @Body() dto: CheckoutDto) { return this.orders.checkout(user.id, dto); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my') my(@CurrentUser() user: any) { return this.orders.my(user.id); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(RoleName.ADMIN) @Get() all() { return this.orders.all(); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(RoleName.ADMIN) @Patch(':id/status') update(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) { return this.orders.updateStatus(id, dto.status as OrderStatus); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(RoleName.ADMIN) @Delete(':id') delete(@Param('id') id: string) { return this.orders.delete(id); }
}
