import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@comanda/shared';
import { AppError } from 'src/shared/errors/app-error';
import { ROLES_KEY } from './decorators/roles.decorator';
import type { RequestUser } from './request-user';

// Global, roda depois do AuthGuard. Sem @Roles na rota, qualquer usuário autenticado passa.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles || roles.length === 0) return true;
    const user: RequestUser | undefined = context.switchToHttp().getRequest().user;
    if (!user) return true; // rota pública
    if (!roles.includes(user.role)) throw AppError.forbidden('Você não tem permissão para esta ação');
    return true;
  }
}
