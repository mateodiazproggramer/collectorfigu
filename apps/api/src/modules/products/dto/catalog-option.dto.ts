import { IsNotEmpty, IsString } from 'class-validator';

export class CatalogOptionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
