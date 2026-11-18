import { Injectable } from '@nestjs/common';
import {
  SettingsRepository,
  type RestaurantSettings,
} from 'src/domain/repositories/settings.repository.interface';

@Injectable()
export class GetSettingsUsecase {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  execute(): Promise<RestaurantSettings> {
    return this.settingsRepository.get();
  }
}
