import { Injectable } from '@nestjs/common';
import type { AuditLog as AuditLogRow } from '@prisma/client';
import { PrismaService } from 'src/infra/services/database/prisma/prisma.service';
import { AuditLogRepository } from 'src/domain/repositories/audit-log.repository.interface';
import { AuditLog, type AuditAction } from 'src/domain/entities/audit-log/audit-log.entity';

@Injectable()
export class PrismaAuditLogRepository extends AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toEntity(raw: AuditLogRow): AuditLog {
    return AuditLog.with({
      id: raw.id,
      action: raw.action as AuditAction, // coluna String no banco
      actor: raw.actor,
      details: raw.details,
      createdAt: raw.createdAt,
    });
  }

  async create(log: AuditLog): Promise<void> {
    await this.prisma.db.auditLog.create({
      data: {
        id: log.getId(),
        action: log.getAction(),
        actor: log.getActor(),
        details: log.getDetails(),
        createdAt: log.getCreatedAt(),
      },
    });
  }

  async findBetween(from: Date, to: Date, action?: string): Promise<AuditLog[]> {
    const rows = await this.prisma.db.auditLog.findMany({
      where: { createdAt: { gte: from, lte: to }, ...(action ? { action } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toEntity(r));
  }
}
