'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_TOTAL_TABLES } from '@comanda/shared';
import { errorMessage } from '@/services/http';
import { listTables } from '@/services/tables';
import { getSettings } from '@/services/settings';
import type { Table } from '@/types/api';
import { money } from '@/lib/format';
import { cx } from '@/lib/cx';
import { POLL_MS } from '@/constants';
import { useSession } from '@/hooks/useSession';
import { usePolling } from '@/hooks/usePolling';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import PageTitle from '@/components/ui/PageTitle';
import StatTile from '@/components/ui/StatTile';
import { SkeletonList } from '@/components/ui/Skeleton';
import OpenTableDialog from './OpenTableDialog';
import OrdersDialog from './OrdersDialog';
import AddItemsDialog from './AddItemsDialog';
import TableAccountDialog from './TableAccountDialog';
import PickTableDialog from './PickTableDialog';
import { buildTableMap, openFor } from './tableMap';

type Modal =
  | { kind: 'open'; identifier: string }
  | { kind: 'pick' }
  | { kind: 'actions' | 'orders' | 'account'; table: Table }
  | { kind: 'addItems'; table: Table; back: 'orders' | 'none' }
  | null;

// Salão: mapa das mesas, pedidos e fechamento de conta (garçom, gerente e admin)
export default function TablesView() {
  const { user } = useSession();
  const isManager = user.role !== 'GARCOM';
  const [tables, setTables] = useState<Table[]>([]);
  const [total, setTotal] = useState(DEFAULT_TOTAL_TABLES);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const [list, settings] = await Promise.all([listTables(), getSettings()]);
      setTables(list);
      setTotal(settings.totalTables);
      setNow(Date.now());
    } catch (e) {
      toast.error(errorMessage(e, 'Erro ao carregar mesas'));
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // Pausa com diálogo aberto: a lista não muda embaixo de quem está lançando
  usePolling(load, POLL_MS, { enabled: modal === null });

  const slots = useMemo(() => buildTableMap(tables, total), [tables, total]);
  const occupied = slots.flatMap((s) => (s.table ? [s.table] : []));
  const free = slots.length - occupied.length;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Mesas"
        subtitle={isManager ? 'Mesas em funcionamento e fechamento de contas' : 'Mesas em funcionamento'}
        actions={
          <>
            <Button
              icon={Plus}
              disabled={occupied.length === 0}
              title={occupied.length === 0 ? 'Nenhuma mesa aberta' : undefined}
              onClick={() => setModal({ kind: 'pick' })}
            >
              Adicionar itens
            </Button>
          </>
        }
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
        <StatTile label="Mesas livres" value={Math.max(free, 0)} />
      </div>

      {loading ? (
        <SkeletonList rows={2} className="h-36" />
      ) : (
        <ul
          aria-label="Mapa de mesas"
          className="grid grid-cols-3 gap-2 min-[420px]:grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8"
        >
          {slots.map(({ number, table: t }) => (
            <li key={number}>
              {t ? (
                <button
                  type="button"
                  onClick={() => setModal({ kind: 'actions', table: t })}
                  aria-label={`Mesa ${number}, ocupada${t.clientName ? ` por ${t.clientName}` : ''}`}
                  className="flex h-full min-h-24 w-full flex-col gap-1 rounded-md border border-accent/50 bg-accent/10 p-2 text-left hover:bg-accent/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span className="flex items-start justify-between gap-1">
                    <span className="font-display text-xl font-bold leading-none text-ink break-all">
                      {number}
                    </span>
                    {t.inKitchen > 0 && <Badge tone="warning">{t.inKitchen}</Badge>}
                  </span>
                  <span className="truncate text-xs text-ink">{t.clientName ?? 'Sem nome'}</span>
                  <span className="text-sm font-semibold text-accent-strong tabular-nums">
                    {money(t.total)}
                  </span>
                  <span className="mt-auto text-xs text-ink-muted tabular-nums">
                    {openFor(t.openedAt, now)}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setModal({ kind: 'open', identifier: number })}
                  aria-label={`Mesa ${number}, livre`}
                  className={cx(
                    'flex h-full min-h-24 w-full flex-col items-center justify-center rounded-md border border-hairline bg-surface p-2',
                    'text-ink-muted hover:border-accent hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent',
                  )}
                >
                  <span className="font-display text-xl font-bold leading-none">{number}</span>
                  <span className="mt-1 text-xs">Livre</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {modal?.kind === 'open' && (
        <OpenTableDialog identifier={modal.identifier} onClose={() => setModal(null)} onOpened={load} />
      )}

      {modal?.kind === 'pick' && (
        <PickTableDialog
          tables={occupied}
          onClose={() => setModal(null)}
          onPick={(t) => setModal({ kind: 'addItems', table: t, back: 'none' })}
        />
      )}

      {modal?.kind === 'actions' && (
        <Dialog
          title={`Mesa ${modal.table.identifier}`}
          description={[modal.table.clientName, modal.table.openedBy && `aberta por ${modal.table.openedBy}`]
            .filter(Boolean)
            .join(' · ')}
          size="sm"
          onClose={() => setModal(null)}
        >
          <div className="grid gap-2">
            <Button
              icon={Plus}
              onClick={() => setModal({ kind: 'addItems', table: modal.table, back: 'none' })}
            >
              Adicionar itens
            </Button>
            <Button variant="secondary" onClick={() => setModal({ kind: 'orders', table: modal.table })}>
              Ver pedidos
            </Button>
            <Button variant="secondary" onClick={() => setModal({ kind: 'account', table: modal.table })}>
              Ver conta
            </Button>
          </div>
        </Dialog>
      )}

      {modal?.kind === 'orders' && (
        <OrdersDialog
          table={modal.table}
          onClose={() => setModal(null)}
          onAddItems={() => setModal({ kind: 'addItems', table: modal.table, back: 'orders' })}
          onChanged={load}
        />
      )}

      {modal?.kind === 'addItems' && (
        <AddItemsDialog
          tableId={modal.table.id}
          tableIdentifier={modal.table.identifier}
          onClose={() => setModal(modal.back === 'orders' ? { kind: 'orders', table: modal.table } : null)}
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
