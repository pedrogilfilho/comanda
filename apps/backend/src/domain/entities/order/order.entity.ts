import { canTransition, isActiveOrder, isInKitchen, type OrderStatus } from '@comanda/shared';
import { Utils } from 'src/shared/utils/utils';
import { OrderItem } from '../order-item/order-item.entity';

export type { OrderStatus };

export class InvalidOrderTransition extends Error {
  constructor(
    public readonly from: OrderStatus,
    public readonly to: OrderStatus,
  ) {
    super(`Pedido não pode ir de ${from} para ${to}`);
  }
}

export type OrderCreateDto = {
  tableId: string;
  userId: string;
  items: OrderItem[];
  notes?: string | null;
  status?: 'PENDING' | 'DELIVERED'; // bebida já nasce entregue
};

export type OrderWithDto = {
  id: string;
  tableId: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  notes: string | null;
  items: OrderItem[];
  closedAccountId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class Order {
  private constructor(
    private readonly id: string,
    private readonly tableId: string,
    private readonly userId: string,
    private status: OrderStatus,
    private totalAmount: number,
    private notes: string | null,
    private items: OrderItem[],
    private readonly createdAt: Date,
    private updatedAt: Date,
    private readonly closedAccountId: string | null = null,
  ) {}

  static create(dto: OrderCreateDto): Order {
    const total = dto.items.reduce((sum, i) => sum + i.getSubtotal(), 0);
    return new Order(
      Utils.generateUUID(),
      dto.tableId,
      dto.userId,
      dto.status ?? 'PENDING',
      total,
      dto.notes ?? null,
      dto.items,
      new Date(),
      new Date(),
    );
  }

  static with(dto: OrderWithDto): Order {
    return new Order(
      dto.id,
      dto.tableId,
      dto.userId,
      dto.status,
      dto.totalAmount,
      dto.notes,
      dto.items,
      dto.createdAt,
      dto.updatedAt,
      dto.closedAccountId ?? null,
    );
  }

  getId(): string {
    return this.id;
  }
  getTableId(): string {
    return this.tableId;
  }
  getUserId(): string {
    return this.userId;
  }
  getStatus(): OrderStatus {
    return this.status;
  }
  getTotalAmount(): number {
    return this.totalAmount;
  }
  getNotes(): string | null {
    return this.notes;
  }
  getItems(): OrderItem[] {
    return this.items;
  }
  getCreatedAt(): Date {
    return this.createdAt;
  }
  getClosedAccountId(): string | null {
    return this.closedAccountId;
  }
  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  isActive(): boolean {
    return isActiveOrder(this.status);
  }
  isInKitchen(): boolean {
    return isInKitchen(this.status);
  }

  // Só transições previstas na máquina de estados; CLOSED acontece pelo fechamento da conta
  updateStatus(status: OrderStatus): void {
    if (!canTransition(this.status, status)) throw new InvalidOrderTransition(this.status, status);
    this.status = status;
    this.updatedAt = new Date();
  }

  // Cópia independente (mesmo id): para calcular a mudança sem mexer no que foi lido
  copy(): Order {
    return new Order(
      this.id,
      this.tableId,
      this.userId,
      this.status,
      this.totalAmount,
      this.notes,
      [...this.items],
      this.createdAt,
      this.updatedAt,
      this.closedAccountId,
    );
  }

  // Diminui (ou tira, com 0) um item e recalcula o total; sem itens, o pedido fica cancelado
  changeItemQuantity(itemId: string, quantity: number): void {
    this.items = this.items.flatMap((i) =>
      i.getId() !== itemId ? [i] : quantity > 0 ? [i.withQuantity(quantity)] : [],
    );
    this.totalAmount = this.items.reduce((sum, i) => sum + i.getSubtotal(), 0);
    if (this.items.length === 0) this.status = 'CANCELLED';
    this.updatedAt = new Date();
  }
}
