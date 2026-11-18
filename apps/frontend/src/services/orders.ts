import type { TableAccount, KitchenOrder, OrderStatusChange } from '@/types/api';
import { http } from './http';

export type { OrderItemView, OrderView, TableAccount, KitchenOrder, OrderStatusChange } from '@/types/api';

export const createOrder = (data: {
  tableId: string;
  items: { productId: string; quantity: number; notes?: string }[];
}) => http.post<{ id: string; total: number }>('/orders', data);

export const getTableAccount = (tableId: string) => http.get<TableAccount>(`/orders/table/${tableId}`);

export const listKitchenOrders = () => http.get<KitchenOrder[]>('/orders/kitchen');

// Cancelar (status CANCELLED) é só para Gerente e Admin; o backend repõe o estoque
export const updateOrderStatus = (orderId: string, status: OrderStatusChange, reason?: string) =>
  http.patch<{ success: boolean }>(`/orders/${orderId}/status`, { status, reason });
