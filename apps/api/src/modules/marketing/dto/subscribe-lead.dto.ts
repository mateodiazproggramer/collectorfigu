import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class SubscribeLeadDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MaxLength(30) @Matches(/^(\+?57)?3\d{9}$/, { message: 'Ingresa un numero de telefono colombiano valido' }) phone!: string;
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(60) source?: string;
  @IsOptional() @IsBoolean() marketingConsent?: boolean;
}
