'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { MAX_TOTAL_TABLES } from '@comanda/shared';
import { errorMessage } from '@/services/http';
import { updateSettings } from '@/services/settings';
import Button from '@/components/ui/Button';
import Dialog, { DialogActions } from '@/components/ui/Dialog';
import Field, { Input } from '@/components/ui/Field';

interface TotalTablesDialogProps {
  current: number;
  onClose: () => void;
  onSaved: (total: number) => void;
}

// Admin: quantas mesas o salão tem (as ocupadas acima do total continuam até fechar)
export default function TotalTablesDialog({ current, onClose, onSaved }: TotalTablesDialogProps) {
  const [value, setValue] = useState(String(current));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > MAX_TOTAL_TABLES) {
      setError(`Informe um número de 1 a ${MAX_TOTAL_TABLES}`);
      return;
    }
    setSaving(true);
    try {
      const { totalTables } = await updateSettings(n);
      toast.success(`Salão com ${totalTables} mesas`);
      onSaved(totalTables);
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Erro ao salvar'));
      setSaving(false);
    }
  };

  return (
    <Dialog title="Total de mesas" size="sm" onClose={onClose} dismissible={!saving}>
      <form onSubmit={save} className="space-y-4" noValidate>
        <Field
          label="Mesas no salão"
          htmlFor="total-tables"
          error={error}
          hint="Mesa ocupada acima do total continua no mapa até a conta fechar"
        >
          <Input
            id="total-tables"
            inputMode="numeric"
            autoFocus
            value={value}
            invalid={!!error}
            onChange={(e) => {
              setValue(e.target.value.replace(/\D/g, ''));
              setError('');
            }}
          />
        </Field>
        <DialogActions>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Voltar
          </Button>
          <Button type="submit" loading={saving}>
            Salvar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
