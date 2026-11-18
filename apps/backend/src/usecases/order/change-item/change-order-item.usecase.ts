import { Injectable } from '@nestjs/common';
import {
  ITEM_CHANGE_REASON_LABEL,
  RETURNS_TO_STOCK,
  type ItemChangeReason,
  type OrderStatus,
  type UserRole,
} from '@comanda/shared';
import { UnitOfWork } from 'src/domain/ports/unit-of-work';
import { OrderRepository } from 'src/domain/repositories/order.repository.interface';
import { ProductRepository } from 'src/domain/repositories/product.repository.interface';
import { TableRepository } from 'src/domain/repositories/table.repository.interface';
import { StockMovementRepository } from 'src/domain/repositories/stock-movement.repository.interface';
import { AuditLogRepository } from 'src/domain/repositories/audit-log.repository.interface';
import { AuditLog } from 'src/domain/entities/audit-log/audit-log.entity';
import { StockMovement } from 'src/domain/entities/stock-movement/stock-movement.entity';
import { AppError } from 'src/shared/errors/app-error';
import { formatQuantity } from 'src/shared/utils/format';

export interface ChangeOrderItemInput {
  orderId: string;
  itemId: string;
  quantity: number; // nova quantidade (gramas ou unidades); 0 tira o item
  reason: ItemChangeReason;
}

// Pedidos que ainda estão na conta; o garçom só mexe antes da cozinha começar
const MANAGER_STATUSES: OrderStatus[] = ['PENDING', 'PREPARING', 'READY', 'DELIVERED'];

@Injectable()
export class ChangeOrderItemUsecase {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
    private readonly tableRepository: TableRepository,
    private readonly stockMovementRepository: StockMovementRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(
    input: ChangeOrderItemInput,
    actor: { username: string; role: UserRole },
  ): Promise<{ total: number }> {
    const order = await this.orderRepository.findById(input.orderId);
    if (!order) throw AppError.notFound('Pedido não encontrado');
    if (!MANAGER_STATUSES.includes(order.getStatus())) {
      throw AppError.badRequest('VALIDATION', 'Este pedido já não está na conta');
    }
    const item = order.getItems().find((i) => i.getId() === input.itemId);
    if (!item) throw AppError.notFound('Item não encontrado no pedido');

    if (actor.role === 'GARCOM') {
      if (order.getStatus() !== 'PENDING') {
        throw AppError.forbidden('A cozinha já começou este pedido: peça ao gerente para alterar');
      }
      if (!RETURNS_TO_STOCK[input.reason]) throw AppError.forbidden('Só o gerente registra perda');
    }

    const product = await this.productRepository.findById(item.getProductId());
    const name = product?.getName() ?? 'Item';
    const isMeat = item.getWeighed();
    const before = item.getQuantity();
    const after = input.quantity;
    if (!Number.isInteger(after) || after < 0 || after >= before) {
      throw AppError.badRequest(
        'VALIDATION',
        `Informe uma quantidade menor que ${formatQuantity(before, isMeat)}`,
      );
    }
    const min = product?.getMinOrderQuantity() ?? 0;
    if (after > 0 && after < min) {
      throw AppError.badRequest(
        'VALIDATION',
        `${name}: o mínimo é ${formatQuantity(min, isMeat)}; para menos, tire o item`,
      );
    }

    const table = await this.tableRepository.findById(order.getTableId());
    const label = ITEM_CHANGE_REASON_LABEL[input.reason];
    const diff = before - after;
    order.changeItemQuantity(item.getId(), after);

    await this.uow.run(async () => {
      await this.orderRepository.replaceItems(order);
      if (RETURNS_TO_STOCK[input.reason]) {
        const stockBefore = await this.productRepository.incrementStock(item.getProductId(), diff);
        await this.stockMovementRepository.create(
          StockMovement.create({
            productId: item.getProductId(),
            before: stockBefore,
            after: stockBefore + diff,
            type: 'ESTORNO',
            orderId: order.getId(),
            actor: actor.username,
            note: label,
          }),
        );
      } else {
        // Perda: o estoque não volta; o movimento só registra o que se perdeu
        const stock = (await this.productRepository.findById(item.getProductId()))?.getStock() ?? 0;
        await this.stockMovementRepository.create(
          StockMovement.create({
            productId: item.getProductId(),
            before: stock,
            after: stock,
            type: 'PERDA',
            orderId: order.getId(),
            actor: actor.username,
            note: `Perda: ${formatQuantity(diff, isMeat)}`,
          }),
        );
      }
      await this.auditLogRepository.create(
        AuditLog.create(
          after === 0 ? 'ITEM_TIRADO' : 'ITEM_DIMINUIDO',
          actor.username,
          `Mesa ${table?.getIdentifier() ?? '?'} — ${name}: ${formatQuantity(before, isMeat)} → ${formatQuantity(after, isMeat)} (${label})`,
        ),
      );
    });

    return { total: order.getTotalAmount() };
  }
}
