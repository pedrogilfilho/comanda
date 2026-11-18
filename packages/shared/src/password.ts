import { PASSWORD_MIN_LENGTH } from './constants';

// Regra única de senha (frontend valida antes de enviar, backend valida de novo): tamanho mínimo e não pode ser só números
export function passwordProblem(password: string): string | null {
  if (!password || password.length < PASSWORD_MIN_LENGTH)
    return `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`;
  if (/^\d+$/.test(password)) return 'A senha não pode ter só números';
  return null;
}
