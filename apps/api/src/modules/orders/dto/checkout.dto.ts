import { OrderStatus, PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class CheckoutItemDto {
  @IsString() @IsNotEmpty() productId!: string;
  @IsOptional() @IsString() variantId?: string;
  @IsInt() @Min(1) @Max(10) quantity!: number;
}

export class CheckoutDto {
  @IsString() @IsNotEmpty() @MaxLength(80) firstName!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) lastName!: string;
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @IsNotEmpty() @MaxLength(30) document!: string;
  @IsString() @IsNotEmpty() @MaxLength(30) @Matches(/^(\+?57)?3\d{9}$/, { message: 'Ingresa un numero de telefono colombiano valido' }) phone!: string;
  @IsString() @IsNotEmpty() @MinLength(4, { message: 'La direccion debe tener al menos 4 caracteres' }) @MaxLength(160) addressLine1!: string;
  @IsOptional() @IsString() @MaxLength(160) addressLine2?: string;
  @IsString() @IsNotEmpty() @MaxLength(80) city!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) department!: string;
  @IsEnum(PaymentMethod) paymentMethod!: PaymentMethod;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class PublicCheckoutDto extends CheckoutDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  @IsOptional() @IsString() @MaxLength(40) couponCode?: string;
}

export class UpdateOrderStatusDto { @IsEnum(OrderStatus) status!: OrderStatus; }
