import { Body, Controller, Get, Patch } from '@nestjs/common';
import { GetSettingsUsecase } from 'src/usecases/settings/get/get-settings.usecase';
import { UpdateSettingsUsecase } from 'src/usecases/settings/update/update-settings.usecase';
import { Roles } from 'src/infra/web/auth/decorators/roles.decorator';
import { CurrentUser, type RequestUser } from 'src/infra/web/auth/request-user';
import { UpdateSettingsDto } from './dto/settings.dto';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly getSettingsUsecase: GetSettingsUsecase,
    private readonly updateSettingsUsecase: UpdateSettingsUsecase,
  ) {}

  @Get()
  get() {
    return this.getSettingsUsecase.execute();
  }

  @Roles('ADMIN')
  @Patch()
  update(@CurrentUser() user: RequestUser, @Body() body: UpdateSettingsDto) {
    return this.updateSettingsUsecase.execute({ totalTables: body.totalTables }, user.username);
  }
}
