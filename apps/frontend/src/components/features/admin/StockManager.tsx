'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { STOCK_NOTE_MAX_LENGTH } from '@comanda/shared';
import { errorMessage } from '@/services/http';
import { Product, adjustStock } from '@/services/products';
import { weight, CATEGORY_LABEL, CATEGORY_ORDER } from '@/lib/format';
import { cx } from '@/lib/cx';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Dialog, { DialogActions } from '@/components/ui/Dialog';
import Field, { Input, Select } from '@/components/ui/Field';
import Icon from '@/components/ui/Icon';
import PageTitle from '@/components/ui/PageTitle';
import { SkeletonList } from '@/components/ui/Skeleton';

interface StockManagerProps {
  products: Product[];
  loading: boolean;
  onChange: () => void;
}

type Movement = 'ENTRADA' | 'SAIDA' | 'CONTAGEM';

const MOVEMENTS: { key: Movement; label: string; hint: string }[] = [
  { key: 'ENTRADA', label: 'Entrada', hint: 'Chegou mercadoria' },
  { key: 'SAIDA', label: 'Saída', hint: 'Perda, quebra, vencido' },
  { key: 'CONTAGEM', label: 'Contagem', hint: 'Corrigir pelo inventário' },
];

const REASONS: Record<Movement, string[]> = {
  ENTRADA: ['Compra de fornecedor', 'Devolução', 'Outro'],
  SAIDA: ['Quebra', 'Vencido ou estragado', 'Consumo interno', 'Cortesia', 'Outro'],
  CONTAGEM: ['Inventário', 'Erro de lançamento', 'Outro'],
};

const EMPTY_FORM = { movement: 'ENTRADA' as Movement, quantity: '', reason: REASONS.ENTRADA[0], note: '' };

