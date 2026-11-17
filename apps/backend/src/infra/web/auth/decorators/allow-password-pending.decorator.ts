import { SetMetadata } from '@nestjs/common';

export const ALLOW_PASSWORD_PENDING_KEY = 'allowPasswordPending';
// Rotas que um usuário com troca de senha obrigatória ainda pode usar
export const AllowPasswordPending = () => SetMetadata(ALLOW_PASSWORD_PENDING_KEY, true);
