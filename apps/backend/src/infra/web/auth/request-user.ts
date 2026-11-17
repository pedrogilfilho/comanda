import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserRole } from '@comanda/shared';

// Quem está fazendo a requisição, já conferido pelo AuthGuard
export interface RequestUser {
  userId: string;
  username: string;
  name: string;
  role: UserRole;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestUser => {
  return ctx.switchToHttp().getRequest().user;
});
