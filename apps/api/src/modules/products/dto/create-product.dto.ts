import { ProductStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Matches, Min, ValidateNested } from 'class-validator';

export class ProductVariantDto {
  @IsOptional() @IsString() sku?: string;
  @IsString() @IsNotEmpty() colorName!: string;
  @IsString() @Matches(/^#[0-9a-fA-F]{6}$/) colorHex!: string;
  @IsOptional() @IsInt() @Min(0) stock?: number;
  @IsOptional() @IsInt() @Min(0) reserved?: number;
  @IsOptional() @IsInt() @Min(0) lowStockThreshold?: number;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateProductDto {
  @IsString() @IsNotEmpty() sku!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() brandId!: string;
  @IsString() @IsNotEmpty() categoryId!: string;
  @IsOptional() @IsString() character?: string;
  @IsOptional() @IsString() presentation?: string;
  @IsOptional() @IsInt() @Min(0) pieces?: number;
  @IsOptional() @IsBoolean() isLimitedEdition?: boolean;
  @IsString() description!: string;
  @IsObject() specifications!: Record<string, unknown>;
  @IsNumber() @Min(0) price!: number;
  @IsOptional() @IsNumber() previousPrice?: number;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsInt() stock?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductVariantDto) variants?: ProductVariantDto[];
}

export class UpdateProductVariantDto extends ProductVariantDto {}
