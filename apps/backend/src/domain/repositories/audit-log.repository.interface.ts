import { AuditLog } from '../entities/audit-log/audit-log.entity';

export abstract class AuditLogRepository {
  abstract create(log: AuditLog): Promise<void>;
  abstract findBetween(from: Date, to: Date, action?: string): Promise<AuditLog[]>;
}
