import type { PaymentMethod, TableStatus } from '@comanda/shared'
import { http } from './http'

export type { PaymentMethod }

export interface Table {
  id: string
  identifier: string // número ou nome (ex: 5, A3, Varanda)
  capacity: number
  status: TableStatus
  clientName: string | null
  openedAt: string
  subtotal: number // pedidos ativos, sem taxa (centavos)
  serviceFee: number
  total: number // com taxa: é o que a mesa paga
  inKitchen: number // pedidos aguardando ou em preparo (impedem fechar a conta)
  undelivered: number // pedidos ainda não entregues (inclui os prontos)
}

export interface Payment {
  method: PaymentMethod
  amount: number // centavos
  installments: number // parcelas (só crédito; demais = 1)
}

export const listTables = () => http.get<Table[]>('/tables')

export const openTable = (data: { identifier: string; clientName?: string }) =>
  http.post<{ id: string; message: string }>('/tables/open', data)

export const closeTable = (tableId: string, payments: Payment[]) =>
  http.post<{ success: boolean; total: number }>(`/tables/${tableId}/close`, { payments })
