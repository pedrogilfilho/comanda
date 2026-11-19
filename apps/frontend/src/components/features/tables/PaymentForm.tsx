'use client';

import { Plus } from 'lucide-react';
import { MAX_INSTALLMENTS, PAYMENT_METHODS, installmentValue } from '@comanda/shared';
import type { PaymentMethod } from '@/types/api';
import { money, toCents, centsToInput, PAYMENT_LABEL } from '@/lib/format';
import { cx } from '@/lib/cx';
import Button from '@/components/ui/Button';
import Field, { Input, Select } from '@/components/ui/Field';

export interface PaymentLine {
  method: PaymentMethod | null;
  amount: string; // R$ digitado
  installments: number;
  received: string; // dinheiro entregue pelo cliente (só para calcular troco)
}

export function lineCents(l: PaymentLine): number {
  const c = toCents(l.amount);
  return Number.isFinite(c) ? c : 0;
}

export const firstLine = (total: number): PaymentLine => ({
  method: null,
  amount: centsToInput(total),
  installments: 1,
  received: '',
});

interface PaymentFormProps {
  lines: PaymentLine[];
  remaining: number;
  onChange: (lines: PaymentLine[]) => void;
}

// Formas de pagamento da conta: uma ou várias (dividir), parcelas no crédito e troco no dinheiro
export default function PaymentForm({ lines, remaining, onChange }: PaymentFormProps) {
  const updateLine = (i: number, patch: Partial<PaymentLine>) =>
    onChange(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () =>
    onChange([
      ...lines,
      { method: null, amount: remaining > 0 ? centsToInput(remaining) : '', installments: 1, received: '' },
    ]);
  const removeLine = (i: number) => onChange(lines.filter((_, idx) => idx !== i));

  return (
    <>
      <p className="text-sm font-semibold text-ink">Forma de pagamento</p>
      {lines.map((l, i) => {
        const amount = lineCents(l);
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
              <p className={cx('text-sm font-semibold', change >= 0 ? 'text-success' : 'text-danger')}>
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
  );
}
