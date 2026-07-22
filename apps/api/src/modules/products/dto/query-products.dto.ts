import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryProductsDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() brands?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() character?: string;
  @IsOptional() @Type(() => Number) @IsInt() minPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() pieces?: number;
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() isLimitedEdition?: boolean;
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() available?: boolean;
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() featured?: boolean;
  @IsOptional() @IsString() sort?: string;
  @IsOptional() @IsString() need?: string;
  @IsOptional() @IsString() launch?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
