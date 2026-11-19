'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import {
  ORDER_STATUS_LABEL,
  SERVICE_FEE_RATE,
  canTransition,
  isInKitchen,
  type OrderStatus,
} from '@comanda/shared';
import { errorMessage } from '@/services/http';
import { closeTable } from '@/services/tables';
import { getTableAccount, updateOrderStatus } from '@/services/orders';
import type { OrderItemView, OrderView, PaymentMethod, Table, TableAccount } from '@/types/api';
import { money, weight, time } from '@/lib/format';
import { useSession } from '@/hooks/useSession';
import Badge, { type BadgeTone } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Dialog, { DialogActions } from '@/components/ui/Dialog';
import EmptyState from '@/components/ui/EmptyState';
import Field, { Input } from '@/components/ui/Field';
import { SkeletonList } from '@/components/ui/Skeleton';
import ChangeItemDialog from './ChangeItemDialog';
import PaymentForm, { firstLine, lineCents, type PaymentLine } from './PaymentForm';
import { canChangeItem } from './itemChange';

const STATUS_TONE: Partial<Record<OrderStatus, BadgeTone>> = {
  PENDING: 'neutral',
  PREPARING: 'warning',
  READY: 'success',
  DELIVERED: 'success',
};

const FEE_PERCENT = Math.round(SERVICE_FEE_RATE * 100);

interface TableDialogProps {
  table: Table;
  onClose: () => void;
  onAddItems: () => void;
  onChanged: () => void; // algo mudou na mesa (item alterado, pedido cancelado)
  onClosed: () => void; // conta fechada ou mesa liberada
}

