import { IsInt, IsString, Min } from 'class-validator';
export class WompiSignatureDto { @IsString() reference!: string; @IsInt() @Min(1) amountInCents!: number; @IsString() currency!: string; }
