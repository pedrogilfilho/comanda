import { Module } from '@nestjs/common';
import { GetSettingsUsecase } from 'src/usecases/settings/get/get-settings.usecase';
import { UpdateSettingsUsecase } from 'src/usecases/settings/update/update-settings.usecase';
import { SettingsController } from './settings.controller';

@Module({
  controllers: [SettingsController],
  providers: [GetSettingsUsecase, UpdateSettingsUsecase],
})
export class SettingsModule {}