// Tela única da mesa: adicionar itens (em cima), pedidos (meio) e fechar conta (embaixo)
export default function TableDialog({ table, onClose, onAddItems, onChanged, onClosed }: TableDialogProps) {
  const { user } = useSession();
  const isAdmin = user.role === 'ADMIN';
  const canCancel = user.role === 'GERENTE' || isAdmin;
  const [account, setAccount] = useState<TableAccount | null>(null);
  const [toChange, setToChange] = useState<{ orderId: string; item: OrderItemView } | null>(null);
  const [toCancel, setToCancel] = useState<OrderView | null>(null);
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [closing, setClosing] = useState(false);
  const [lines, setLines] = useState<PaymentLine[]>([]);

  const load = useCallback(async () => {
    try {
      setAccount(await getTableAccount(table.id));
    } catch (e) {
      toast.error(errorMessage(e, 'Erro ao carregar a mesa'));
    }
  }, [table.id]);

  useEffect(() => {
    load();
  }, [load]);

  // O total mudou: o pagamento em andamento ficaria com o valor antigo
  const afterChange = async () => {
    setConfirming(false);
    await load();
    onChanged();
  };

  const confirmCancel = async () => {
    if (!toCancel) return;
    setCancelling(true);
    try {
      await updateOrderStatus(toCancel.id, 'CANCELLED', reason.trim() || undefined);
      toast.success('Pedido cancelado e estoque devolvido');
      setToCancel(null);
      setReason('');
      await afterChange();
    } catch (e) {
      toast.error(errorMessage(e, 'Erro ao cancelar o pedido'));
    } finally {
      setCancelling(false);
    }
  };

  const orders = account?.orders ?? [];
  const hasItems = orders.some((o) => o.items.length > 0);
  const inKitchen = orders.filter((o) => isInKitchen(o.status)).length;
  // O backend recusa fechar com pedido aguardando ou em preparo; só o Admin passa por cima
  const blockedByKitchen = inKitchen > 0 && !isAdmin;
  const total = account?.total ?? 0;
  const needsPayment = total > 0;
  const remaining = total - lines.reduce((s, l) => s + lineCents(l), 0);
  const paymentOk =
    !needsPayment ||
    (lines.length > 0 && lines.every((l) => l.method && lineCents(l) > 0) && remaining === 0);

  const startClosing = () => {
    setLines([firstLine(total)]);
    setConfirming(true);
  };

  const handleClose = async () => {
    if (!paymentOk) {
      toast.error(
        lines.some((l) => !l.method)
          ? 'Escolha a forma de pagamento'
          : 'A soma dos pagamentos precisa ser igual ao total',
      );
      return;
    }
    setClosing(true);
    try {
      const payments = needsPayment
        ? lines.map((l) => ({
            method: l.method as PaymentMethod,
            amount: lineCents(l),
            installments: l.method === 'CREDITO' ? l.installments : 1,
          }))
        : [];
      const res = await closeTable(table.id, payments);
      toast.success(
        needsPayment
          ? `Conta da mesa ${table.identifier} fechada: ${money(res.total)}`
          : `Mesa ${table.identifier} liberada`,
      );
      onClosed();
    } catch (e) {
      toast.error(errorMessage(e, 'Erro ao fechar a conta'));
    } finally {
      setClosing(false);
    }
  };

  const footer = confirming ? (
    <DialogActions>
      <Button variant="secondary" onClick={() => setConfirming(false)} disabled={closing}>
        Voltar
      </Button>
      <Button onClick={handleClose} disabled={!paymentOk} loading={closing}>
        {needsPayment ? `Receber ${money(total)}` : 'Liberar mesa'}
      </Button>
    </DialogActions>
  ) : (
    <Button block onClick={startClosing} disabled={!account || blockedByKitchen}>
      {account && !hasItems ? 'Liberar mesa' : 'Fechar conta'}
    </Button>
  );

  return (
    <>
      <Dialog
        title={`Mesa ${table.identifier}`}
        description={[table.clientName, table.openedBy && `aberta por ${table.openedBy}`]
          .filter(Boolean)
          .join(' · ')}
        onClose={onClose}
        dismissible={!closing}
        footer={footer}
      >
        {!confirming && (
          <Button block icon={Plus} onClick={onAddItems} className="mb-4">
            Adicionar itens
          </Button>
        )}

        {!account ? (
          <SkeletonList rows={2} className="h-24" />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="Nenhum pedido lançado"
            description="Os pedidos desta mesa aparecem aqui."
          />
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
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
                        {!confirming && canChangeItem(user.role, o.status) && (
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
                {!confirming && canCancel && canTransition(o.status, 'CANCELLED') && (
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

        {account && hasItems && (
          <dl className="mt-4 space-y-1 border-t border-hairline pt-3 tabular-nums">
            <div className="flex justify-between text-sm">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd>{money(account.subtotal)}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-ink-muted">Taxa de serviço ({FEE_PERCENT}%)</dt>
              <dd>{money(account.serviceFee)}</dd>
            </div>
            <div className="flex justify-between pt-1 text-lg font-bold">
              <dt className="text-ink">Total</dt>
              <dd className="text-accent-strong">{money(account.total)}</dd>
            </div>
          </dl>
        )}

        {inKitchen > 0 && (
          <p role="status" className="mt-3 rounded-md bg-warning/10 p-3 text-sm text-warning">
            {inKitchen} {inKitchen === 1 ? 'pedido ainda está' : 'pedidos ainda estão'} na cozinha.{' '}
            {isAdmin
              ? 'Como administrador, você pode fechar mesmo assim.'
              : 'A conta só pode ser fechada quando estiverem prontos.'}
          </p>
        )}

        {confirming && (
          <div className="mt-5 space-y-3 rounded-md bg-surface-2 p-3">
            {needsPayment ? (
              <PaymentForm lines={lines} remaining={remaining} onChange={setLines} />
            ) : (
              <p className="text-sm text-ink">
                Liberar a mesa <strong>{table.identifier}</strong> sem consumo?
              </p>
            )}
          </div>
        )}
      </Dialog>

      {toChange && (
        <ChangeItemDialog
          orderId={toChange.orderId}
          item={toChange.item}
          role={user.role}
          onClose={() => setToChange(null)}
          onChanged={afterChange}
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
