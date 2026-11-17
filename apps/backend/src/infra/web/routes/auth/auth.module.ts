import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthOrChallengeGuard } from 'src/infra/web/auth/auth-or-challenge.guard';
import { LoginUsecase } from 'src/usecases/auth/login/login.usecase';
import { ChangePasswordUsecase } from 'src/usecases/auth/change-password/change-password.usecase';
import { GetMeUsecase } from 'src/usecases/auth/get-me/get-me.usecase';
import { SetupTwoFactorUsecase } from 'src/usecases/two-factor/setup/setup-two-factor.usecase';
import { EnableTwoFactorUsecase } from 'src/usecases/two-factor/enable/enable-two-factor.usecase';
import { VerifyTwoFactorUsecase } from 'src/usecases/two-factor/verify/verify-two-factor.usecase';
import { DisableTwoFactorUsecase } from 'src/usecases/two-factor/disable/disable-two-factor.usecase';
import { GetStatusTwoFactorUsecase } from 'src/usecases/two-factor/get-status/get-status-two-factor.usecase';

@Module({
  controllers: [AuthController],
  providers: [
    AuthOrChallengeGuard,
    LoginUsecase,
    ChangePasswordUsecase,
    GetMeUsecase,
    SetupTwoFactorUsecase,
    EnableTwoFactorUsecase,
    VerifyTwoFactorUsecase,
    DisableTwoFactorUsecase,
    GetStatusTwoFactorUsecase,
  ],
})
export class AuthModule {}
