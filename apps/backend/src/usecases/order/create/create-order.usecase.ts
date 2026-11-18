import { Injectable } from '@nestjs/common';
import { ORDER_NOTE_MAX_LENGTH } from '@comanda/shared';
import { UnitOfWork } from 'src/domain/ports/unit-of-work';
import { OrderRepository } from 'src/domain/repositories/order.repository.interface';
import { ProductRepository } from 'src/domain/repositories/product.repository.interface';
import { TableRepository } from 'src/domain/repositories/table.repository.interface';
import { AuditLogRepository } from 'src/domain/repositories/audit-log.repository.interface';
import { StockMovementRepository } from 'src/domain/repositories/stock-movement.repository.interface';
import { Order } from 'src/domain/entities/order/order.entity';
import { OrderItem } from 'src/domain/entities/order-item/order-item.entity';
import { Product } from 'src/domain/entities/product/product.entity';
import { AuditLog } from 'src/domain/entities/audit-log/audit-log.entity';
import { StockMovement } from 'src/domain/entities/stock-movement/stock-movement.entity';
import { AppError } from 'src/shared/errors/app-error';
import { formatQuantity } from 'src/shared/utils/format';

export interface CreateOrderInput {
  tableId: string;
  userId: string;
  items: { productId: string; quantity: number; notes?: string | null }[];
}

@Injectable()
export class CreateOrderUsecase {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
    private readonly tableRepository: TableRepository,
    private readonly stockMovementRepository: StockMovementRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  // Observação do item (ex: "com gelo e limão"): texto livre, limitado
  private static cleanNotes(notes?: string | null): string | null {
    const text = String(notes ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, ORDER_NOTE_MAX_LENGTH);
    return text || null;
  }

  async execute(input: CreateOrderInput, actor: string): Promise<{ id: string; total: number }> {
    if (!input.items || input.items.length === 0) {
      throw AppError.badRequest('VALIDATION', 'O pedido precisa ter ao menos um item');
    }

    // 1. Mesa precisa estar aberta
    const table = await this.tableRepository.findById(input.tableId);
    if (!table) throw AppError.notFound('Mesa não encontrada');
    if (!table.isOpen())
      throw AppError.badRequest('TABLE_NOT_OPEN', 'A mesa precisa estar aberta para lançar pedidos');

    // 2. Validar itens e somar a quantidade pedida por produto
    const products = new Map<string, Product>();
    const found = await this.productRepository.findByIds([...new Set(input.items.map((i) => i.productId))]);
    for (const p of found) if (p.getAvailable()) products.set(p.getId(), p);

    const requested = new Map<string, number>();
    for (const item of input.items) {
      const product = products.get(item.productId);
      if (!product) throw AppError.notFound('Item não encontrado no cardápio');
      const quantity = Math.round(Number(item.quantity));
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw AppError.badRequest('VALIDATION', `Quantidade inválida para ${product.getName()}`);
      }
      if (quantity < product.getMinOrderQuantity()) {
        throw AppError.badRequest(
          'VALIDATION',
          `${product.getName()}: o pedido mínimo é de ${product.getMinOrderQuantity()}g`,
        );
      }
      requested.set(product.getId(), (requested.get(product.getId()) ?? 0) + quantity);
    }

    // 3. Montar itens com snapshot do preço
    const orderItems = input.items.map((item) => {
      const product = products.get(item.productId)!;
      return OrderItem.create({
        productId: product.getId(),
        quantity: Math.round(Number(item.quantity)),
        unitPrice: product.getUnitPrice(),
        weighed: product.getIsMeat(),
        notes: CreateOrderUsecase.cleanNotes(item.notes),
      });
    });
    const order = Order.create({ tableId: input.tableId, userId: input.userId, items: orderItems });

    // 4. Pedido + baixa de estoque numa transação só. A baixa é condicional no banco:
    //    se outro pedido levou o estoque no meio do caminho, tudo é desfeito.
    await this.uow.run(async () => {
      await this.orderRepository.create(order);
      for (const [productId, quantity] of requested) {
        const product = products.get(productId)!;
        const before = await this.productRepository.decrementStock(productId, quantity);
        if (before === null) {
          const current = (await this.productRepository.findById(productId))?.getStock() ?? 0;
          throw AppError.badRequest(
            'STOCK_INSUFFICIENT',
            `Estoque insuficiente de ${product.getName()} (disponível: ${formatQuantity(current, product.getIsMeat())})`,
          );
        }
        await this.stockMovementRepository.create(
          StockMovement.create({
            productId,
            before,
            after: before - quantity,
            type: 'VENDA',
            orderId: order.getId(),
            actor,
          }),
        );
      }
      await this.auditLogRepository.create(
        AuditLog.create(
          'PEDIDO_LANCADO',
          actor,
          `Mesa ${table.getIdentifier()} — ${this.summary(orderItems, products)}`,
        ),
      );
    });

    return { id: order.getId(), total: order.getTotalAmount() };
  }

  private summary(items: OrderItem[], products: Map<string, Product>): string {
    return items
      .map((i) => {
        const p = products.get(i.getProductId())!;
        const base = p.getIsMeat()
          ? `${p.getName()} ${i.getQuantity()}g`
          : `${p.getName()} x${i.getQuantity()}`;
        return i.getNotes() ? `${base} (${i.getNotes()})` : base;
      })
      .join(', ');
  }
}
