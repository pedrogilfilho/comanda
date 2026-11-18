import type { TableStatus } from '@comanda/shared';
import { Utils } from 'src/shared/utils/utils';

export type { TableStatus };

export type TableCreateDto = {
  identifier: string;
  capacity?: number;
  clientName?: string | null;
  status?: TableStatus;
  openedBy?: string | null;
};

export type TableWithDto = {
  id: string;
  identifier: string;
  capacity: number;
  status: TableStatus;
  clientName: string | null;
  openedAt: Date | null;
  openedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class Table {
  private constructor(
    private readonly id: string,
    private identifier: string,
    private capacity: number,
    private status: TableStatus,
    private clientName: string | null,
    private openedAt: Date | null,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private openedBy: string | null = null,
  ) {}

  static create(dto: TableCreateDto): Table {
    const status = dto.status ?? 'FREE';
    const now = new Date();
    return new Table(
      Utils.generateUUID(),
      dto.identifier,
      dto.capacity ?? 4,
      status,
      dto.clientName ?? null,
      status === 'OCCUPIED' ? now : null,
      now,
      now,
      status === 'OCCUPIED' ? (dto.openedBy ?? null) : null,
    );
  }

  static with(dto: TableWithDto): Table {
    return new Table(
      dto.id,
      dto.identifier,
      dto.capacity,
      dto.status,
      dto.clientName,
      dto.openedAt,
      dto.createdAt,
      dto.updatedAt,
      dto.openedBy ?? null,
    );
  }

  getId(): string {
    return this.id;
  }
  getIdentifier(): string {
    return this.identifier;
  }
  getCapacity(): number {
    return this.capacity;
  }
  getStatus(): TableStatus {
    return this.status;
  }
  getClientName(): string | null {
    return this.clientName;
  }
  getOpenedAt(): Date | null {
    return this.openedAt;
  }
  getOpenedBy(): string | null {
    return this.openedBy;
  }
  getCreatedAt(): Date {
    return this.createdAt;
  }
  getUpdatedAt(): Date {
    return this.updatedAt;
  }
  isOpen(): boolean {
    return this.status === 'OCCUPIED';
  }

  occupy(clientName: string | null, openedBy: string): void {
    this.status = 'OCCUPIED';
    this.clientName = clientName ?? null;
    this.openedBy = openedBy;
    this.openedAt = new Date();
    this.updatedAt = new Date();
  }

  free(): void {
    this.status = 'FREE';
    this.clientName = null;
    this.openedBy = null;
    this.openedAt = null;
    this.updatedAt = new Date();
  }
}
