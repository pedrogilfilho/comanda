import { Injectable } from '@nestjs/common';
import { MAX_TOTAL_TABLES } from '@comanda/shared';
import { AppError } from 'src/shared/errors/app-error';
import {
  SettingsRepository,
  type RestaurantSettings,
} from 'src/domain/repositories/settings.repository.interface';
import { AuditLogRepository } from 'src/domain/repositories/audit-log.repository.interface';
import { AuditLog } from 'src/domain/entities/audit-log/audit-log.entity';

@Injectable()
export class UpdateSettingsUsecase {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: RestaurantSettings, actor: string): Promise<RestaurantSettings> {
    const total = input.totalTables;
    if (!Number.isInteger(total) || total < 1 || total > MAX_TOTAL_TABLES) {
      throw AppError.badRequest('VALIDATION', `O total de mesas vai de 1 a ${MAX_TOTAL_TABLES}`);
    }
    const current = await this.settingsRepository.get();
    if (current.totalTables === total) return current;

    const next = { ...current, totalTables: total };
    await this.settingsRepository.save(next);
    await this.auditLogRepository.create(
      AuditLog.create('CONFIG_ALTERADA', actor, `Total de mesas: ${current.totalTables} → ${total}`),
    );
    return next;
  }
}
