'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Minus, Plus, SearchX } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_MIN_GRAMS, ORDER_NOTE_MAX_LENGTH } from '@comanda/shared';
import { errorMessage, isApiError } from '@/services/http';
import { listProducts } from '@/services/products';
import { createOrder } from '@/services/orders';
import type { Product } from '@/types/api';
import { money, weight, meatSubtotal, CATEGORY_LABEL, CATEGORY_ORDER } from '@/lib/format';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import EmptyState from '@/components/ui/EmptyState';
import { Input, inputClass } from '@/components/ui/Field';
import IconButton from '@/components/ui/IconButton';
import SearchInput from '@/components/ui/SearchInput';
import { SkeletonList } from '@/components/ui/Skeleton';

interface CartItem {
  key: string;
  productId: string;
  name: string;
  isMeat: boolean;
  quantity: number; // gramas (carne) ou unidades
  subtotal: number;
  notes: string; // observação do item (ex: com gelo e limão)
}

interface AddItemsDialogProps {
  tableId: string;
  tableIdentifier: string;
  onClose: () => void;
  onSuccess: () => void;
}

const minGramsOf = (p: Product) => p.minGrams ?? DEFAULT_MIN_GRAMS;

// Gramas digitadas; campo vazio vale o pedido mínimo (é o que o placeholder mostra)
export function parseGrams(input: string | undefined, min: number): number {
  const raw = (input ?? '').trim();
  if (raw === '') return min;
  const value = Number(raw);
  return Number.isInteger(value) ? value : NaN;
}

