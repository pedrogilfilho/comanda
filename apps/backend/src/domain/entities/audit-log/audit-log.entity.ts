import type { AuditAction } from '@comanda/shared';
import { Utils } from 'src/shared/utils/utils';

export type { AuditAction };

export type AuditLogWithDto = {
  id: string;
  action: AuditAction;
  actor: string;
  details: string;
  createdAt: Date;
};

export class AuditLog {
  private constructor(
    private readonly id: string,
    private readonly action: AuditAction,
    private readonly actor: string,
    private readonly details: string,
    private readonly createdAt: Date,
  ) {}

  static create(action: AuditAction, actor: string, details: string): AuditLog {
    return new AuditLog(Utils.generateUUID(), action, actor, details, new Date());
  }

  static with(dto: AuditLogWithDto): AuditLog {
    return new AuditLog(dto.id, dto.action, dto.actor, dto.details, dto.createdAt);
  }

  getId(): string { return this.id; }
  getAction(): AuditAction { return this.action; }
  getActor(): string { return this.actor; }
  getDetails(): string { return this.details; }
  getCreatedAt(): Date { return this.createdAt; }
}
