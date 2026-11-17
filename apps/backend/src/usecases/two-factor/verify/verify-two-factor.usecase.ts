import { Injectable } from '@nestjs/common';
import { AppError } from 'src/shared/errors/app-error';
import { UserRepository } from 'src/domain/repositories/user.repository.interface';
import { TwoFactorService } from 'src/infra/services/two-factor/two-factor.service';
import { JwtService } from 'src/infra/services/jwt/jwt.service';
import { AuthSession, AuthSessionService } from 'src/infra/services/auth-session/auth-session.service';

export type VerifyTwoFactorResult = AuthSession & { recoveryCodesLeft?: number };

@Injectable()
export class VerifyTwoFactorUsecase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly twoFactorService: TwoFactorService,
    private readonly jwtService: JwtService,
    private readonly authSessionService: AuthSessionService,
  ) {}

  // 2ª etapa do login: troca o token provisório + código pela sessão de verdade
  async execute(challengeToken: string, code: string): Promise<VerifyTwoFactorResult> {
    let challenge: { userId: string; step: string };
    try {
      challenge = this.jwtService.verifyChallenge(challengeToken);
    } catch {
      throw AppError.unauthorized('CHALLENGE_EXPIRED', 'O tempo para digitar o código acabou. Entre com usuário e senha de novo.');
    }
    if (challenge.step !== 'verify') throw AppError.unauthorized('CHALLENGE_EXPIRED', 'Etapa de login inválida. Entre de novo.');

    const user = await this.userRepository.findById(challenge.userId);
    if (!user || !user.getActive() || !user.getTwoFactorEnabled()) {
      throw AppError.unauthorized('CHALLENGE_EXPIRED', 'Não foi possível concluir o login. Entre de novo.');
    }

    const locked = this.twoFactorService.minutesLocked(user.getId());
    if (locked > 0) throw AppError.badRequest('TWO_FACTOR_LOCKED', `Muitas tentativas erradas. Tente de novo em ${locked} min.`);

    const match = this.twoFactorService.matchCode(user.getTwoFactorSecret(), user.getTwoFactorRecoveryCodes(), code);
    if (!match) {
      this.twoFactorService.registerFailure(user.getId());
      throw AppError.badRequest('TWO_FACTOR_INVALID', 'Código inválido');
    }
    this.twoFactorService.clearFailures(user.getId());

    // Código de recuperação vale uma vez só
    if (match === 'RECOVERY') {
      user.consumeRecoveryCode(this.twoFactorService.hashRecoveryCode(code));
      await this.userRepository.update(user);
      return { ...this.authSessionService.issue(user), recoveryCodesLeft: user.getTwoFactorRecoveryCodes().length };
    }
    return this.authSessionService.issue(user);
  }
}