export default function AddItemsDialog({
  tableId,
  tableIdentifier,
  onClose,
  onSuccess,
}: AddItemsDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [grams, setGrams] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const nextKey = useRef(0); // cada porção de carne é uma linha própria, com chave única

  const loadProducts = () =>
    listProducts()
      .then(setProducts)
      .catch((e) => toast.error(errorMessage(e, 'Erro ao carregar o cardápio')))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadProducts();
  }, []);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const g: Record<string, Product[]> = {};
    products
      .filter((p) => p.available !== false)
      .filter((p) => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q))
      .forEach((p) => {
        (g[p.category] = g[p.category] || []).push(p);
      });
    return g;
  }, [products, search]);

  // Quanto do estoque já está reservado no carrinho
  const inCart = (productId: string) =>
    cart.filter((i) => i.productId === productId).reduce((s, i) => s + i.quantity, 0);

  const addMeat = (p: Product) => {
    const min = minGramsOf(p);
    const value = parseGrams(grams[p.id], min);
    if (!Number.isFinite(value) || value < min) {
      toast.error(`${p.name}: o pedido mínimo é de ${min} g`);
      return;
    }
    if (inCart(p.id) + value > p.stock) {
      toast.error(
        `Estoque insuficiente de ${p.name} (disponível: ${weight(Math.max(0, p.stock - inCart(p.id)))})`,
      );
      return;
    }
    nextKey.current += 1;
    const key = `${p.id}#${nextKey.current}`;
    setCart((c) => [
      ...c,
      {
        key,
        productId: p.id,
        name: p.name,
        isMeat: true,
        quantity: value,
        subtotal: meatSubtotal(value, p.pricePerKg ?? 0),
        notes: '',
      },
    ]);
    setGrams((g) => ({ ...g, [p.id]: '' }));
  };

  const changeUnits = (p: Product, delta: number) => {
    const current = inCart(p.id);
    if (delta > 0 && current + delta > p.stock) {
      toast.error(`Estoque insuficiente de ${p.name} (disponível: ${p.stock} un)`);
      return;
    }
    setCart((c) => {
      const existing = c.find((i) => i.productId === p.id);
      if (!existing) {
        return delta > 0
          ? [
              ...c,
              {
                key: p.id,
                productId: p.id,
                name: p.name,
                isMeat: false,
                quantity: delta,
                subtotal: p.price * delta,
                notes: '',
              },
            ]
          : c;
      }
      const quantity = existing.quantity + delta;
      if (quantity <= 0) return c.filter((i) => i.productId !== p.id);
      return c.map((i) => (i.productId === p.id ? { ...i, quantity, subtotal: p.price * quantity } : i));
    });
  };

  const setNote = (key: string, notes: string) =>
    setCart((c) => c.map((i) => (i.key === key ? { ...i, notes } : i)));

  // O pedido mostra só o subtotal; a taxa de serviço entra uma vez, no fechamento da conta
  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);

  const handleConfirm = async () => {
    if (cart.length === 0) {
      toast.error('Adicione itens ao pedido');
      return;
    }
    setSaving(true);
    try {
      await createOrder({
        tableId,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          notes: i.notes.trim() || undefined,
        })),
      });
      toast.success('Pedido enviado para a cozinha');
      onSuccess();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e, 'Erro ao lançar o pedido'));
      // Outro garçom vendeu antes: recarrega o estoque para mostrar o que ainda tem
      if (isApiError(e, 'STOCK_INSUFFICIENT')) loadProducts();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      title={`Adicionar itens à mesa ${tableIdentifier}`}
      onClose={onClose}
      size="lg"
      dismissible={!saving}
      header={
        <SearchInput
          label="Buscar no cardápio"
          placeholder="Buscar no cardápio"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      }
      footer={
        cart.length > 0 ? (
          <div className="space-y-3">
            <ul className="max-h-40 space-y-2 overflow-y-auto sm:max-h-48" aria-label="Itens do pedido">
              {cart.map((item) => (
                <li key={item.key}>
                  <div className="flex flex-wrap items-center justify-between gap-x-2 text-sm">
                    <span className="min-w-[45%] flex-1 text-ink">
                      {item.name}{' '}
                      <span className="text-ink-muted">
                        {item.isMeat ? weight(item.quantity) : `x${item.quantity}`}
                      </span>
                    </span>
                    <span className="font-semibold text-ink tabular-nums">{money(item.subtotal)}</span>
                    {editingNote !== item.key && (
                      <Button variant="ghost" size="sm" onClick={() => setEditingNote(item.key)}>
                        {item.notes ? 'Editar observação' : 'Adicionar observação'}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:text-danger"
                      onClick={() => setCart((c) => c.filter((i) => i.key !== item.key))}
                      aria-label={`Remover ${item.name} do pedido`}
                    >
                      Remover
                    </Button>
                  </div>
                  {editingNote === item.key ? (
                    <div className="mt-1 flex gap-2">
                      <Input
                        autoFocus
                        value={item.notes}
                        maxLength={ORDER_NOTE_MAX_LENGTH}
                        onChange={(e) => setNote(item.key, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingNote(null);
                        }}
                        placeholder="Ex.: com gelo e limão, sem cebola"
                        aria-label={`Observação de ${item.name}`}
                      />
                      <Button variant="secondary" onClick={() => setEditingNote(null)}>
                        Salvar
                      </Button>
                    </div>
                  ) : item.notes.trim() ? (
                    <p className="mt-0.5 text-xs text-warning">Obs.: {item.notes.trim()}</p>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="border-t border-hairline pt-2">
              <div className="flex justify-between text-base font-bold">
                <span>Subtotal do pedido</span>
                <span className="text-accent-strong tabular-nums">{money(subtotal)}</span>
              </div>
              <p className="mt-0.5 text-xs text-ink-muted">
                A taxa de serviço é somada no fechamento da conta.
              </p>
            </div>
            <Button block onClick={handleConfirm} loading={saving}>
              Enviar pedido
            </Button>
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <SkeletonList rows={4} className="h-16" />
      ) : Object.keys(grouped).length === 0 ? (
        <EmptyState icon={SearchX} title="Nenhum item encontrado" description="Tente outro nome." />
      ) : (
        <div className="space-y-5">
          {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
            <section key={cat} aria-labelledby={`cat-${cat}`}>
              <h3 id={`cat-${cat}`} className="mb-2 text-sm font-semibold text-ink-muted">
                {CATEGORY_LABEL[cat]}
              </h3>
              <ul className="space-y-2">
                {grouped[cat].map((p) => {
                  const min = minGramsOf(p);
                  const left = p.stock - inCart(p.id);
                  const out = left <= 0 || (p.isMeat && left < min);
                  const units = cart.find((i) => i.productId === p.id && !i.isMeat)?.quantity ?? 0;
                  return (
                    <li
                      key={p.id}
                      className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-hairline p-3 min-[420px]:flex-nowrap ${out ? 'opacity-60' : ''}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                          {p.name}
                          {p.lowStock && !out && <Badge tone="warning">Últimas unidades</Badge>}
                          {out && <Badge tone="danger">Esgotado</Badge>}
                        </p>
                        {p.description && <p className="truncate text-xs text-ink-muted">{p.description}</p>}
                        <p className="mt-0.5 text-sm font-semibold text-accent-strong">
                          {p.isMeat ? `${money(p.pricePerKg ?? 0)}/kg · mínimo ${min} g` : money(p.price)}
                        </p>
                      </div>

                      {p.isMeat ? (
                        <div className="ml-auto flex items-center gap-2">
                          <div className="relative w-28">
                            <input
                              type="number"
                              inputMode="numeric"
                              min={min}
                              step={50}
                              placeholder={String(min)}
                              value={grams[p.id] ?? ''}
                              onChange={(e) => setGrams((g) => ({ ...g, [p.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') addMeat(p);
                              }}
                              disabled={out}
                              className={inputClass(false, 'pr-7')}
                              aria-label={`Gramas de ${p.name} (vazio vale ${min} g)`}
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                              g
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={Plus}
                            onClick={() => addMeat(p)}
                            disabled={out}
                            aria-label={`Adicionar ${p.name}`}
                          >
                            Adicionar
                          </Button>
                        </div>
                      ) : units > 0 ? (
                        <div className="ml-auto flex items-center gap-1">
                          <IconButton
                            icon={Minus}
                            label={`Tirar um ${p.name}`}
                            onClick={() => changeUnits(p, -1)}
                            className="border border-hairline"
                          />
                          <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">
                            {units}
                          </span>
                          <IconButton
                            icon={Plus}
                            label={`Mais um ${p.name}`}
                            onClick={() => changeUnits(p, 1)}
                            className="border border-hairline"
                          />
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={Plus}
                          className="ml-auto"
                          onClick={() => changeUnits(p, 1)}
                          disabled={out}
                          aria-label={`Adicionar ${p.name}`}
                        >
                          Adicionar
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Dialog>
  );
}
