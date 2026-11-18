import { Injectable } from '@nestjs/common';
import { serviceFee, type TableStatus } from '@comanda/shared';
import { TableRepository } from 'src/domain/repositories/table.repository.interface';
import { OrderRepository } from 'src/domain/repositories/order.repository.interface';

export interface TableListItem {
  id: string;
  identifier: string;
  capacity: number;
  status: TableStatus;
  clientName: string | null;
  openedBy: string | null; // quem abriu a mesa
  openedAt: Date;
  subtotal: number; // soma dos pedidos ativos (centavos, sem taxa)
  serviceFee: number;
  total: number; // com taxa
  inKitchen: number; // pedidos ainda sendo preparados (impedem fechar a conta)
  undelivered: number; // pedidos ainda não entregues (inclui prontos)
}

@Injectable()
export class ListTablesUsecase {
  constructor(
    private readonly tableRepository: TableRepository,
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(): Promise<TableListItem[]> {
    const [tables, activeOrders] = await Promise.all([
      this.tableRepository.findAll(),
      this.orderRepository.findAllActive(),
    ]);

    return tables.map((t) => {
      const orders = activeOrders.filter((o) => o.getTableId() === t.getId());
      const subtotal = orders.reduce((s, o) => s + o.getTotalAmount(), 0);
      const fee = serviceFee(subtotal);
      return {
        id: t.getId(),
        identifier: t.getIdentifier(),
        capacity: t.getCapacity(),
        status: t.getStatus(),
        clientName: t.getClientName(),
        openedBy: t.getOpenedBy(),
        openedAt: t.getOpenedAt() ?? t.getUpdatedAt(),
        subtotal,
        serviceFee: fee,
        total: subtotal + fee,
        inKitchen: orders.filter((o) => o.isInKitchen()).length,
        undelivered: orders.filter((o) => o.getStatus() !== 'DELIVERED').length,
      };
    });
  }
}