export default function StockManager({ products, loading, onChange }: StockManagerProps) {
  const [target, setTarget] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const low = products.filter((p) => p.lowStock);

  // Carne: ajustes em kg (estoque guardado em gramas). Demais: em unidades.
  const factor = (p: Product) => (p.isMeat ? 1000 : 1);
  const show = (p: Product, value: number) => (p.isMeat ? weight(value) : `${value} un`);

  const open = (p: Product) => {
    setTarget(p);
    setForm(EMPTY_FORM);
  };

  // Novo estoque calculado a partir do movimento escolhido
  const preview = (() => {
    if (!target) return null;
    const qty = parseFloat(form.quantity.replace(',', '.'));
    if (!form.quantity.trim() || !Number.isFinite(qty) || qty < 0) return null;
    const amount = Math.round(qty * factor(target));
    if (form.movement === 'ENTRADA') return amount > 0 ? target.stock + amount : null;
    if (form.movement === 'SAIDA') return amount > 0 ? target.stock - amount : null;
    return amount;
  })();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    if (preview === null) {
      toast.error(
        target.isMeat
          ? 'Digite a quantidade em kg (ex.: 5 ou 2,5)'
          : 'Digite a quantidade em unidades (ex.: 12)',
      );
      return;
    }
    if (preview < 0) {
      toast.error('A saída é maior que o estoque atual');
      return;
    }
    if (preview === target.stock) {
      toast.error('O estoque continua igual, não há o que ajustar');
      return;
    }
    if (form.reason === 'Outro' && !form.note.trim()) {
      toast.error('Descreva o motivo do ajuste');
      return;
    }

    const label = MOVEMENTS.find((m) => m.key === form.movement)!.label;
    const detail =
      form.reason === 'Outro'
        ? form.note.trim()
        : form.note.trim()
          ? `${form.reason}: ${form.note.trim()}`
          : form.reason;
    setSaving(true);
    try {
      // O tipo vai para o histórico de movimentações; o texto com o rótulo aparece nos logs
      await adjustStock(target.id, preview, form.movement, `${label} · ${detail}`);
      toast.success(`Estoque de ${target.name}: ${show(target, preview)}`);
      setTarget(null);
      onChange();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao ajustar estoque'));
    } finally {
      setSaving(false);
    }
  };

  const grouped: Record<string, Product[]> = {};
  products.forEach((p) => {
    (grouped[p.category] = grouped[p.category] || []).push(p);
  });

  const unit = target?.isMeat ? 'kg' : 'unidades';

  return (
    <div className="space-y-6">
      <PageTitle title="Estoque" subtitle="Baixa sozinho a cada pedido; ajustes manuais ficam nos logs" />

      {low.length > 0 && (
        <Card tone="danger" className="bg-danger/5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-danger">
            <Icon icon={AlertTriangle} />
            {low.length} {low.length === 1 ? 'item abaixo' : 'itens abaixo'} do estoque mínimo
          </h2>
          <ul className="flex flex-wrap gap-2">
            {low.map((p) => (
              <li key={p.id}>
                <Badge tone="danger">
                  {p.name}: {p.isMeat ? weight(p.stock) : `${p.stock} un`}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {loading ? (
        <SkeletonList rows={4} />
      ) : (
        <div className="space-y-6">
          {CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((cat) => (
            <section key={cat} aria-labelledby={`stock-${cat}`}>
              <h2 id={`stock-${cat}`} className="mb-2 text-sm font-semibold text-ink-muted">
                {CATEGORY_LABEL[cat]}
              </h2>
              <ul className="space-y-2">
                {grouped[cat].map((p) => {
                  const pct = Math.min(100, (p.stock / Math.max(1, p.minStock * 5)) * 100);
                  return (
                    <Card
                      as="li"
                      key={p.id}
                      padding="sm"
                      tone={p.lowStock ? 'warning' : 'default'}
                      className="flex flex-col gap-3 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink">{p.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 w-24 rounded-full bg-surface-2" aria-hidden>
                            <div
                              className={cx('h-1.5 rounded-full', p.lowStock ? 'bg-warning' : 'bg-success')}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span
                            className={cx(
                              'text-sm font-medium tabular-nums',
                              p.lowStock ? 'text-warning' : 'text-ink-muted',
                            )}
                          >
                            {show(p, p.stock)}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => open(p)}
                        aria-label={`Ajustar estoque de ${p.name}`}
                      >
                        Ajustar estoque
                      </Button>
                    </Card>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {target && (
        <Dialog
          title="Ajustar estoque"
          description={`${target.name}, hoje com ${show(target, target.stock)}`}
          onClose={() => setTarget(null)}
          dismissible={!saving}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">Tipo de movimentação</legend>
              <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-3" role="radiogroup">
                {MOVEMENTS.map((m) => {
                  const active = form.movement === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setForm((f) => ({ ...f, movement: m.key, reason: REASONS[m.key][0] }))}
                      className={cx(
                        'min-h-tap rounded-sm border p-2 text-left transition-colors',
                        active
                          ? 'border-accent bg-accent/10'
                          : 'border-hairline bg-surface hover:bg-surface-2',
                      )}
                    >
                      <span
                        className={cx(
                          'block text-sm font-semibold',
                          active ? 'text-accent-strong' : 'text-ink',
                        )}
                      >
                        {m.label}
                      </span>
                      <span className="block text-xs text-ink-muted">{m.hint}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <Field
              label={form.movement === 'CONTAGEM' ? `Quantidade contada (${unit})` : `Quantidade (${unit})`}
              htmlFor="stock-qty"
              hint={target.isMeat ? 'Ex.: 5 ou 2,5' : 'Ex.: 24'}
            >
              <Input
                id="stock-qty"
                autoFocus
                inputMode="decimal"
                aria-describedby="stock-qty-hint"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </Field>

            <Field label="Motivo" htmlFor="stock-reason">
              <Select
                id="stock-reason"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              >
                {REASONS[form.movement].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Observação"
              htmlFor="stock-note"
              optional={form.reason !== 'Outro'}
              hint="Ex.: nota fiscal 1234"
            >
              <Input
                id="stock-note"
                value={form.note}
                maxLength={Math.min(80, STOCK_NOTE_MAX_LENGTH)}
                aria-describedby="stock-note-hint"
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </Field>

            <div className="flex justify-between gap-3 rounded-md bg-surface-2 p-3 text-sm" role="status">
              <span className="text-ink-muted">Estoque depois do ajuste</span>
              <span
                className={cx(
                  'font-bold tabular-nums',
                  preview !== null && preview < 0 ? 'text-danger' : 'text-ink',
                )}
              >
                {preview === null ? 'a calcular' : preview < 0 ? 'negativo' : show(target, preview)}
              </span>
            </div>

            <DialogActions>
              <Button variant="secondary" onClick={() => setTarget(null)} disabled={saving}>
                Voltar
              </Button>
              <Button type="submit" disabled={preview === null} loading={saving}>
                Salvar ajuste
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </div>
  );
}
