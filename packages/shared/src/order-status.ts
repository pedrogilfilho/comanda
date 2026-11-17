import type { OrderStatus } from './domain';

// Máquina de estados do pedido. CLOSED só acontece pelo fechamento da conta, nunca por esta tabela.
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  CLOSED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

// Próximo passo "natural" na fila da cozinha
export const NEXT_ORDER_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'PREPARING',
  PREPARING: 'READY',
  READY: 'DELIVERED',
};

// Pedidos que ainda contam na conta da mesa
export const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = ['PENDING', 'PREPARING', 'READY', 'DELIVERED'];
// Pedidos que a cozinha ainda vê na fila
export const KITCHEN_ORDER_STATUSES: readonly OrderStatus[] = ['PENDING', 'PREPARING', 'READY'];
// Pedidos que impedem fechar a conta (ainda sendo preparados)
export const IN_KITCHEN_STATUSES: readonly OrderStatus[] = ['PENDING', 'PREPARING'];

export const isActiveOrder = (s: OrderStatus) => ACTIVE_ORDER_STATUSES.includes(s);
export const isInKitchen = (s: OrderStatus) => IN_KITCHEN_STATUSES.includes(s);
export const isUndelivered = (s: OrderStatus) => KITCHEN_ORDER_STATUSES.includes(s);
