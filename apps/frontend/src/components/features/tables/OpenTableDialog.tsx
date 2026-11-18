'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { TABLE_IDENTIFIER_MAX_LENGTH } from '@comanda/shared';
import { errorMessage } from '@/services/http';
import { openTable } from '@/services/tables';
import Button from '@/components/ui/Button';
import Dialog, { DialogActions } from '@/components/ui/Dialog';
import Field, { Input } from '@/components/ui/Field';

interface OpenTableDialogProps {
  onClose: () => void;
  onOpened: () => void;
}

export default function OpenTableDialog({ onClose, onOpened }: OpenTableDialogProps) {
  const [identifier, setIdentifier] = useState('');
  const [clientName, setClientName] = useState('');
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = identifier.trim();
    if (!id) {
      setError('Informe o número ou o nome da mesa');
      return;
    }
    setOpening(true);
    try {
      await openTable({ identifier: id, clientName: clientName.trim() || undefined });
      toast.success(`Mesa ${id} aberta`);
      onOpened();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Erro ao abrir mesa'));
      setOpening(false);
    }
  };

  return (
    <Dialog title="Abrir mesa" size="sm" onClose={onClose} dismissible={!opening}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field
          label="Número ou nome da mesa"
          htmlFor="table-identifier"
          error={error}
          hint="Ex.: 5, A3, Varanda"
        >
          <Input
            id="table-identifier"
            autoFocus
            maxLength={TABLE_IDENTIFIER_MAX_LENGTH}
            value={identifier}
            invalid={!!error}
            aria-describedby={error ? 'table-identifier-error' : 'table-identifier-hint'}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setError('');
            }}
          />
        </Field>
        <Field label="Nome do cliente" htmlFor="table-client" optional>
          <Input
            id="table-client"
            maxLength={80}
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </Field>
        <DialogActions>
          <Button variant="secondary" onClick={onClose} disabled={opening}>
            Voltar
          </Button>
          <Button type="submit" loading={opening}>
            Abrir mesa
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
