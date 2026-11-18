import type { Reports, ClosedAccountsResult, AuditLog } from '@/types/api'
import { http } from './http'

export type { PaymentSummary, Reports, ClosedAccount, ClosedAccountsResult, AuditLog } from '@/types/api'

// Datas no formato AAAA-MM-DD (horário de Brasília), período inclusivo
export const getReports = (from: string, to: string) => http.get<Reports>(`/reports?from=${from}&to=${to}`)

export const listClosedAccounts = (from: string, to: string) =>
  http.get<ClosedAccountsResult>(`/closed-accounts?from=${from}&to=${to}`)

export function listLogs(from: string, to: string, action?: string): Promise<AuditLog[]> {
  const type = action ? `&action=${encodeURIComponent(action)}` : ''
  return http.get<AuditLog[]>(`/logs?from=${from}&to=${to}${type}`)
}
