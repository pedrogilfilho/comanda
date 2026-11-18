import type { UserRole } from '@comanda/shared'
import { http } from './http'

export interface LoggedUser {
  id: string
  username: string
  name: string
  email: string | null
  role: UserRole
  needsPasswordChange: boolean
  twoFactorEnabled: boolean
}

export interface AuthSession {
  status: 'OK'
  accessToken: string
  user: LoggedUser
  recoveryCodesLeft?: number // só quando entrou com um código de recuperação
}

// O login pode pedir a 2ª etapa (código do app) ou a configuração obrigatória (Admin/Gerente)
export type LoginResponse =
  | AuthSession
  | { status: 'TWO_FACTOR_REQUIRED'; challengeToken: string }
  | { status: 'TWO_FACTOR_SETUP_REQUIRED'; challengeToken: string }

export interface TwoFactorSetup {
  qrCode: string // imagem (data URL)
  secret: string // chave para digitar à mão
  otpauthUrl: string
}

export interface TwoFactorStatus {
  enabled: boolean
  required: boolean
  recoveryCodesLeft: number
}

// Etapas do login não têm sessão: 401 aqui é credencial errada, não sessão vencida
const publicPost = <T>(endpoint: string, body: unknown) => http.post<T>(endpoint, body, { auth: false })

export const login = (username: string, password: string) =>
  publicPost<LoginResponse>('/auth/login', { username, password })

// 2ª etapa do login: código de 6 dígitos do app ou código de recuperação
export const verifyTwoFactor = (challengeToken: string, code: string) =>
  publicPost<AuthSession>('/auth/2fa/verify', { challengeToken, code })

// Configuração obrigatória durante o login (Admin/Gerente ainda sem 2 etapas)
export const setupTwoFactorDuringLogin = (challengeToken: string) =>
  publicPost<TwoFactorSetup>('/auth/2fa/setup', { challengeToken })

export const enableTwoFactorDuringLogin = (challengeToken: string, code: string) =>
  publicPost<{ recoveryCodes: string[]; session: AuthSession }>('/auth/2fa/enable', { challengeToken, code })

// Dados atuais do usuário logado (a fonte da verdade da sessão)
export const getMe = () => http.get<LoggedUser>('/auth/me')

// Usuário já logado (página Segurança)
export const getTwoFactorStatus = () => http.get<TwoFactorStatus>('/auth/2fa/status')
export const setupTwoFactor = () => http.post<TwoFactorSetup>('/auth/2fa/setup')
export const enableTwoFactor = (code: string) => http.post<{ recoveryCodes: string[] }>('/auth/2fa/enable', { code })
export const disableTwoFactor = (code: string) => http.post<{ success: boolean }>('/auth/2fa/disable', { code })

// No 1º acesso a senha atual não é pedida; depois disso é obrigatória
export const changePassword = (newPassword: string, currentPassword?: string) =>
  http.post<{ success: boolean }>('/auth/change-password', { newPassword, currentPassword })
