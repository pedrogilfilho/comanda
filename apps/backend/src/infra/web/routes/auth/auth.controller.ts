import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { LoginUsecase } from 'src/usecases/auth/login/login.usecase';
import { ChangePasswordUsecase } from 'src/usecases/auth/change-password/change-password.usecase';
import { GetMeUsecase } from 'src/usecases/auth/get-me/get-me.usecase';
import { SetupTwoFactorUsecase } from 'src/usecases/two-factor/setup/setup-two-factor.usecase';
import { EnableTwoFactorUsecase } from 'src/usecases/two-factor/enable/enable-two-factor.usecase';
import { VerifyTwoFactorUsecase } from 'src/usecases/two-factor/verify/verify-two-factor.usecase';
import { DisableTwoFactorUsecase } from 'src/usecases/two-factor/disable/disable-two-factor.usecase';
import { GetStatusTwoFactorUsecase } from 'src/usecases/two-factor/get-status/get-status-two-factor.usecase';
import { IsPublic } from 'src/infra/web/auth/decorators/is-public.decorator';
import { AllowPasswordPending } from 'src/infra/web/auth/decorators/allow-password-pending.decorator';
import { AuthOrChallengeGuard } from 'src/infra/web/auth/auth-or-challenge.guard';
import { CurrentUser, type RequestUser } from 'src/infra/web/auth/request-user';
import { ChangePasswordDto, LoginDto, TwoFactorCodeDto, VerifyTwoFactorDto } from './dto/auth.dto';

// Login e 2ª etapa têm limite de tentativas por IP (10 por minuto)
const LOGIN_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUsecase: LoginUsecase,
    private readonly changePasswordUsecase: ChangePasswordUsecase,
    private readonly getMeUsecase: GetMeUsecase,
    private readonly setupTwoFactorUsecase: SetupTwoFactorUsecase,
    private readonly enableTwoFactorUsecase: EnableTwoFactorUsecase,
    private readonly verifyTwoFactorUsecase: VerifyTwoFactorUsecase,
    private readonly disableTwoFactorUsecase: DisableTwoFactorUsecase,
    private readonly getStatusTwoFactorUsecase: GetStatusTwoFactorUsecase,
  ) {}

  @IsPublic()
  @UseGuards(ThrottlerGuard)
  @Throttle(LOGIN_LIMIT)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDto) {
    return this.loginUsecase.execute(body.username, body.password);
  }

  @AllowPasswordPending()
  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.getMeUsecase.execute(user.userId);
  }

  @AllowPasswordPending()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(@CurrentUser() user: RequestUser, @Body() body: ChangePasswordDto) {
    return this.changePasswordUsecase.execute(user.userId, body.newPassword, body.currentPassword);
  }

  // ── Verificação em 2 etapas ──

  // 2ª etapa do login (código do app ou de recuperação)
  @IsPublic()
  @UseGuards(ThrottlerGuard)
  @Throttle(LOGIN_LIMIT)
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  verifyTwoFactor(@Body() body: VerifyTwoFactorDto) {
    return this.verifyTwoFactorUsecase.execute(body.challengeToken, body.code);
  }

  // Setup/enable aceitam a sessão normal ou o token provisório do 1º login (Admin/Gerente)
  @IsPublic()
  @UseGuards(AuthOrChallengeGuard)
  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  setupTwoFactor(@CurrentUser() user: RequestUser) {
    return this.setupTwoFactorUsecase.execute(user.userId);
  }

  @IsPublic()
  @UseGuards(AuthOrChallengeGuard)
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  enableTwoFactor(@CurrentUser() user: RequestUser, @Body() body: TwoFactorCodeDto, @Req() req: { duringLogin: boolean }) {
    return this.enableTwoFactorUsecase.execute(user.userId, body.code, req.duringLogin);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  disableTwoFactor(@CurrentUser() user: RequestUser, @Body() body: TwoFactorCodeDto) {
    return this.disableTwoFactorUsecase.execute(user.userId, body.code);
  }

  @AllowPasswordPending()
  @Get('2fa/status')
  twoFactorStatus(@CurrentUser() user: RequestUser) {
    return this.getStatusTwoFactorUsecase.execute(user.userId);
  }

  @IsPublic()
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
