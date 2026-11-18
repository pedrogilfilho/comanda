'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import { ORDER_STATUS_LABEL, canTransition, type OrderStatus } from '@comanda/shared';
import { errorMessage } from '@/services/http';
import { getTableAccount, updateOrderStatus } from '@/services/orders';
import type { OrderItemView, OrderView, Table, TableAccount } from '@/types/api';
import { money, weight, time } from '@/lib/format';
import { useSession } from '@/hooks/useSession';
import Badge, { type BadgeTone } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Dialog from '@/components/ui/Dialog';
import EmptyState from '@/components/ui/EmptyState';
import Field, { Input } from '@/components/ui/Field';
import { SkeletonList } from '@/components/ui/Skeleton';
import ChangeItemDialog from './ChangeItemDialog';
import { canChangeItem } from './itemChange';

const STATUS_TONE: Partial<Record<OrderStatus, BadgeTone>> = {
  PENDING: 'neutral',
  PREPARING: 'warning',
  READY: 'success',
  DELIVERED: 'success',
};

interface OrdersDialogProps {
  table: Table;
  onClose: () => void;
  onAddItems: () => void;
  onChanged: () => void; // algo mudou na mesa (ex.: pedido cancelado)
}

export default function OrdersDialog({ table, onClose, onAddItems, onChanged }: OrdersDialogProps) {
  const { user } = useSession();
  const canCancel = user.role === 'GERENTE' || user.role === 'ADMIN';
  const [account, setAccount] = useState<TableAccount | null>(null);
  const [toCancel, setToCancel] = useState<OrderView | null>(null);
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [toChange, setToChange] = useState<{ orderId: string; item: OrderItemView } | null>(null);

  const load = useCallback(async () => {
    try {
      setAccount(await getTableAccount(table.id));
    } catch (e) {
      toast.error(errorMessage(e, 'Erro ao carregar pedidos'));
    }
  }, [table.id]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmCancel = async () => {
    if (!toCancel) return;
    setCancelling(true);
    try {
      await updateOrderStatus(toCancel.id, 'CANCELLED', reason.trim() || undefined);
      toast.success('Pedido cancelado e estoque devolvido');
      setToCancel(null);
      setReason('');
      await load();
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e, 'Erro ao cancelar o pedido'));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <Dialog
        title={`Pedidos da mesa ${table.identifier}`}
        onClose={onClose}
        footer={
          <Button block icon={Plus} onClick={onAddItems}>
            Adicionar itens
          </Button>
        }
      >
        {!account ? (
          <SkeletonList rows={2} className="h-24" />
        ) : account.orders.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="Nenhum pedido lançado"
            description="Os pedidos desta mesa aparecem aqui."
          />
        ) : (
          <ul className="space-y-3">
            {account.orders.map((o) => (
              <li key={o.id} className="rounded-md border border-hairline p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Badge tone={STATUS_TONE[o.status] ?? 'neutral'}>
                      {ORDER_STATUS_LABEL[o.status] ?? o.status}
                    </Badge>
                    <span className="text-xs text-ink-muted tabular-nums">{time(o.createdAt)}</span>
                  </span>
                  <span className="text-sm font-semibold text-accent-strong tabular-nums">
                    {money(o.subtotal)}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {o.items.map((it) => (
                    <li key={it.id} className="flex justify-between gap-3 text-sm text-ink">
                      <span className="min-w-0">
                        {it.productName}{' '}
                        <span className="text-ink-muted">
                          {it.isMeat ? weight(it.quantity) : `x${it.quantity}`}
                        </span>
                        {it.notes && <span className="block text-xs text-warning">Obs.: {it.notes}</span>}
                      </span>
                      <span className="flex items-center gap-2 whitespace-nowrap tabular-nums">
                        {money(it.subtotal)}
                        {canChangeItem(user.role, o.status) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Alterar ${it.productName}`}
                            onClick={() => setToChange({ orderId: o.id, item: it })}
                          >
                            Alterar
                          </Button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                {canCancel && canTransition(o.status, 'CANCELLED') && (
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setReason('');
                        setToCancel(o);
                      }}
                    >
                      Cancelar pedido
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Dialog>

      {toChange && (
        <ChangeItemDialog
          orderId={toChange.orderId}
          item={toChange.item}
          role={user.role}
          onClose={() => setToChange(null)}
          onChanged={() => {
            load();
            onChanged();
          }}
        />
      )}

      {toCancel && (
        <ConfirmDialog
          title="Cancelar pedido"
          message={
            <>
              O pedido das {time(toCancel.createdAt)} ({money(toCancel.subtotal)}) sai da conta e os itens
              voltam para o estoque.
            </>
          }
          confirmLabel="Cancelar pedido"
          tone="danger"
          loading={cancelling}
          onConfirm={confirmCancel}
          onCancel={() => setToCancel(null)}
        >
          <Field label="Motivo" htmlFor="cancel-reason" optional hint="Ex.: cliente desistiu">
            <Input
              id="cancel-reason"
              value={reason}
              maxLength={120}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </ConfirmDialog>
      )}
    </>
  );
}
