'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  MAX_INSTALLMENTS,
  PAYMENT_METHODS,
  SERVICE_FEE_RATE,
  installmentValue,
  isInKitchen,
} from '@comanda/shared';
import { errorMessage } from '@/services/http';
import { closeTable } from '@/services/tables';
import type { PaymentMethod, Table } from '@/types/api';
import { getTableAccount, TableAccount } from '@/services/orders';
import { money, weight, toCents, centsToInput, PAYMENT_LABEL } from '@/lib/format';
import { cx } from '@/lib/cx';
import { useSession } from '@/hooks/useSession';
import Button from '@/components/ui/Button';
import Dialog, { DialogActions } from '@/components/ui/Dialog';
import Field, { Input, Select } from '@/components/ui/Field';
import Skeleton from '@/components/ui/Skeleton';

interface TableAccountDialogProps {
  table: Table;
  onClose: () => void;
  onClosed: () => void;
}

interface PaymentLine {
  method: PaymentMethod | null;
  amount: string; // R$ digitado
  installments: number;
  received: string; // dinheiro entregue pelo cliente (só para calcular troco)
}

const FEE_PERCENT = Math.round(SERVICE_FEE_RATE * 100);

export default function TableAccountDialog({ table, onClose, onClosed }: TableAccountDialogProps) {
  const { user } = useSession();
  const isAdmin = user.role === 'ADMIN';
  const [account, setAccount] = useState<TableAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [lines, setLines] = useState<PaymentLine[]>([]);

  useEffect(() => {
    getTableAccount(table.id)
      .then(setAccount)
      .catch((e) => toast.error(errorMessage(e, 'Erro ao carregar a conta')))
      .finally(() => setLoading(false));
  }, [table.id]);

  const items = account?.orders.flatMap((o) => o.items) ?? [];
  const inKitchen = account?.orders.filter((o) => isInKitchen(o.status)).length ?? 0;
  // O backend recusa fechar com pedido aguardando ou em preparo; só o Admin passa por cima
  const blockedByKitchen = inKitchen > 0 && !isAdmin;
  const total = account?.total ?? 0;
  const needsPayment = total > 0;

  const cents = (l: PaymentLine) => {
    const c = toCents(l.amount);
    return Number.isFinite(c) ? c : 0;
  };
  const paid = lines.reduce((s, l) => s + cents(l), 0);
  const remaining = total - paid;
  const paymentOk =
    !needsPayment || (lines.length > 0 && lines.every((l) => l.method && cents(l) > 0) && remaining === 0);

  const startClosing = () => {
    setLines([{ method: null, amount: centsToInput(total), installments: 1, received: '' }]);
    setConfirming(true);
  };

  const updateLine = (i: number, patch: Partial<PaymentLine>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const addLine = () =>
    setLines((ls) => [
      ...ls,
      { method: null, amount: remaining > 0 ? centsToInput(remaining) : '', installments: 1, received: '' },
    ]);

  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));

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
            amount: cents(l),
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
    <DialogActions>
      <Button variant="secondary" onClick={onClose}>
        Voltar
      </Button>
      <Button onClick={startClosing} disabled={loading || blockedByKitchen}>
        {items.length === 0 && !loading ? 'Liberar mesa' : 'Fechar conta'}
      </Button>
    </DialogActions>
  );

  return (
    <Dialog
      title={`Conta da mesa ${table.identifier}`}
      description={table.clientName ? `Cliente: ${table.clientName}` : undefined}
      onClose={onClose}
      dismissible={!closing}
      footer={footer}
    >
      {loading ? (
        <Skeleton className="h-32 rounded-md" />
      ) : (
        <>
          {items.length === 0 ? (
            <p className="py-4 text-center text-ink-muted">Nenhum item consumido</p>
          ) : (
            <ul className="mb-4 space-y-1">
              {items.map((it) => (
                <li key={it.id} className="flex justify-between gap-3 py-1 text-sm text-ink">
                  <span className="min-w-0">
                    {it.productName}{' '}
                    <span className="text-ink-muted">
                      {it.isMeat ? weight(it.quantity) : `x${it.quantity}`}
                    </span>
                    {it.notes && <span className="block text-xs text-warning">Obs.: {it.notes}</span>}
                  </span>
                  <span className="whitespace-nowrap tabular-nums">{money(it.subtotal)}</span>
                </li>
              ))}
            </ul>
          )}
          {account && (
            <dl className="space-y-1 border-t border-hairline pt-3 tabular-nums">
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
        </>
      )}

      {confirming && (
        <div className="mt-5 space-y-3 rounded-md bg-surface-2 p-3">
          {!needsPayment ? (
            <p className="text-sm text-ink">
              Liberar a mesa <strong>{table.identifier}</strong> sem consumo?
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-ink">Forma de pagamento</p>
              {lines.map((l, i) => {
                const amount = cents(l);
                const received = toCents(l.received);
                const change = l.method === 'DINHEIRO' && Number.isFinite(received) ? received - amount : NaN;
                return (
                  <fieldset key={i} className="space-y-3 rounded-md border border-hairline bg-surface p-3">
                    <div className="flex items-center justify-between">
                      <legend className="text-sm font-semibold text-ink-muted">
                        {lines.length > 1 ? `Pagamento ${i + 1}` : 'Pagamento'}
                      </legend>
                      {lines.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:text-danger"
                          onClick={() => removeLine(i)}
                        >
                          Remover pagamento
                        </Button>
                      )}
                    </div>
                    <div
                      className="grid grid-cols-2 gap-1.5 min-[380px]:grid-cols-4"
                      role="radiogroup"
                      aria-label="Forma de pagamento"
                    >
                      {PAYMENT_METHODS.map((m) => {
                        const active = l.method === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => updateLine(i, { method: m, installments: 1 })}
                            className={cx(
                              'min-h-tap rounded-sm border text-sm font-semibold transition-colors',
                              active
                                ? 'border-accent bg-accent/10 text-accent-strong'
                                : 'border-hairline bg-surface text-ink hover:bg-surface-2',
                            )}
                          >
                            {PAYMENT_LABEL[m]}
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                      <Field label="Valor (R$)" htmlFor={`amount-${i}`}>
                        <Input
                          id={`amount-${i}`}
                          inputMode="decimal"
                          value={l.amount}
                          onChange={(e) => updateLine(i, { amount: e.target.value })}
                        />
                      </Field>
                      {l.method === 'CREDITO' && (
                        <Field label="Parcelas" htmlFor={`installments-${i}`}>
                          <Select
                            id={`installments-${i}`}
                            value={l.installments}
                            onChange={(e) => updateLine(i, { installments: Number(e.target.value) })}
                          >
                            {Array.from({ length: MAX_INSTALLMENTS }, (_, k) => k + 1).map((n) => (
                              <option key={n} value={n}>
                                {n === 1 ? 'À vista' : `${n}x de ${money(installmentValue(amount, n))}`}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      )}
                      {l.method === 'DINHEIRO' && (
                        <Field label="Recebido do cliente" htmlFor={`received-${i}`} optional>
                          <Input
                            id={`received-${i}`}
                            inputMode="decimal"
                            value={l.received}
                            onChange={(e) => updateLine(i, { received: e.target.value })}
                          />
                        </Field>
                      )}
                    </div>
                    {Number.isFinite(change) && (
                      <p
                        className={cx('text-sm font-semibold', change >= 0 ? 'text-success' : 'text-danger')}
                      >
                        {change >= 0 ? `Troco: ${money(change)}` : `Faltam ${money(-change)} do cliente`}
                      </p>
                    )}
                  </fieldset>
                );
              })}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button variant="secondary" size="sm" icon={Plus} onClick={addLine}>
                  Dividir pagamento
                </Button>
                <span
                  role="status"
                  className={cx(
                    'text-sm font-semibold tabular-nums',
                    remaining === 0 ? 'text-success' : 'text-danger',
                  )}
                >
                  {remaining === 0
                    ? 'Valor completo'
                    : remaining > 0
                      ? `Falta ${money(remaining)}`
                      : `Passou ${money(-remaining)}`}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}
