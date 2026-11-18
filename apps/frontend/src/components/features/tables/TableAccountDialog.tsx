'use client';

import { useEffect, useState } from 'react';
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
import { money, weight, toCents, centsToInput, PAYMENT_LABEL, PAYMENT_ICON } from '@/lib/format';
import { useSession } from '@/hooks/useSession';
import Dialog from '@/components/ui/Dialog';

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

  const footer = confirming ? undefined : (
    <div className="flex gap-3">
      <button
        onClick={onClose}
        className="flex-1 py-2.5 rounded-lg font-semibold text-sm"
        style={{ background: '#f0ebe4', color: '#6b5a4a' }}
      >
        Voltar
      </button>
      <button
        onClick={startClosing}
        disabled={loading || blockedByKitchen}
        className="flex-1 py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-40"
        style={{ background: '#3d5c3a' }}
      >
        {items.length === 0 && !loading ? 'Liberar mesa' : 'Fechar conta'}
      </button>
    </div>
  );

  return (
    <Dialog
      title={`Conta · Mesa ${table.identifier}`}
      onClose={onClose}
      dismissible={!closing}
      footer={footer}
    >
      {table.clientName && (
        <div className="mb-4 p-3 rounded-lg" style={{ background: '#f5f0eb' }}>
          <p className="text-xs" style={{ color: '#6b5a4a' }}>
            Cliente
          </p>
          <p className="font-semibold text-[#2a1f14]">{table.clientName}</p>
        </div>
      )}

      {loading ? (
        <div className="h-32 rounded-xl animate-pulse" style={{ background: '#f5f0eb' }} />
      ) : (
        <>
          <div className="mb-4 space-y-1">
            {items.length === 0 ? (
              <p className="text-center py-4 text-[#6b5a4a]">Nenhum item consumido</p>
            ) : (
              items.map((it) => (
                <div key={it.id} className="flex justify-between gap-3 text-sm text-[#2a1f14] py-1">
                  <span className="min-w-0">
                    {it.productName}{' '}
                    <span style={{ color: '#6b5a4a' }}>
                      {it.isMeat ? weight(it.quantity) : `x${it.quantity}`}
                    </span>
                    {it.notes && (
                      <span className="block text-xs italic" style={{ color: '#9a5f14' }}>
                        ↳ {it.notes}
                      </span>
                    )}
                  </span>
                  <span className="whitespace-nowrap">{money(it.subtotal)}</span>
                </div>
              ))
            )}
          </div>
          {account && (
            <div className="border-t pt-3 space-y-1" style={{ borderColor: '#d9cfc2' }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: '#6b5a4a' }}>Subtotal</span>
                <span>{money(account.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: '#6b5a4a' }}>Taxa de serviço ({FEE_PERCENT}%)</span>
                <span style={{ color: '#c45c2a' }}>{money(account.serviceFee)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-1">
                <span className="text-[#2a1f14]">Total</span>
                <span style={{ color: '#c45c2a' }}>{money(account.total)}</span>
              </div>
            </div>
          )}
          {inKitchen > 0 && (
            <p
              role="status"
              className="text-xs mt-3 p-2 rounded-lg"
              style={{ background: 'rgba(232,160,74,0.15)', color: '#7a4a0e' }}
            >
              {inKitchen} {inKitchen === 1 ? 'pedido ainda está' : 'pedidos ainda estão'} na cozinha.{' '}
              {isAdmin
                ? 'Como administrador, você pode fechar mesmo assim.'
                : 'A conta só pode ser fechada quando estiverem prontos.'}
            </p>
          )}
        </>
      )}

      {confirming && (
        <div className="mt-5 p-3 rounded-xl space-y-3" style={{ background: '#f5f0eb' }}>
          {!needsPayment ? (
            <p className="text-sm text-[#2a1f14]">
              Liberar a mesa <strong>{table.identifier}</strong> sem consumo?
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-[#2a1f14]">Forma de pagamento</p>
              {lines.map((l, i) => {
                const amount = cents(l);
                const received = toCents(l.received);
                const change = l.method === 'DINHEIRO' && Number.isFinite(received) ? received - amount : NaN;
                return (
                  <fieldset
                    key={i}
                    className="p-3 rounded-lg bg-white space-y-2"
                    style={{ border: '1px solid #e8ddd2' }}
                  >
                    <div className="flex items-center justify-between">
                      <legend className="text-xs font-semibold" style={{ color: '#6b5a4a' }}>
                        {lines.length > 1 ? `Pagamento ${i + 1}` : 'Pagamento'}
                      </legend>
                      {lines.length > 1 && (
                        <button
                          onClick={() => removeLine(i)}
                          className="text-xs font-semibold"
                          style={{ color: '#b03a2e' }}
                        >
                          Remover
                        </button>
                      )}
                    </div>
                    <div
                      className="grid grid-cols-2 min-[380px]:grid-cols-4 gap-1.5"
                      role="radiogroup"
                      aria-label="Forma de pagamento"
                    >
                      {PAYMENT_METHODS.map((m) => {
                        const active = l.method === m;
                        return (
                          <button
                            key={m}
                            role="radio"
                            aria-checked={active}
                            onClick={() => updateLine(i, { method: m, installments: 1 })}
                            className="py-2 rounded-lg text-xs font-semibold border"
                            style={{
                              background: active ? '#3d5c3a' : '#fff',
                              color: active ? '#fff' : '#5a4a3a',
                              borderColor: active ? '#3d5c3a' : '#e8ddd2',
                            }}
                          >
                            <span className="block text-base leading-none mb-0.5" aria-hidden>
                              {PAYMENT_ICON[m]}
                            </span>
                            {PAYMENT_LABEL[m]}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex-1 min-w-[120px]">
                        <label
                          htmlFor={`amount-${i}`}
                          className="block text-xs mb-0.5"
                          style={{ color: '#6b5a4a' }}
                        >
                          Valor (R$)
                        </label>
                        <input
                          id={`amount-${i}`}
                          inputMode="decimal"
                          value={l.amount}
                          onChange={(e) => updateLine(i, { amount: e.target.value })}
                          className="w-full px-2 py-1.5 border rounded-lg text-sm"
                          style={{ borderColor: '#d9cfc2' }}
                        />
                      </div>
                      {l.method === 'CREDITO' && (
                        <div className="flex-1 min-w-[140px]">
                          <label
                            htmlFor={`installments-${i}`}
                            className="block text-xs mb-0.5"
                            style={{ color: '#6b5a4a' }}
                          >
                            Parcelas
                          </label>
                          <select
                            id={`installments-${i}`}
                            value={l.installments}
                            onChange={(e) => updateLine(i, { installments: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 border rounded-lg text-sm bg-white"
                            style={{ borderColor: '#d9cfc2' }}
                          >
                            {Array.from({ length: MAX_INSTALLMENTS }, (_, k) => k + 1).map((n) => (
                              <option key={n} value={n}>
                                {n === 1 ? 'À vista' : `${n}x de ${money(installmentValue(amount, n))}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {l.method === 'DINHEIRO' && (
                        <div className="flex-1 min-w-[120px]">
                          <label
                            htmlFor={`received-${i}`}
                            className="block text-xs mb-0.5"
                            style={{ color: '#6b5a4a' }}
                          >
                            Recebido (troco)
                          </label>
                          <input
                            id={`received-${i}`}
                            inputMode="decimal"
                            value={l.received}
                            onChange={(e) => updateLine(i, { received: e.target.value })}
                            placeholder="Opcional"
                            className="w-full px-2 py-1.5 border rounded-lg text-sm"
                            style={{ borderColor: '#d9cfc2' }}
                          />
                        </div>
                      )}
                    </div>
                    {Number.isFinite(change) && (
                      <p
                        className="text-xs font-semibold"
                        style={{ color: change >= 0 ? '#3d5c3a' : '#b03a2e' }}
                      >
                        {change >= 0 ? `Troco: ${money(change)}` : `Faltam ${money(-change)} do cliente`}
                      </p>
                    )}
                  </fieldset>
                );
              })}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={addLine}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: '#fff', color: '#3d5c3a', border: '1px dashed #3d5c3a' }}
                >
                  Dividir pagamento
                </button>
                <span
                  role="status"
                  className="text-xs font-semibold"
                  style={{ color: remaining === 0 ? '#3d5c3a' : '#b03a2e' }}
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
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              disabled={closing}
              className="flex-1 py-2.5 sm:py-2 rounded-lg font-semibold text-sm"
              style={{ background: '#fff', color: '#6b5a4a' }}
            >
              Voltar
            </button>
            <button
              onClick={handleClose}
              disabled={closing || !paymentOk}
              className="flex-1 py-2.5 sm:py-2 rounded-lg font-semibold text-sm text-white disabled:opacity-40"
              style={{ background: '#3d5c3a', opacity: closing ? 0.6 : undefined }}
            >
              {closing ? 'Fechando…' : needsPayment ? `Confirmar ${money(total)}` : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
