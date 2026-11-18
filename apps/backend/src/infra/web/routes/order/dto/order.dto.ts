import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ORDER_NOTE_MAX_LENGTH, type OrderStatus } from '@comanda/shared';

export class OrderItemDto {
  @IsUUID() productId!: string;
  @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsString() @MaxLength(ORDER_NOTE_MAX_LENGTH) notes?: string;
}

export class CreateOrderDto {
  @IsUUID() tableId!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}

// A cozinha avança o pedido; cancelar é PATCH com status CANCELLED e passa pelo RolesGuard do controller
export class UpdateOrderStatusDto {
  @IsIn(['PREPARING', 'READY', 'DELIVERED', 'CANCELLED']) status!: Exclude<OrderStatus, 'PENDING' | 'CLOSED'>;
  @IsOptional() @IsString() @MaxLength(120) reason?: string;
}
