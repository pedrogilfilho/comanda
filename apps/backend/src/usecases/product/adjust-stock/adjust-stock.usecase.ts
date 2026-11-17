import { Injectable } from '@nestjs/common';
import { STOCK_NOTE_MAX_LENGTH, type StockMovementType } from '@comanda/shared';
import { UnitOfWork } from 'src/domain/ports/unit-of-work';
import { ProductRepository } from 'src/domain/repositories/product.repository.interface';
import { StockMovementRepository } from 'src/domain/repositories/stock-movement.repository.interface';
import { AuditLogRepository } from 'src/domain/repositories/audit-log.repository.interface';
import { AuditLog } from 'src/domain/entities/audit-log/audit-log.entity';
import { StockMovement } from 'src/domain/entities/stock-movement/stock-movement.entity';
import { AppError } from 'src/shared/errors/app-error';
import { formatQuantity } from 'src/shared/utils/format';

export type ManualStockMovement = Extract<StockMovementType, 'ENTRADA' | 'SAIDA' | 'CONTAGEM'>;

export interface AdjustStockInput {
  productId: string;
  stock: number; // novo valor absoluto (gramas para carne, unidades para os demais)
  type: ManualStockMovement;
  reason?: string;
  actor: string;
}

@Injectable()
export class AdjustStockUsecase {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly productRepository: ProductRepository,
    private readonly stockMovementRepository: StockMovementRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute({ productId, stock, type, reason, actor }: AdjustStockInput): Promise<{ stock: number }> {
    if (!Number.isInteger(stock) || stock < 0) throw AppError.badRequest('VALIDATION', 'Quantidade de estoque inválida');
    const product = await this.productRepository.findById(productId);
    if (!product || !product.getAvailable()) throw AppError.notFound('Item não encontrado');

    const note = (reason ?? '').trim().slice(0, STOCK_NOTE_MAX_LENGTH) || null;
    const before = product.getStock();
    product.setStock(stock);

    await this.uow.run(async () => {
      await this.productRepository.update(product);
      await this.stockMovementRepository.create(StockMovement.create({ productId, before, after: product.getStock(), type, actor, note }));
      const fmt = (v: number) => formatQuantity(v, product.getIsMeat());
      await this.auditLogRepository.create(
        AuditLog.create('ESTOQUE_AJUSTADO', actor, `${product.getName()}: ${fmt(before)} → ${fmt(product.getStock())}${note ? ` — ${note}` : ''}`),
      );
    });
    return { stock: product.getStock() };
  }
}
