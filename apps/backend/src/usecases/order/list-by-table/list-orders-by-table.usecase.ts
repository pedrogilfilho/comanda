import { Injectable } from '@nestjs/common';
import { serviceFee, type OrderStatus } from '@comanda/shared';
import { OrderRepository } from 'src/domain/repositories/order.repository.interface';
import { ProductRepository } from 'src/domain/repositories/product.repository.interface';

export interface OrderItemView {
  id: string;
  productId: string;
  productName: string;
  isMeat: boolean;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes: string | null;
}

export interface OrderView {
  id: string;
  status: OrderStatus;
  createdAt: Date;
  items: OrderItemView[];
  subtotal: number;
}

export interface TableAccountView {
  orders: OrderView[];
  subtotal: number;
  serviceFee: number;
  total: number;
}

@Injectable()
export class ListOrdersByTableUsecase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(tableId: string): Promise<TableAccountView> {
    const orders = await this.orderRepository.findActiveByTableId(tableId);
    const products = await this.productRepository.findByIds([
      ...new Set(orders.flatMap((o) => o.getItems().map((i) => i.getProductId()))),
    ]);
    const productById = new Map(products.map((p) => [p.getId(), p]));

    const orderViews: OrderView[] = orders.map((o) => ({
      id: o.getId(),
      status: o.getStatus(),
      createdAt: o.getCreatedAt(),
      subtotal: o.getTotalAmount(),
      items: o.getItems().map((it) => ({
        id: it.getId(),
        productId: it.getProductId(),
        productName: productById.get(it.getProductId())?.getName() ?? 'Item removido',
        isMeat: it.getWeighed(),
        quantity: it.getQuantity(),
        unitPrice: it.getUnitPrice(),
        subtotal: it.getSubtotal(),
        notes: it.getNotes(),
      })),
    }));

    const subtotal = orderViews.reduce((sum, o) => sum + o.subtotal, 0);
    const fee = serviceFee(subtotal);
    return { orders: orderViews, subtotal, serviceFee: fee, total: subtotal + fee };
  }
}
