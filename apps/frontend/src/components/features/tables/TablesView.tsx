'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage } from '@/services/http';
import { listTables } from '@/services/tables';
import type { Table } from '@/types/api';
import { money } from '@/lib/format';
import { POLL_MS } from '@/constants';
import { useSession } from '@/hooks/useSession';
import { usePolling } from '@/hooks/usePolling';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import PageTitle from '@/components/ui/PageTitle';
import StatTile from '@/components/ui/StatTile';
import { SkeletonList } from '@/components/ui/Skeleton';
import OpenTableDialog from './OpenTableDialog';
import OrdersDialog from './OrdersDialog';
import AddItemsDialog from './AddItemsDialog';
import TableAccountDialog from './TableAccountDialog';

type Modal = { kind: 'open' } | { kind: 'orders' | 'addItems' | 'account'; table: Table } | null;

// Salão: mesas abertas, pedidos e fechamento de conta (garçom, gerente e admin)
export default function TablesView() {
  const { user } = useSession();
  const isManager = user.role !== 'GARCOM';
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);

  const load = useCallback(async () => {
    try {
      setTables(await listTables());
    } catch (e) {
      toast.error(errorMessage(e, 'Erro ao carregar mesas'));
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // Pausa com diálogo aberto: a lista não muda embaixo de quem está lançando
  usePolling(load, POLL_MS, { enabled: modal === null });

  const occupied = tables.filter((t) => t.status === 'OCCUPIED');
  const openButton = (
    <Button icon={Plus} onClick={() => setModal({ kind: 'open' })}>
      Abrir mesa
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageTitle
        title="Mesas"
        subtitle={isManager ? 'Mesas em funcionamento e fechamento de contas' : 'Mesas em funcionamento'}
        actions={openButton}
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
        <StatTile label="Mesas ocupadas" value={occupied.length} tone="accent" />
        {isManager ? (
          <StatTile
            label="Em aberto, com taxa"
            value={money(occupied.reduce((s, t) => s + t.total, 0))}
            tone="success"
          />
        ) : (
          <StatTile
            label="Pedidos não entregues"
            value={occupied.reduce((s, t) => s + t.undelivered, 0)}
            tone="success"
          />
        )}
        <StatTile label="Mesas livres" value={tables.filter((t) => t.status === 'FREE').length} />
      </div>

      {loading ? (
        <SkeletonList rows={2} className="h-36" />
      ) : occupied.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Nenhuma mesa aberta"
          description="Abra uma mesa para lançar o primeiro pedido."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
          {occupied.map((t) => (
            <Card as="li" key={t.id} tone="accent" padding="sm" className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-xs text-ink-muted">Mesa</p>
                  <h2 className="font-display text-xl font-bold leading-none text-ink break-words">
                    {t.identifier}
                  </h2>
                </div>
                {t.inKitchen > 0 && <Badge tone="warning">{t.inKitchen} na cozinha</Badge>}
              </div>
              {t.clientName && <p className="truncate text-sm text-ink-muted">{t.clientName}</p>}
              <p className="text-base font-semibold text-accent-strong tabular-nums">
                {money(t.total)} <span className="text-xs font-normal text-ink-muted">com taxa</span>
              </p>
              {/* Lado a lado quando cabem; senão um embaixo do outro, sem quebrar o texto */}
              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 whitespace-nowrap"
                  onClick={() => setModal({ kind: 'orders', table: t })}
                >
                  Ver pedidos
                </Button>
                <Button
                  size="sm"
                  className="flex-1 whitespace-nowrap"
                  onClick={() => setModal({ kind: 'account', table: t })}
                >
                  Ver conta
                </Button>
              </div>
            </Card>
          ))}
        </ul>
      )}

      {modal?.kind === 'open' && <OpenTableDialog onClose={() => setModal(null)} onOpened={load} />}

      {modal?.kind === 'orders' && (
        <OrdersDialog
          table={modal.table}
          onClose={() => setModal(null)}
          onAddItems={() => setModal({ kind: 'addItems', table: modal.table })}
          onChanged={load}
        />
      )}

      {modal?.kind === 'addItems' && (
        <AddItemsDialog
          tableId={modal.table.id}
          tableIdentifier={modal.table.identifier}
          onClose={() => setModal({ kind: 'orders', table: modal.table })}
          onSuccess={load}
        />
      )}

      {modal?.kind === 'account' && (
        <TableAccountDialog
          table={modal.table}
          onClose={() => setModal(null)}
          onClosed={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}
