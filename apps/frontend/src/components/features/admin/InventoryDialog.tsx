'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/services/http';
import { saveInventory } from '@/services/products';
import type { Product } from '@/types/api';
import { CATEGORY_LABEL, CATEGORY_ORDER } from '@/lib/format';
import Button from '@/components/ui/Button';
import Dialog, { DialogActions } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Field';
import { changedItems, toCountInput } from './inventory';

interface InventoryDialogProps {
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}

// Inventário: a quantidade contada de todos os itens de uma vez; só os alterados são enviados
export default function InventoryDialog({ products, onClose, onSaved }: InventoryDialogProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(products.map((p) => [p.id, toCountInput(p)])),
  );
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);

  // A lista é recarregada ao abrir: atualiza os campos que o usuário ainda não mexeu
  useEffect(() => {
    setValues((v) => {
      const next = { ...v };
      products.forEach((p) => {
        if (!touched.has(p.id)) next[p.id] = toCountInput(p);
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só quando a lista muda
  }, [products]);

  const result = changedItems(products, values, touched);
  const changed = 'items' in result ? result.items.length : 0;

  const save = async () => {
    if ('invalid' in result) {
      toast.error(`Confira a quantidade de: ${result.invalid.join(', ')}`);
      return;
    }
    setSaving(true);
    try {
      const { changed: n } = await saveInventory(result.items);
      toast.success(`Inventário salvo: ${n} ${n === 1 ? 'item' : 'itens'}`);
      onSaved();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e, 'Erro ao salvar o inventário'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      title="Inventário"
      description="Digite o que foi contado. Carnes em kg (ex.: 2,5), os demais em unidades."
      onClose={onClose}
      dismissible={!saving}
      size="lg"
      footer={
        <DialogActions>
          <span className="mr-auto self-center text-sm text-ink-muted" role="status">
            {'invalid' in result
              ? `${result.invalid.length} com valor inválido`
              : `${changed} ${changed === 1 ? 'item alterado' : 'itens alterados'}`}
          </span>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Voltar
          </Button>
          <Button onClick={save} loading={saving} disabled={changed === 0 && !('invalid' in result)}>
            Salvar inventário
          </Button>
        </DialogActions>
      }
    >
      <div className="space-y-5">
        {CATEGORY_ORDER.map((cat) => {
          const items = products.filter((p) => p.category === cat);
          if (items.length === 0) return null;
          return (
            <section key={cat} aria-labelledby={`inv-${cat}`}>
              <h3 id={`inv-${cat}`} className="mb-2 text-sm font-semibold text-ink-muted">
                {CATEGORY_LABEL[cat]}
              </h3>
              <ul className="space-y-2">
                {items.map((p) => (
                  <li key={p.id} className="flex items-center gap-3">
                    <label htmlFor={`inv-${p.id}`} className="min-w-0 flex-1 truncate text-sm text-ink">
                      {p.name}
                    </label>
                    <Input
                      id={`inv-${p.id}`}
                      inputMode="decimal"
                      className="w-28 text-right tabular-nums"
                      value={values[p.id]}
                      onChange={(e) => {
                        setValues((v) => ({ ...v, [p.id]: e.target.value }));
                        setTouched((t) => new Set(t).add(p.id));
                      }}
                    />
                    <span className="w-6 text-xs text-ink-muted">{p.isMeat ? 'kg' : 'un'}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </Dialog>
  );
}
