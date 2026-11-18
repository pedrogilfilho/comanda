import type { OrderStatus } from '@comanda/shared';

// Tempo entre dois instantes (ms): "5 min", "1h05"; nunca negativo (relógios diferentes)
export function duration(from: number, to: number): string {
  const min = Math.max(0, Math.floor((to - from) / 60_000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
}

type Timed = { status: OrderStatus; createdAt: string; startedAt: string | null; readyAt: string | null };

const ms = (iso: string) => new Date(iso).getTime();

// Linha de tempos do cartão da cozinha; pedido antigo sem horários mostra só desde o lançamento
export function kitchenTimes(o: Timed, now: number): string {
  const created = ms(o.createdAt);
  if (o.status === 'PENDING') return `Esperando há ${duration(created, now)}`;
  if (o.status === 'PREPARING' && o.startedAt) {
    const started = ms(o.startedAt);
    return `Esperou ${duration(created, started)} · preparando há ${duration(started, now)}`;
  }
  if (o.status === 'READY' && o.startedAt && o.readyAt) {
    const ready = ms(o.readyAt);
    return `Preparo levou ${duration(ms(o.startedAt), ready)} · pronto há ${duration(ready, now)}`;
  }
  return `Lançado há ${duration(created, now)}`;
}
