import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from 'src/infra/services/jwt/jwt.service';
import { UserRepository } from 'src/domain/repositories/user.repository.interface';
import { AppError } from 'src/shared/errors/app-error';
import type { RequestUser } from './request-user';

// Aceita a sessão normal (Bearer) OU o token provisório do login (body.challengeToken).
// Usado para configurar a verificação em 2 etapas: Admin/Gerente fazem isso
// durante o 1º login, antes de terem uma sessão. As rotas são @IsPublic para o AuthGuard global.
@Injectable()
export class AuthOrChallengeGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const challengeToken: string | undefined = request.body?.challengeToken;

    let userId: string;
    if (challengeToken) {
      try {
        const challenge = this.jwtService.verifyChallenge(challengeToken);
        if (challenge.step !== 'setup') throw new Error();
        userId = challenge.userId;
      } catch {
        throw AppError.unauthorized(
          'CHALLENGE_EXPIRED',
          'O tempo para configurar acabou. Entre com usuário e senha de novo.',
        );
      }
      request.duringLogin = true;
    } else {
      const [type, token] = (request.headers.authorization ?? '').split(' ');
      if (type !== 'Bearer' || !token) throw AppError.unauthorized('UNAUTHORIZED', 'Token não fornecido');
      try {
        userId = this.jwtService.verify(token).userId;
      } catch {
        throw AppError.unauthorized('UNAUTHORIZED', 'Sessão inválida. Entre de novo.');
      }
      request.duringLogin = false;
    }

    const user = await this.userRepository.findById(userId);
    if (!user || !user.getActive())
      throw AppError.unauthorized('UNAUTHORIZED', 'Sessão inválida. Entre de novo.');
    const current: RequestUser = {
      userId: user.getId(),
      username: user.getUsername(),
      name: user.getName(),
      role: user.getRole(),
    };
    request.user = current;
    return true;
  }
}
