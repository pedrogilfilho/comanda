import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CreateUserUsecase } from 'src/usecases/user/create/create-user.usecase';
import { ListUsersUsecase } from 'src/usecases/user/list/list-users.usecase';
import { DeleteUserUsecase } from 'src/usecases/user/delete/delete-user.usecase';
import { ResetPasswordUsecase } from 'src/usecases/user/reset-password/reset-password.usecase';
import { SetUserActiveUsecase } from 'src/usecases/user/set-active/set-user-active.usecase';
import { ResetTwoFactorUserUsecase } from 'src/usecases/user/reset-two-factor/reset-two-factor-user.usecase';
import { Roles } from 'src/infra/web/auth/decorators/roles.decorator';
import { CurrentUser, type RequestUser } from 'src/infra/web/auth/request-user';
import { CreateUserDto, SetUserActiveDto } from './dto/user.dto';

@Roles('ADMIN')
@Controller('users')
export class UserController {
  constructor(
    private readonly createUserUsecase: CreateUserUsecase,
    private readonly listUsersUsecase: ListUsersUsecase,
    private readonly deleteUserUsecase: DeleteUserUsecase,
    private readonly resetPasswordUsecase: ResetPasswordUsecase,
    private readonly setUserActiveUsecase: SetUserActiveUsecase,
    private readonly resetTwoFactorUserUsecase: ResetTwoFactorUserUsecase,
  ) {}

  @Get()
  list() {
    return this.listUsersUsecase.execute();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: RequestUser, @Body() body: CreateUserDto) {
    return this.createUserUsecase.execute(body, user.username);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.deleteUserUsecase.execute(id, user.userId, user.username);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.resetPasswordUsecase.execute(id, user.username);
  }

  // Remove a verificação em 2 etapas de quem perdeu o celular
  @Post(':id/reset-two-factor')
  @HttpCode(HttpStatus.OK)
  resetTwoFactor(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.resetTwoFactorUserUsecase.execute(id, user.username);
  }

  @Patch(':id/active')
  @HttpCode(HttpStatus.OK)
  setActive(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: SetUserActiveDto) {
    return this.setUserActiveUsecase.execute(id, body.active, user.userId, user.username);
  }
}
