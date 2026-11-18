import type { OrderStatus } from '@comanda/shared'
import { http } from './http'

export interface OrderItemView {
  id: string
  productId: string
  productName: string
  isMeat: boolean
  quantity: number
  unitPrice: number
  subtotal: number
  notes: string | null
}

export interface OrderView {
  id: string
  status: OrderStatus
  createdAt: string
  items: OrderItemView[]
  subtotal: number
}

export interface TableAccount {
  orders: OrderView[]
  subtotal: number
  serviceFee: number
  total: number
}

export interface KitchenOrder {
  id: string
  tableIdentifier: string
  clientName: string | null
  status: OrderStatus
  createdAt: string
  items: { productName: string; quantity: number; isMeat: boolean; notes: string | null }[]
}

export type OrderStatusChange = Exclude<OrderStatus, 'PENDING' | 'CLOSED'>

export const createOrder = (data: { tableId: string; items: { productId: string; quantity: number; notes?: string }[] }) =>
  http.post<{ id: string; total: number }>('/orders', data)

export const getTableAccount = (tableId: string) => http.get<TableAccount>(`/orders/table/${tableId}`)

export const listKitchenOrders = () => http.get<KitchenOrder[]>('/orders/kitchen')

// Cancelar (status CANCELLED) é só para Gerente e Admin; o backend repõe o estoque
export const updateOrderStatus = (orderId: string, status: OrderStatusChange, reason?: string) =>
  http.patch<{ success: boolean }>(`/orders/${orderId}/status`, { status, reason })
