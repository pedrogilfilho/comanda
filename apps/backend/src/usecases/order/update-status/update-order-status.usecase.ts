import { Injectable } from '@nestjs/common';
import { ORDER_STATUS_LABEL, type OrderStatus } from '@comanda/shared';
import { UnitOfWork } from 'src/domain/ports/unit-of-work';
import { OrderRepository } from 'src/domain/repositories/order.repository.interface';
import { TableRepository } from 'src/domain/repositories/table.repository.interface';
import { ProductRepository } from 'src/domain/repositories/product.repository.interface';
import { StockMovementRepository } from 'src/domain/repositories/stock-movement.repository.interface';
import { AuditLogRepository } from 'src/domain/repositories/audit-log.repository.interface';
import { InvalidOrderTransition } from 'src/domain/entities/order/order.entity';
import { AuditLog } from 'src/domain/entities/audit-log/audit-log.entity';
import { StockMovement } from 'src/domain/entities/stock-movement/stock-movement.entity';
import { AppError } from 'src/shared/errors/app-error';

@Injectable()
export class UpdateOrderStatusUsecase {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly orderRepository: OrderRepository,
    private readonly tableRepository: TableRepository,
    private readonly productRepository: ProductRepository,
    private readonly stockMovementRepository: StockMovementRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(orderId: string, status: OrderStatus, actor: string, reason?: string): Promise<{ success: boolean }> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw AppError.notFound('Pedido não encontrado');

    const before = order.getStatus();
    try {
      order.updateStatus(status);
    } catch (e) {
      if (e instanceof InvalidOrderTransition) {
        throw AppError.badRequest(
          'INVALID_TRANSITION',
          `Este pedido está "${ORDER_STATUS_LABEL[before]}" e não pode ir para "${ORDER_STATUS_LABEL[status]}"`,
        );
      }
      throw e;
    }

    const table = await this.tableRepository.findById(order.getTableId());
    const tableLabel = `Mesa ${table?.getIdentifier() ?? '?'}`;

    await this.uow.run(async () => {
      await this.orderRepository.update(order);

      // Cancelamento devolve ao estoque tudo o que o pedido tinha baixado
      if (status === 'CANCELLED') {
        const byProduct = new Map<string, number>();
        for (const it of order.getItems()) byProduct.set(it.getProductId(), (byProduct.get(it.getProductId()) ?? 0) + it.getQuantity());
        for (const [productId, quantity] of byProduct) {
          const stockBefore = await this.productRepository.incrementStock(productId, quantity);
          await this.stockMovementRepository.create(
            StockMovement.create({ productId, before: stockBefore, after: stockBefore + quantity, type: 'ESTORNO', orderId: order.getId(), actor, note: reason }),
          );
        }
        await this.auditLogRepository.create(
          AuditLog.create('PEDIDO_CANCELADO', actor, `${tableLabel}: pedido das ${order.getCreatedAt().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}${reason ? ` — ${reason}` : ''}`),
        );
        return;
      }

      await this.auditLogRepository.create(
        AuditLog.create('STATUS_ALTERADO', actor, `${tableLabel}: ${ORDER_STATUS_LABEL[before]} → ${ORDER_STATUS_LABEL[status]}`),
      );
    });

    return { success: true };
  }
}
