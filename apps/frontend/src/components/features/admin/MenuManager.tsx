'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_MIN_GRAMS } from '@comanda/shared';
import { errorMessage } from '@/services/http';
import { createProduct, removeProduct, updateProduct } from '@/services/products';
import type { Product, ProductCategory } from '@/types/api';
import { money, weight, toCents } from '@/lib/format';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import CategorySections from '@/components/ui/CategorySections';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Dialog, { DialogActions } from '@/components/ui/Dialog';
import Field, { Input, Select } from '@/components/ui/Field';
import PageTitle from '@/components/ui/PageTitle';
import { SkeletonList } from '@/components/ui/Skeleton';

interface MenuManagerProps {
  products: Product[];
  loading: boolean;
  onChange: () => void;
}

const EMPTY = {
  name: '',
  category: 'CARNE' as ProductCategory,
  description: '',
  price: '',
  minGrams: String(DEFAULT_MIN_GRAMS),
  stock: '',
};

export default function MenuManager({ products, loading, onChange }: MenuManagerProps) {
  const [form, setForm] = useState(EMPTY);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [toRemove, setToRemove] = useState<Product | null>(null);
  const [removing, setRemoving] = useState(false);

  const isMeat = form.category === 'CARNE';
  const showForm = showCreate || editing !== null;

  // Centavos → "178,00" para o campo de preço
  const toInput = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category,
      description: p.description ?? '',
      price: toInput(p.isMeat ? (p.pricePerKg ?? 0) : p.price),
      minGrams: String(p.minGrams ?? DEFAULT_MIN_GRAMS),
      stock: '',
    });
  };

  const closeForm = () => {
    setShowCreate(false);
    setEditing(null);
    setForm(EMPTY);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = toCents(form.price);
    if (!form.name.trim()) {
      toast.error('Informe o nome do item');
      return;
    }
    if (!Number.isFinite(cents) || cents <= 0) {
      toast.error(isMeat ? 'Informe o preço por kg' : 'Informe o preço');
      return;
    }
    const minGrams = parseInt(form.minGrams, 10);
    if (isMeat && (!Number.isFinite(minGrams) || minGrams <= 0)) {
      toast.error('Informe o pedido mínimo em gramas');
      return;
    }
    const stockNumber = parseFloat((form.stock || '0').replace(',', '.'));
    const stock = Number.isFinite(stockNumber)
      ? isMeat
        ? Math.round(stockNumber * 1000)
        : Math.round(stockNumber)
      : 0;

    setSaving(true);
    if (editing) {
      try {
        await updateProduct(editing.id, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          category: form.category,
          ...(isMeat ? { pricePerKg: cents, minGrams } : { price: cents }),
        });
        toast.success(`${form.name.trim()} atualizado`);
        closeForm();
        onChange();
      } catch (err) {
        toast.error(errorMessage(err, 'Erro ao salvar o item'));
      } finally {
        setSaving(false);
      }
      return;
    }
    try {
      await createProduct({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        ...(isMeat ? { pricePerKg: cents, minGrams } : { price: cents }),
        stock,
      });
      toast.success(`${form.name.trim()} adicionado ao cardápio`);
      closeForm();
      onChange();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao adicionar item'));
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!toRemove) return;
    setRemoving(true);
    try {
      await removeProduct(toRemove.id);
      toast.success(`${toRemove.name} removido do cardápio`);
      setToRemove(null);
      onChange();
    } catch (e) {
      toast.error(errorMessage(e, 'Erro ao remover item'));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title="Cardápio"
        subtitle="O que os garçons podem lançar"
        actions={
          <Button icon={Plus} onClick={() => setShowCreate(true)}>
            Adicionar item
          </Button>
        }
      />

      {loading ? (
        <SkeletonList rows={4} />
      ) : (
        <CategorySections
          storageKey="cardapio"
          idPrefix="menu"
          products={products}
          renderItem={(p) => (
            <Card
              as="li"
              key={p.id}
              padding="sm"
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                  {p.name}
                  {p.isMeat && (
                    <Badge tone="accent">Por peso · mínimo {p.minGrams ?? DEFAULT_MIN_GRAMS} g</Badge>
                  )}
                  {p.lowStock && (
                    <Badge tone="danger">Estoque baixo: {p.isMeat ? weight(p.stock) : `${p.stock} un`}</Badge>
                  )}
                </p>
                {p.description && <p className="mt-0.5 text-sm text-ink-muted">{p.description}</p>}
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className="whitespace-nowrap font-bold text-accent-strong tabular-nums">
                  {p.isMeat ? `${money(p.pricePerKg ?? 0)}/kg` : money(p.price)}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openEdit(p)}
                  aria-label={`Editar ${p.name}`}
                >
                  Editar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setToRemove(p)}
                  aria-label={`Remover ${p.name} do cardápio`}
                >
                  Remover
                </Button>
              </div>
            </Card>
          )}
        />
      )}

      {showForm && (
        <Dialog
          title={editing ? 'Editar item' : 'Adicionar item ao cardápio'}
          onClose={closeForm}
          dismissible={!saving}
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Categoria" htmlFor="item-category">
              <Select
                id="item-category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ProductCategory }))}
              >
                {/* Na edição, carne continua carne e item por unidade não vira carne */}
                {(!editing || editing.isMeat) && <option value="CARNE">Carne (vendida por peso)</option>}
                {(!editing || !editing.isMeat) && (
                  <>
                    <option value="ACOMPANHAMENTO">Acompanhamento</option>
                    <option value="CALDO">Caldo</option>
                    <option value="BEBIDA">Bebida</option>
                    <option value="OUTROS">Outros</option>
                  </>
                )}
              </Select>
            </Field>
            <Field label="Nome" htmlFor="item-name">
              <Input
                id="item-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <Field label="Descrição" htmlFor="item-description" optional>
              <Input
                id="item-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={isMeat ? 'Preço por kg (R$)' : 'Preço (R$)'} htmlFor="item-price">
                <Input
                  id="item-price"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder={isMeat ? '178,00' : '22,00'}
                />
              </Field>
              {isMeat && (
                <Field label="Mínimo (g)" htmlFor="item-min">
                  <Input
                    id="item-min"
                    inputMode="numeric"
                    value={form.minGrams}
                    onChange={(e) => setForm((f) => ({ ...f, minGrams: e.target.value }))}
                  />
                </Field>
              )}
            </div>
            {!editing && (
              <Field
                label={isMeat ? 'Estoque inicial (kg)' : 'Estoque inicial (unidades)'}
                htmlFor="item-stock"
                optional
              >
                <Input
                  id="item-stock"
                  inputMode="decimal"
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                  placeholder="0"
                />
              </Field>
            )}
            <DialogActions>
              <Button variant="secondary" onClick={closeForm} disabled={saving}>
                Voltar
              </Button>
              <Button type="submit" loading={saving}>
                {editing ? 'Salvar alterações' : 'Adicionar item'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}

      {toRemove && (
        <ConfirmDialog
          title="Remover item"
          message={
            <>
              Remover <strong>{toRemove.name}</strong> do cardápio? Ele deixa de aparecer para os garçons.
              Pedidos antigos continuam no histórico.
            </>
          }
          confirmLabel="Remover item"
          tone="danger"
          loading={removing}
          onConfirm={confirmRemove}
          onCancel={() => setToRemove(null)}
        />
      )}
    </div>
  );
}
