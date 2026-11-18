'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/services/http';
import { openTable } from '@/services/tables';
import Button from '@/components/ui/Button';
import Dialog, { DialogActions } from '@/components/ui/Dialog';
import Field, { Input } from '@/components/ui/Field';

interface OpenTableDialogProps {
  identifier: string; // a mesa tocada no mapa
  onClose: () => void;
  onOpened: () => void;
}

export default function OpenTableDialog({ identifier, onClose, onOpened }: OpenTableDialogProps) {
  const [clientName, setClientName] = useState('');
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpening(true);
    try {
      await openTable({ identifier, clientName: clientName.trim() || undefined });
      toast.success(`Mesa ${identifier} aberta`);
      onOpened();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Erro ao abrir mesa'));
      setOpening(false);
    }
  };

  return (
    <Dialog title={`Abrir mesa ${identifier}`} size="sm" onClose={onClose} dismissible={!opening}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Nome do cliente" htmlFor="table-client" optional error={error}>
          <Input
            id="table-client"
            autoFocus
            maxLength={80}
            value={clientName}
            invalid={!!error}
            onChange={(e) => {
              setClientName(e.target.value);
              setError('');
            }}
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
