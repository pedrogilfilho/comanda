import type { OrderStatus } from '@comanda/shared';
import { Order } from '../entities/order/order.entity';

export abstract class OrderRepository {
  abstract create(order: Order): Promise<void>;
  abstract findById(id: string): Promise<Order | null>;
  abstract findActiveByTableId(tableId: string): Promise<Order[]>; // pedidos que ainda contam na conta
  abstract findAllActive(): Promise<Order[]>;
  abstract findForKitchen(): Promise<Order[]>; // PENDING, PREPARING, READY
  abstract findByClosedAccountIds(ids: string[]): Promise<Order[]>; // pedidos de contas fechadas (histórico e relatórios)
  abstract countByUserId(userId: string): Promise<number>;
  abstract update(order: Order): Promise<void>;
  // Grava a mudança de um item (nova quantidade ou removido) e o total/status do pedido, só se
  // o pedido e o item ainda estiverem como foram lidos; false se outra pessoa mexeu antes
  abstract changeItem(
    order: Order,
    expected: { status: OrderStatus; itemId: string; quantity: number },
  ): Promise<boolean>;
  abstract closeByTableId(tableId: string, closedAccountId: string): Promise<void>;
}
