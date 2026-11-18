'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChefHat, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { NEXT_ORDER_STATUS, ORDER_STATUS_LABEL, type OrderStatus } from '@comanda/shared';
import { errorMessage } from '@/services/http';
import { listKitchenOrders, updateOrderStatus } from '@/services/orders';
import type { KitchenOrder } from '@/types/api';
import { weight, time } from '@/lib/format';
import { POLL_MS } from '@/constants';
import { usePolling } from '@/hooks/usePolling';
import Badge, { type BadgeTone } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import PageTitle from '@/components/ui/PageTitle';
import { SkeletonList } from '@/components/ui/Skeleton';

// Botão da cozinha para o próximo passo do pedido
const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  PENDING: 'Iniciar preparo',
  PREPARING: 'Marcar como pronto',
  READY: 'Marcar como entregue',
};

const TONE: Partial<Record<OrderStatus, { card: 'default' | 'accent' | 'success'; badge: BadgeTone }>> = {
  PENDING: { card: 'default', badge: 'neutral' },
  PREPARING: { card: 'accent', badge: 'warning' },
  READY: { card: 'success', badge: 'success' },
};

export default function KitchenQueue() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOrders(await listKitchenOrders());
    } catch (e) {
      toast.error(errorMessage(e, 'Erro ao carregar a fila'));
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);
  usePolling(load, POLL_MS);

  const advance = async (o: KitchenOrder) => {
    const next = NEXT_ORDER_STATUS[o.status];
    if (!next || next === 'PENDING' || next === 'CLOSED') return;
    setBusy(o.id);
    try {
      await updateOrderStatus(o.id, next);
      await load();
    } catch (e) {
      toast.error(errorMessage(e, 'Erro ao atualizar status'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title="Fila da cozinha"
        subtitle={`Atualiza sozinha a cada ${POLL_MS / 1000} segundos`}
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={load}>
            Atualizar fila
          </Button>
        }
      />
      {loading ? (
        <SkeletonList rows={2} className="h-36" />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ChefHat}
          title="Nenhum pedido na fila"
          description="Os pedidos novos aparecem aqui sozinhos."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {orders.map((o) => {
            const tone = TONE[o.status] ?? TONE.PENDING!;
            const nextLabel = NEXT_LABEL[o.status];
            return (
              <Card as="li" key={o.id} tone={tone.card} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-bold text-ink">Mesa {o.tableIdentifier}</h2>
                    <p className="text-sm text-ink-muted">
                      {o.clientName ? `${o.clientName} · ` : ''}
                      <span className="tabular-nums">{time(o.createdAt)}</span>
                    </p>
                  </div>
                  <Badge tone={tone.badge}>{ORDER_STATUS_LABEL[o.status] ?? o.status}</Badge>
                </div>
                <ul className="space-y-1">
                  {o.items.map((it, i) => (
                    <li key={i} className="text-base text-ink">
                      {it.productName}{' '}
                      <strong className="tabular-nums">
                        {it.isMeat ? weight(it.quantity) : `x${it.quantity}`}
                      </strong>
                      {it.notes && (
                        <span className="mt-0.5 block w-fit rounded-sm bg-warning/10 px-2 py-0.5 text-sm font-semibold text-warning">
                          Obs.: {it.notes}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {nextLabel && (
                  <Button
                    className="mt-auto w-full sm:w-auto sm:self-end"
                    onClick={() => advance(o)}
                    loading={busy === o.id}
                  >
                    {nextLabel}
                  </Button>
                )}
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
