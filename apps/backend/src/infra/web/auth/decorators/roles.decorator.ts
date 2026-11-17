import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@comanda/shared';

export const ROLES_KEY = 'roles';
// Perfis que podem chamar a rota. Sem o decorator, qualquer usuário autenticado pode.
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
