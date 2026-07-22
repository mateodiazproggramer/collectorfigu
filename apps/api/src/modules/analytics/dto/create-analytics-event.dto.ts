import { IsObject, IsOptional, IsString, Length } from 'class-validator';

export class CreateAnalyticsEventDto {
  @IsString()
  @Length(2, 80)
  event!: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  path?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  productId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  sessionId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
