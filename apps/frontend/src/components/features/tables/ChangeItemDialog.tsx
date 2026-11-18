'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  ITEM_CHANGE_REASON_LABEL,
  RETURNS_TO_STOCK,
  type ItemChangeReason,
  type UserRole,
} from '@comanda/shared';
import { errorMessage } from '@/services/http';
import { changeOrderItem } from '@/services/orders';
import type { OrderItemView } from '@/types/api';
import { weight } from '@/lib/format';
import { cx } from '@/lib/cx';
import Button from '@/components/ui/Button';
import Dialog, { DialogActions } from '@/components/ui/Dialog';
import Field, { Input } from '@/components/ui/Field';
import { parseNewQuantity, reasonsFor } from './itemChange';

interface ChangeItemDialogProps {
  orderId: string;
  item: OrderItemView;
  role: UserRole;
  onClose: () => void;
  onChanged: () => void;
}

const HINT: Record<ItemChangeReason, string> = {
  LANCADO_A_MAIS: 'Volta para o estoque',
  LANCADO_ERRADO: 'Volta para o estoque',
  PERDA: 'Não volta para o estoque',
};

// Tirar ou diminuir um item da conta, com o motivo
export default function ChangeItemDialog({ orderId, item, role, onClose, onChanged }: ChangeItemDialogProps) {
  const reasons = reasonsFor(role);
  const unit = item.isMeat ? 'g' : 'un';
  const current = item.isMeat ? weight(item.quantity) : `${item.quantity} un`;
  const [value, setValue] = useState(String(Math.max(0, item.isMeat ? 0 : item.quantity - 1)));
  const [reason, setReason] = useState<ItemChangeReason>('LANCADO_A_MAIS');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const quantity = parseNewQuantity(value, item.quantity);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity === null) {
      setError(`Informe de 0 a ${item.quantity - 1} ${unit}`);
      return;
    }
    setSaving(true);
    try {
      await changeOrderItem(orderId, item.id, quantity, reason);
      toast.success(quantity === 0 ? `${item.productName} tirado da conta` : `${item.productName} diminuído`);
      onChanged();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Erro ao alterar o item'));
      setSaving(false);
    }
  };

  return (
    <Dialog
      title={`Alterar ${item.productName}`}
      description={`Na conta: ${current}`}
      size="sm"
      onClose={onClose}
      dismissible={!saving}
    >
      <form onSubmit={save} className="space-y-4" noValidate>
        <Field
          label={item.isMeat ? 'Nova quantidade (gramas)' : 'Nova quantidade'}
          htmlFor="item-qty"
          error={error}
          hint="0 tira o item da conta"
        >
          <div className="flex gap-2">
            <Input
              id="item-qty"
              inputMode="numeric"
              autoFocus
              className="w-28 text-right tabular-nums"
              value={value}
              invalid={!!error}
              onChange={(e) => {
                setValue(e.target.value.replace(/\D/g, ''));
                setError('');
              }}
            />
            <Button variant="secondary" onClick={() => setValue('0')}>
              Tirar o item todo
            </Button>
          </div>
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">Motivo</legend>
          <div className="grid gap-2" role="radiogroup">
            {reasons.map((r) => {
              const active = reason === r;
              return (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setReason(r)}
                  className={cx(
                    'min-h-tap rounded-sm border p-2 text-left transition-colors',
                    active ? 'border-accent bg-accent/10' : 'border-hairline bg-surface hover:bg-surface-2',
                  )}
                >
                  <span
                    className={cx('block text-sm font-semibold', active ? 'text-accent-strong' : 'text-ink')}
                  >
                    {ITEM_CHANGE_REASON_LABEL[r]}
                  </span>
                  <span
                    className={cx('block text-xs', RETURNS_TO_STOCK[r] ? 'text-ink-muted' : 'text-warning')}
                  >
                    {HINT[r]}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <DialogActions>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Voltar
          </Button>
          <Button type="submit" variant={quantity === 0 ? 'danger' : 'primary'} loading={saving}>
            {quantity === 0 ? 'Tirar item' : 'Diminuir'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
