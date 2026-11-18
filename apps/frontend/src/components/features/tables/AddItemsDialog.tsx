'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { DEFAULT_MIN_GRAMS, ORDER_NOTE_MAX_LENGTH } from '@comanda/shared';
import { errorMessage, isApiError } from '@/services/http';
import { listProducts, Product } from '@/services/products';
import { createOrder } from '@/services/orders';
import { money, weight, meatSubtotal, CATEGORY_LABEL, CATEGORY_ORDER } from '@/lib/format';
import Dialog from '@/components/ui/Dialog';

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
      title={`Adicionar itens · Mesa ${tableIdentifier}`}
      onClose={onClose}
      size="lg"
      dismissible={!saving}
      header={
        <input
          type="search"
          placeholder="Buscar no cardápio"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border outline-none"
          style={{ borderColor: '#d9cfc2' }}
          aria-label="Buscar no cardápio"
        />
      }
      footer={
        cart.length > 0 ? (
          <div className="space-y-3">
            <ul className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto" aria-label="Itens do pedido">
              {cart.map((item) => (
                <li key={item.key}>
                  <div className="flex flex-wrap justify-between items-center text-sm gap-x-2 gap-y-0.5">
                    <span className="flex-1 min-w-[45%] text-[#2a1f14]">
                      {item.name}{' '}
                      <span style={{ color: '#6b5a4a' }}>
                        {item.isMeat ? weight(item.quantity) : `x${item.quantity}`}
                      </span>
                    </span>
                    <span className="font-semibold text-[#2a1f14]">{money(item.subtotal)}</span>
                    {editingNote !== item.key && (
                      <button
                        onClick={() => setEditingNote(item.key)}
                        className="text-xs"
                        style={{ color: '#3d5c3a' }}
                      >
                        {item.notes ? 'Editar obs.' : 'Adicionar obs.'}
                      </button>
                    )}
                    <button
                      onClick={() => setCart((c) => c.filter((i) => i.key !== item.key))}
                      className="text-xs"
                      style={{ color: '#b03a2e' }}
                    >
                      Remover
                    </button>
                  </div>
                  {editingNote === item.key ? (
                    <div className="flex gap-2 mt-1">
                      <input
                        autoFocus
                        value={item.notes}
                        maxLength={ORDER_NOTE_MAX_LENGTH}
                        onChange={(e) => setNote(item.key, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingNote(null);
                        }}
                        placeholder="Ex: com gelo e limão, sem cebola, bem passada"
                        className="flex-1 px-2 py-1 rounded border text-xs"
                        style={{ borderColor: '#d9cfc2' }}
                        aria-label={`Observação de ${item.name}`}
                      />
                      <button
                        onClick={() => setEditingNote(null)}
                        className="px-2 py-1 rounded text-xs font-semibold text-white"
                        style={{ background: '#3d5c3a' }}
                      >
                        OK
                      </button>
                    </div>
                  ) : item.notes.trim() ? (
                    <p className="text-xs italic mt-0.5" style={{ color: '#9a5f14' }}>
                      ↳ {item.notes.trim()}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="border-t pt-2 text-sm" style={{ borderColor: '#e8ddd2' }}>
              <div className="flex justify-between text-base font-bold">
                <span>Subtotal do pedido</span>
                <span style={{ color: '#c45c2a' }}>{money(subtotal)}</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: '#6b5a4a' }}>
                A taxa de serviço é somada no fechamento da conta.
              </p>
            </div>
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="w-full py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90"
              style={{ background: saving ? 'rgba(196,92,42,0.5)' : '#c45c2a' }}
            >
              {saving ? 'Enviando…' : 'Enviar pedido'}
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: '#f5f0eb' }} />
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-center py-8 text-[#6b5a4a]">Nenhum item encontrado</p>
        ) : (
          CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
            <section key={cat} aria-label={CATEGORY_LABEL[cat]}>
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#c45c2a' }}>
                {CATEGORY_LABEL[cat]}
              </p>
              <div className="space-y-2">
                {grouped[cat].map((p) => {
                  const min = minGramsOf(p);
                  const left = p.stock - inCart(p.id);
                  const out = left <= 0 || (p.isMeat && left < min);
                  const units = cart.find((i) => i.productId === p.id && !i.isMeat)?.quantity ?? 0;
                  return (
                    <div
                      key={p.id}
                      className="flex flex-wrap min-[420px]:flex-nowrap items-center gap-x-3 gap-y-2 p-3 rounded-lg border"
                      style={{ borderColor: '#e8ddd2', opacity: out ? 0.5 : 1 }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#2a1f14] text-sm">
                          {p.name}
                          {p.lowStock && !out && (
                            <span
                              className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                              style={{ background: 'rgba(232,160,74,0.18)', color: '#9a5f14' }}
                            >
                              últimas unidades
                            </span>
                          )}
                          {out && (
                            <span
                              className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                              style={{ background: 'rgba(176,58,46,0.12)', color: '#b03a2e' }}
                            >
                              esgotado
                            </span>
                          )}
                        </p>
                        {p.description && (
                          <p className="text-xs truncate" style={{ color: '#6b5a4a' }}>
                            {p.description}
                          </p>
                        )}
                        <p className="text-xs font-semibold mt-0.5" style={{ color: '#c45c2a' }}>
                          {p.isMeat ? `${money(p.pricePerKg ?? 0)}/kg · mínimo ${min} g` : money(p.price)}
                        </p>
                      </div>

                      {p.isMeat ? (
                        <div className="flex items-center gap-2 ml-auto">
                          <div className="relative">
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
                              className="w-24 pl-2 pr-6 py-1.5 rounded border text-sm"
                              style={{ borderColor: '#d9cfc2' }}
                              aria-label={`Gramas de ${p.name} (vazio = ${min} g)`}
                            />
                            <span
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                              style={{ color: '#6b5a4a' }}
                            >
                              g
                            </span>
                          </div>
                          <button
                            onClick={() => addMeat(p)}
                            disabled={out}
                            className="px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold text-white"
                            style={{ background: '#3d5c3a' }}
                            aria-label={`Adicionar ${p.name}`}
                          >
                            Adicionar
                          </button>
                        </div>
                      ) : units > 0 ? (
                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            onClick={() => changeUnits(p, -1)}
                            className="w-9 h-9 sm:w-7 sm:h-7 rounded-full font-bold"
                            style={{ background: '#f0ebe4', color: '#6b5a4a' }}
                            aria-label={`Tirar um ${p.name}`}
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-semibold" aria-live="polite">
                            {units}
                          </span>
                          <button
                            onClick={() => changeUnits(p, 1)}
                            className="w-9 h-9 sm:w-7 sm:h-7 rounded-full font-bold text-white"
                            style={{ background: '#3d5c3a' }}
                            aria-label={`Mais um ${p.name}`}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => changeUnits(p, 1)}
                          disabled={out}
                          className="ml-auto px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold text-white"
                          style={{ background: '#3d5c3a' }}
                          aria-label={`Adicionar ${p.name}`}
                        >
                          Adicionar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </Dialog>
  );
}
