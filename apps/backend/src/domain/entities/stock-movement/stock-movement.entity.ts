import type { StockMovementType } from '@comanda/shared';
import { Utils } from 'src/shared/utils/utils';

export type StockMovementCreateDto = {
  productId: string;
  before: number;
  after: number;
  type: StockMovementType;
  orderId?: string | null;
  actor: string;
  note?: string | null;
};

// Histórico de cada mudança de estoque (venda, estorno de cancelamento, entrada, saída, contagem)
export class StockMovement {
  private constructor(
    private readonly id: string,
    private readonly productId: string,
    private readonly before: number,
    private readonly after: number,
    private readonly type: StockMovementType,
    private readonly orderId: string | null,
    private readonly actor: string,
    private readonly note: string | null,
    private readonly createdAt: Date,
  ) {}

  static create(dto: StockMovementCreateDto): StockMovement {
    return new StockMovement(
      Utils.generateUUID(),
      dto.productId,
      dto.before,
      dto.after,
      dto.type,
      dto.orderId ?? null,
      dto.actor,
      dto.note ?? null,
      new Date(),
    );
  }

  getId(): string { return this.id; }
  getProductId(): string { return this.productId; }
  getBefore(): number { return this.before; }
  getAfter(): number { return this.after; }
  getType(): StockMovementType { return this.type; }
  getOrderId(): string | null { return this.orderId; }
  getActor(): string { return this.actor; }
  getNote(): string | null { return this.note; }
  getCreatedAt(): Date { return this.createdAt; }
}
