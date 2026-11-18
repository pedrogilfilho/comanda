import { Injectable } from '@nestjs/common';
import { Prisma, type Table as TableRow } from '@prisma/client';
import { PrismaService } from 'src/infra/services/database/prisma/prisma.service';
import { TableRepository } from 'src/domain/repositories/table.repository.interface';
import { Table, type TableStatus } from 'src/domain/entities/table/table.entity';

@Injectable()
export class PrismaTableRepository extends TableRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toEntity(raw: TableRow): Table {
    return Table.with({
      id: raw.id,
      identifier: raw.identifier,
      capacity: raw.capacity,
      status: raw.status as TableStatus, // coluna String no banco
      clientName: raw.clientName,
      openedAt: raw.openedAt,
      openedBy: raw.openedBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findAll(): Promise<Table[]> {
    const rows = await this.prisma.db.table.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map((r) => this.toEntity(r));
  }

  async findById(id: string): Promise<Table | null> {
    const raw = await this.prisma.db.table.findUnique({ where: { id } });
    return raw ? this.toEntity(raw) : null;
  }

  async findByIdentifier(identifier: string): Promise<Table | null> {
    const raw = await this.prisma.db.table.findUnique({ where: { identifier } });
    return raw ? this.toEntity(raw) : null;
  }

  async create(table: Table): Promise<void> {
    await this.prisma.db.table.create({
      data: {
        id: table.getId(),
        identifier: table.getIdentifier(),
        capacity: table.getCapacity(),
        status: table.getStatus(),
        clientName: table.getClientName(),
        openedAt: table.getOpenedAt(),
        openedBy: table.getOpenedBy(),
        createdAt: table.getCreatedAt(),
        updatedAt: table.getUpdatedAt(),
      },
    });
  }

  async createIfAbsent(table: Table): Promise<boolean> {
    try {
      await this.create(table);
      return true;
    } catch (e) {
      // identificador único: outra pessoa criou a mesma mesa agora
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return false;
      throw e;
    }
  }

  async occupyIfFree(table: Table, clientName: string | null, openedBy: string): Promise<boolean> {
    table.occupy(clientName, openedBy);
    const { count } = await this.prisma.db.table.updateMany({
      where: { id: table.getId(), status: 'FREE' },
      data: {
        status: table.getStatus(),
        clientName: table.getClientName(),
        openedAt: table.getOpenedAt(),
        openedBy: table.getOpenedBy(),
        updatedAt: table.getUpdatedAt(),
      },
    });
    return count === 1;
  }

  async update(table: Table): Promise<void> {
    await this.prisma.db.table.update({
      where: { id: table.getId() },
      data: {
        status: table.getStatus(),
        clientName: table.getClientName(),
        openedAt: table.getOpenedAt(),
        openedBy: table.getOpenedBy(),
        capacity: table.getCapacity(),
        updatedAt: table.getUpdatedAt(),
      },
    });
  }
}
