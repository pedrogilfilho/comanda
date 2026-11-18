import { Module } from '@nestjs/common';
import { CreateUserUsecase } from 'src/usecases/user/create/create-user.usecase';
import { ListUsersUsecase } from 'src/usecases/user/list/list-users.usecase';
import { DeleteUserUsecase } from 'src/usecases/user/delete/delete-user.usecase';
import { ResetPasswordUsecase } from 'src/usecases/user/reset-password/reset-password.usecase';
import { SetUserActiveUsecase } from 'src/usecases/user/set-active/set-user-active.usecase';
import { ResetTwoFactorUserUsecase } from 'src/usecases/user/reset-two-factor/reset-two-factor-user.usecase';
import { UserController } from './user.controller';

@Module({
  controllers: [UserController],
  providers: [
    CreateUserUsecase,
    ListUsersUsecase,
    DeleteUserUsecase,
    ResetPasswordUsecase,
    SetUserActiveUsecase,
    ResetTwoFactorUserUsecase,
  ],
})
export class UserModule {}
