import { Injectable } from '@nestjs/common';
import { DEFAULT_TOTAL_TABLES } from '@comanda/shared';
import { PrismaService } from 'src/infra/services/database/prisma/prisma.service';
import {
  SettingsRepository,
  type RestaurantSettings,
} from 'src/domain/repositories/settings.repository.interface';

// Linha única (id = 1) na tabela restaurant_config
@Injectable()
export class PrismaSettingsRepository extends SettingsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async get(): Promise<RestaurantSettings> {
    const row = await this.prisma.db.restaurantConfig.findUnique({ where: { id: 1 } });
    return { totalTables: row?.totalTables ?? DEFAULT_TOTAL_TABLES };
  }

  async save(settings: RestaurantSettings): Promise<void> {
    await this.prisma.db.restaurantConfig.upsert({
      where: { id: 1 },
      create: { id: 1, totalTables: settings.totalTables },
      update: { totalTables: settings.totalTables },
    });
  }
}
