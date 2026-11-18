import { Injectable } from '@nestjs/common';
import { TABLE_IDENTIFIER_MAX_LENGTH } from '@comanda/shared';
import { AppError } from 'src/shared/errors/app-error';
import { TableRepository } from 'src/domain/repositories/table.repository.interface';
import { AuditLogRepository } from 'src/domain/repositories/audit-log.repository.interface';
import { Table } from 'src/domain/entities/table/table.entity';
import { AuditLog } from 'src/domain/entities/audit-log/audit-log.entity';

@Injectable()
export class OpenTableUsecase {
  constructor(
    private readonly tableRepository: TableRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(
    dto: { identifier: string; capacity?: number; clientName?: string | null },
    actor: string,
  ): Promise<{ id: string; message: string }> {
    const identifier = String(dto.identifier ?? '').trim();
    if (!identifier) throw AppError.badRequest('VALIDATION', 'Informe o número ou identificador da mesa');
    if (identifier.length > TABLE_IDENTIFIER_MAX_LENGTH) {
      throw AppError.badRequest(
        'VALIDATION',
        `Identificador muito longo (máximo ${TABLE_IDENTIFIER_MAX_LENGTH} caracteres)`,
      );
    }
    const clientName = dto.clientName?.trim() || null;

    const alreadyOpen = () =>
      AppError.badRequest('TABLE_ALREADY_OPEN', `A mesa ${identifier} já está ocupada`);
    const existing = await this.tableRepository.findByIdentifier(identifier);
    let tableId: string;

    if (existing) {
      if (existing.isOpen()) {
        throw alreadyOpen();
      }
      if (!(await this.tableRepository.occupyIfFree(existing, clientName, actor))) throw alreadyOpen();
      tableId = existing.getId();
    } else {
      const table = Table.create({
        identifier,
        capacity: dto.capacity,
        clientName,
        status: 'OCCUPIED',
        openedBy: actor,
      });
      if (!(await this.tableRepository.createIfAbsent(table))) throw alreadyOpen();
      tableId = table.getId();
    }

    await this.auditLogRepository.create(
      AuditLog.create('MESA_ABERTA', actor, `Mesa ${identifier}${clientName ? ` — ${clientName}` : ''}`),
    );
    return { id: tableId, message: `Mesa ${identifier} aberta` };
  }
}
