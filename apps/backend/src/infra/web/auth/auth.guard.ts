import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { JwtService } from 'src/infra/services/jwt/jwt.service';
import { UserRepository } from 'src/domain/repositories/user.repository.interface';
import { AppError } from 'src/shared/errors/app-error';
import { IS_PUBLIC_KEY } from './decorators/is-public.decorator';
import { ALLOW_PASSWORD_PENDING_KEY } from './decorators/allow-password-pending.decorator';
import type { RequestUser } from './request-user';

// Global: valida o token e carrega o usuário a cada requisição, para que desativar alguém
// ou exigir troca de senha tenha efeito na hora, e não só quando o token vencer.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const token = this.extractToken(request);
    if (!token) throw AppError.unauthorized('UNAUTHORIZED', 'Token não fornecido');

    let userId: string;
    try {
      userId = this.jwtService.verify(token).userId;
    } catch {
      throw AppError.unauthorized('UNAUTHORIZED', 'Sessão inválida. Entre de novo.');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) throw AppError.unauthorized('UNAUTHORIZED', 'Sessão inválida. Entre de novo.');
    if (!user.getActive())
      throw AppError.unauthorized('USER_INACTIVE', 'Usuário desativado. Procure o administrador.');

    const allowPending = this.reflector.getAllAndOverride<boolean>(ALLOW_PASSWORD_PENDING_KEY, targets);
    if (user.getNeedsPasswordChange() && !allowPending) {
      throw AppError.forbidden('Troque a senha antes de continuar.', 'PASSWORD_CHANGE_REQUIRED');
    }

    request.user = {
      userId: user.getId(),
      username: user.getUsername(),
      name: user.getName(),
      role: user.getRole(),
    };
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = (request.headers.authorization ?? '').split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
