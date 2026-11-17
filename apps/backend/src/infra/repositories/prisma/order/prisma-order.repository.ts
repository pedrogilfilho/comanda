import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ACTIVE_ORDER_STATUSES, KITCHEN_ORDER_STATUSES, type OrderStatus } from '@comanda/shared';
import { PrismaService } from 'src/infra/services/database/prisma/prisma.service';
import { OrderRepository } from 'src/domain/repositories/order.repository.interface';
import { Order } from 'src/domain/entities/order/order.entity';
import { OrderItem } from 'src/domain/entities/order-item/order-item.entity';

type OrderRow = Prisma.OrderGetPayload<{ include: { items: true } }>;

@Injectable()
export class PrismaOrderRepository extends OrderRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toEntity(raw: OrderRow): Order {
    return Order.with({
      id: raw.id,
      tableId: raw.tableId,
      userId: raw.userId,
      status: raw.status as OrderStatus,
      totalAmount: raw.totalAmount,
      notes: raw.notes,
      items: raw.items.map((i) =>
        OrderItem.with({ id: i.id, productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, weighed: i.weighed, notes: i.notes }),
      ),
      closedAccountId: raw.closedAccountId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async create(order: Order): Promise<void> {
    await this.prisma.db.order.create({
      data: {
        id: order.getId(),
        tableId: order.getTableId(),
        userId: order.getUserId(),
        status: order.getStatus(),
        totalAmount: order.getTotalAmount(),
        notes: order.getNotes(),
        createdAt: order.getCreatedAt(),
        updatedAt: order.getUpdatedAt(),
        items: {
          create: order.getItems().map((i) => ({
            id: i.getId(),
            productId: i.getProductId(),
            quantity: i.getQuantity(),
            unitPrice: i.getUnitPrice(),
            weighed: i.getWeighed(),
            notes: i.getNotes(),
          })),
        },
      },
    });
  }

  async findById(id: string): Promise<Order | null> {
    const raw = await this.prisma.db.order.findUnique({ where: { id }, include: { items: true } });
    return raw ? this.toEntity(raw) : null;
  }

  async findActiveByTableId(tableId: string): Promise<Order[]> {
    const rows = await this.prisma.db.order.findMany({
      where: { tableId, status: { in: [...ACTIVE_ORDER_STATUSES] } },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async findAllActive(): Promise<Order[]> {
    const rows = await this.prisma.db.order.findMany({
      where: { status: { in: [...ACTIVE_ORDER_STATUSES] } },
      include: { items: true },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async findForKitchen(): Promise<Order[]> {
    const rows = await this.prisma.db.order.findMany({
      where: { status: { in: [...KITCHEN_ORDER_STATUSES] } },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async findByClosedAccountIds(ids: string[]): Promise<Order[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.db.order.findMany({
      where: { closedAccountId: { in: ids } },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async countByUserId(userId: string): Promise<number> {
    return this.prisma.db.order.count({ where: { userId } });
  }

  async update(order: Order): Promise<void> {
    await this.prisma.db.order.update({
      where: { id: order.getId() },
      data: { status: order.getStatus(), totalAmount: order.getTotalAmount(), notes: order.getNotes(), updatedAt: order.getUpdatedAt() },
    });
  }

  async closeByTableId(tableId: string, closedAccountId: string): Promise<void> {
    await this.prisma.db.order.updateMany({
      where: { tableId, status: { in: [...ACTIVE_ORDER_STATUSES] } },
      data: { status: 'CLOSED', closedAccountId, updatedAt: new Date() },
    });
  }
}
