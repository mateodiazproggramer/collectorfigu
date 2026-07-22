import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
export class AddCartItemDto { @IsString() productId!: string; @IsOptional() @IsString() variantId?: string; @IsInt() @Min(1) quantity!: number; }
export class UpdateCartItemDto { @IsInt() @Min(1) quantity!: number; }
export class ApplyCouponDto { @IsString() code!: string; }
export class GuestCartItemDto { @IsString() productId!: string; @IsOptional() @IsString() variantId?: string; @Type(() => Number) @IsInt() @Min(1) @Max(10) quantity!: number; }
export class ValidateGuestCartDto { @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => GuestCartItemDto) items!: GuestCartItemDto[]; }
