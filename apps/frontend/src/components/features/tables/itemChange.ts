import {
  ITEM_CHANGE_REASONS,
  RETURNS_TO_STOCK,
  type ItemChangeReason,
  type OrderStatus,
  type UserRole,
} from '@comanda/shared';

const IN_ACCOUNT: OrderStatus[] = ['PENDING', 'PREPARING', 'READY', 'DELIVERED'];

// Garçom só mexe antes da cozinha começar; gerente e admin enquanto o pedido está na conta
export function canChangeItem(role: UserRole, status: OrderStatus): boolean {
  if (role === 'GARCOM') return status === 'PENDING';
  if (role === 'GERENTE' || role === 'ADMIN') return IN_ACCOUNT.includes(status);
  return false;
}

// Perda (não volta ao estoque) é só para gerente e admin
export function reasonsFor(role: UserRole): ItemChangeReason[] {
  return ITEM_CHANGE_REASONS.filter((r) => role !== 'GARCOM' || RETURNS_TO_STOCK[r]);
}

// Nova quantidade digitada (unidades ou gramas): inteiro de 0 até a atual − 1, senão null
export function parseNewQuantity(text: string, current: number): number | null {
  const t = text.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n < current ? n : null;
}
