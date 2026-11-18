import type { AppUser, UserRole } from '@/types/api';
import { http } from './http';

export type { AppUser } from '@/types/api';

export const listUsers = () => http.get<AppUser[]>('/users');

// Senha inicial padrão (troca obrigatória no primeiro login)
export const createUser = (data: { username: string; name: string; role: UserRole; email?: string }) =>
  http.post<{ id: string; message: string }>('/users', data);

export const deleteUser = (id: string) => http.delete<{ success: boolean }>(`/users/${id}`);

export const resetUserPassword = (id: string) =>
  http.post<{ success: boolean }>(`/users/${id}/reset-password`);

export const setUserActive = (id: string, active: boolean) =>
  http.patch<{ success: boolean }>(`/users/${id}/active`, { active });

// Remove a verificação em 2 etapas de quem perdeu o celular
export const resetUserTwoFactor = (id: string) =>
  http.post<{ success: boolean }>(`/users/${id}/reset-two-factor`);
