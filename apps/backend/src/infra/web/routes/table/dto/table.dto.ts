import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  MAX_INSTALLMENTS,
  PAYMENT_METHODS,
  TABLE_IDENTIFIER_MAX_LENGTH,
  type PaymentMethod,
} from '@comanda/shared';

export class OpenTableDto {
  @IsString() @MaxLength(TABLE_IDENTIFIER_MAX_LENGTH) identifier!: string;
  @IsOptional() @IsInt() @Min(1) @Max(50) capacity?: number;
  @IsOptional() @IsString() @MaxLength(80) clientName?: string;
}

export class PaymentDto {
  @IsIn([...PAYMENT_METHODS]) method!: PaymentMethod;
  @IsInt() @Min(1) amount!: number;
  @IsOptional() @IsInt() @Min(1) @Max(MAX_INSTALLMENTS) installments?: number;
}

export class CloseTableDto {
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PaymentDto) payments?: PaymentDto[];
}
