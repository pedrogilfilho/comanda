import type { UserRole } from '@comanda/shared'
import { http } from './http'

export type { UserRole }

export interface AppUser {
  id: string
  username: string
  name: string
  email: string | null
  role: UserRole
  needsPasswordChange: boolean
  active: boolean
  deactivatedAt: string | null
  deletableAt: string | null // a partir de quando pode ser excluído
  twoFactorEnabled: boolean
  twoFactorRequired: boolean // Admin e Gerente
  createdAt: string
}

export const listUsers = () => http.get<AppUser[]>('/users')

// Senha inicial padrão (troca obrigatória no primeiro login)
export const createUser = (data: { username: string; name: string; role: UserRole; email?: string }) =>
  http.post<{ id: string; message: string }>('/users', data)

export const deleteUser = (id: string) => http.delete<{ success: boolean }>(`/users/${id}`)

export const resetUserPassword = (id: string) => http.post<{ success: boolean }>(`/users/${id}/reset-password`)

export const setUserActive = (id: string, active: boolean) =>
  http.patch<{ success: boolean }>(`/users/${id}/active`, { active })

// Remove a verificação em 2 etapas de quem perdeu o celular
export const resetUserTwoFactor = (id: string) => http.post<{ success: boolean }>(`/users/${id}/reset-two-factor`)
