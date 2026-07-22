import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AddCartItemDto, ApplyCouponDto, UpdateCartItemDto, ValidateGuestCartDto } from './dto/cart-item.dto';
import { CartService } from './cart.service';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private cart: CartService) {}

  @Post('guest/validate') validateGuest(@Body() dto: ValidateGuestCartDto) { return this.cart.validateGuest(dto.items); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get() get(@CurrentUser() user: any) { return this.cart.get(user.id); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('items') add(@CurrentUser() user: any, @Body() dto: AddCartItemDto) { return this.cart.addItem(user.id, dto.productId, dto.quantity, dto.variantId); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('items/:id') update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateCartItemDto) { return this.cart.updateItem(user.id, id, dto.quantity); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('items/:id') remove(@CurrentUser() user: any, @Param('id') id: string) { return this.cart.removeItem(user.id, id); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('coupon') coupon(@CurrentUser() user: any, @Body() dto: ApplyCouponDto) { return this.cart.applyCoupon(user.id, dto.code); }
}
