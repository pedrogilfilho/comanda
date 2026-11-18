import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PRODUCT_CATEGORIES, STOCK_NOTE_MAX_LENGTH, type ProductCategory } from '@comanda/shared';

export class CreateProductDto {
  @IsString() @MaxLength(80) name!: string;
  @IsOptional() @IsString() @MaxLength(200) description?: string;
  @IsIn([...PRODUCT_CATEGORIES]) category!: ProductCategory;
  @IsOptional() @IsInt() @Min(1) price?: number; // centavos por unidade
  @IsOptional() @IsInt() @Min(1) pricePerKg?: number; // centavos por kg
  @IsOptional() @IsInt() @Min(1) minGrams?: number;
  @IsOptional() @IsInt() @Min(0) stock?: number; // unidades, ou gramas para carne
}

export class UpdateProductDto {
  @IsString() @MaxLength(80) name!: string;
  @IsOptional() @IsString() @MaxLength(200) description?: string;
  @IsIn([...PRODUCT_CATEGORIES]) category!: ProductCategory;
  @IsOptional() @IsInt() @Min(1) price?: number; // centavos por unidade
  @IsOptional() @IsInt() @Min(1) pricePerKg?: number; // centavos por kg
  @IsOptional() @IsInt() @Min(1) minGrams?: number;
}

export class AdjustStockDto {
  @IsInt() @Min(0) stock!: number; // novo valor absoluto
  @IsIn(['ENTRADA', 'SAIDA', 'CONTAGEM']) type!: 'ENTRADA' | 'SAIDA' | 'CONTAGEM';
  @IsOptional() @IsString() @MaxLength(STOCK_NOTE_MAX_LENGTH) reason?: string;
}
