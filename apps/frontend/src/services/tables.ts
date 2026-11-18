import type { Table, Payment } from '@/types/api'
import { http } from './http'

export type { Table, Payment } from '@/types/api'

export const listTables = () => http.get<Table[]>('/tables')

export const openTable = (data: { identifier: string; clientName?: string }) =>
  http.post<{ id: string; message: string }>('/tables/open', data)

export const closeTable = (tableId: string, payments: Payment[]) =>
  http.post<{ success: boolean; total: number }>(`/tables/${tableId}/close`, { payments })
