import { Injectable } from '@nestjs/common';
import type { OrderStatus } from '@comanda/shared';
import { OrderRepository } from 'src/domain/repositories/order.repository.interface';
import { ProductRepository } from 'src/domain/repositories/product.repository.interface';
import { TableRepository } from 'src/domain/repositories/table.repository.interface';

export interface KitchenOrderView {
  id: string;
  tableIdentifier: string;
  clientName: string | null;
  status: OrderStatus;
  createdAt: Date;
  items: { productName: string; quantity: number; isMeat: boolean; notes: string | null }[];
}

@Injectable()
export class ListKitchenOrdersUsecase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
    private readonly tableRepository: TableRepository,
  ) {}

  async execute(): Promise<KitchenOrderView[]> {
    const orders = await this.orderRepository.findForKitchen();
    const [products, tables] = await Promise.all([
      this.productRepository.findByIds([
        ...new Set(orders.flatMap((o) => o.getItems().map((i) => i.getProductId()))),
      ]),
      this.tableRepository.findAll(),
    ]);
    const productById = new Map(products.map((p) => [p.getId(), p]));
    const tableById = new Map(tables.map((t) => [t.getId(), t]));

    return orders.map((o) => {
      const table = tableById.get(o.getTableId());
      return {
        id: o.getId(),
        tableIdentifier: table?.getIdentifier() ?? '?',
        clientName: table?.getClientName() ?? null,
        status: o.getStatus(),
        createdAt: o.getCreatedAt(),
        items: o.getItems().map((it) => ({
          productName: productById.get(it.getProductId())?.getName() ?? 'Item removido',
          quantity: it.getQuantity(),
          isMeat: it.getWeighed(),
          notes: it.getNotes(),
        })),
      };
    });
  }
}
