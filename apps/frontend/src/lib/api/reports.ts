import { http } from './http'
import { Payment, PaymentMethod } from './tables'

export type PaymentSummary = { method: PaymentMethod; count: number; amount: number }[]

export interface Reports {
  from: string
  to: string
  revenue: { subtotal: number; serviceFee: number; total: number; accounts: number }
  topEmployees: { name: string; username: string; subtotal: number; orders: number }[]
  topBeers: { name: string; quantity: number; subtotal: number }[]
  topMeats: { name: string; grams: number; subtotal: number }[]
  byCategory: { category: string; subtotal: number }[]
  averageTicket: number
  byPayment: PaymentSummary
}

export interface ClosedAccount {
  id: string
  tableIdentifier: string
  clientName: string | null
  openedAt: string
  closedAt: string
  closedBy: string
  subtotal: number
  serviceFee: number
  total: number
  divergent: boolean
  payments: Payment[]
  orders: {
    id: string
    createdAt: string
    waiter: string
    subtotal: number
    items: { productName: string; isMeat: boolean; quantity: number; unitPrice: number; subtotal: number; notes: string | null }[]
  }[]
}

export interface ClosedAccountsResult {
  accounts: ClosedAccount[]
  summary: { count: number; subtotal: number; serviceFee: number; total: number; byPayment: PaymentSummary }
}

export interface AuditLog {
  id: string
  action: string
  actor: string
  details: string
  createdAt: string
}

// Datas no formato AAAA-MM-DD (horário de Brasília), período inclusivo
export const getReports = (from: string, to: string) => http.get<Reports>(`/reports?from=${from}&to=${to}`)

export const listClosedAccounts = (from: string, to: string) =>
  http.get<ClosedAccountsResult>(`/closed-accounts?from=${from}&to=${to}`)

export function listLogs(from: string, to: string, action?: string): Promise<AuditLog[]> {
  const type = action ? `&action=${encodeURIComponent(action)}` : ''
  return http.get<AuditLog[]>(`/logs?from=${from}&to=${to}${type}`)
}
