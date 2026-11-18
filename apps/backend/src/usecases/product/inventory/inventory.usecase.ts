import { Injectable } from '@nestjs/common';
import { UnitOfWork } from 'src/domain/ports/unit-of-work';
import { ProductRepository } from 'src/domain/repositories/product.repository.interface';
import { StockMovementRepository } from 'src/domain/repositories/stock-movement.repository.interface';
import { AuditLogRepository } from 'src/domain/repositories/audit-log.repository.interface';
import { AuditLog } from 'src/domain/entities/audit-log/audit-log.entity';
import { StockMovement } from 'src/domain/entities/stock-movement/stock-movement.entity';
import { AppError } from 'src/shared/errors/app-error';
import { formatQuantity } from 'src/shared/utils/format';

export interface InventoryItem {
  productId: string;
  stock: number; // quantidade contada (gramas para carne, unidades para os demais)
}

// Inventário: grava a contagem de vários itens numa transação só. Ou entram todas as
// correções, ou nenhuma. Itens iguais ao estoque atual são ignorados.
@Injectable()
export class InventoryUsecase {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly productRepository: ProductRepository,
    private readonly stockMovementRepository: StockMovementRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(items: InventoryItem[], actor: string): Promise<{ changed: number }> {
    if (items.length === 0) throw AppError.badRequest('VALIDATION', 'Nenhum item no inventário');
    const ids = items.map((i) => i.productId);
    if (new Set(ids).size !== ids.length)
      throw AppError.badRequest('VALIDATION', 'Item repetido no inventário');
    if (items.some((i) => !Number.isInteger(i.stock) || i.stock < 0))
      throw AppError.badRequest('VALIDATION', 'Quantidade de estoque inválida');

    const products = await this.productRepository.findByIds(ids);
    const byId = new Map(products.filter((p) => p.getAvailable()).map((p) => [p.getId(), p]));
    if (ids.some((id) => !byId.has(id))) throw AppError.notFound('Item não encontrado');

    const changes = items
      .map((i) => ({
        product: byId.get(i.productId)!,
        before: byId.get(i.productId)!.getStock(),
        after: i.stock,
      }))
      .filter((c) => c.before !== c.after);
    if (changes.length === 0) throw AppError.badRequest('VALIDATION', 'Nenhum item mudou');

    await this.uow.run(async () => {
      for (const { product, before, after } of changes) {
        product.setStock(after);
        await this.productRepository.update(product);
        await this.stockMovementRepository.create(
          StockMovement.create({
            productId: product.getId(),
            before,
            after,
            type: 'CONTAGEM',
            actor,
            note: 'Inventário',
          }),
        );
      }
      const lines = changes.map(({ product, before, after }) => {
        const fmt = (v: number) => formatQuantity(v, product.getIsMeat());
        return `${product.getName()} ${fmt(before)} → ${fmt(after)}`;
      });
      const count = `${changes.length} ${changes.length === 1 ? 'item' : 'itens'}`;
      await this.auditLogRepository.create(
        AuditLog.create('INVENTARIO_FEITO', actor, `${count}: ${lines.join('; ')}`),
      );
    });
    return { changed: changes.length };
  }
}
