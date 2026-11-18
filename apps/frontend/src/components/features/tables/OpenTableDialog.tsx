'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { TABLE_IDENTIFIER_MAX_LENGTH } from '@comanda/shared';
import { errorMessage } from '@/services/http';
import { openTable } from '@/services/tables';
import Dialog from '@/components/ui/Dialog';

interface OpenTableDialogProps {
  onClose: () => void;
  onOpened: () => void;
}

export default function OpenTableDialog({ onClose, onOpened }: OpenTableDialogProps) {
  const [identifier, setIdentifier] = useState('');
  const [clientName, setClientName] = useState('');
  const [opening, setOpening] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = identifier.trim();
    if (!id) {
      toast.error('Informe o número ou identificador da mesa');
      return;
    }
    setOpening(true);
    try {
      await openTable({ identifier: id, clientName: clientName.trim() || undefined });
      toast.success(`Mesa ${id} aberta`);
      onOpened();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao abrir mesa'));
      setOpening(false);
    }
  };

  return (
    <Dialog title="Abrir mesa" size="sm" onClose={onClose} dismissible={!opening}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="table-identifier" className="block text-sm font-medium text-[#6b5a4a] mb-1.5">
            Número ou nome da mesa
          </label>
          <input
            id="table-identifier"
            autoFocus
            required
            maxLength={TABLE_IDENTIFIER_MAX_LENGTH}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            style={{ borderColor: '#d9cfc2' }}
            placeholder="Ex: 5, A3, Varanda"
          />
        </div>
        <div>
          <label htmlFor="table-client" className="block text-sm font-medium text-[#6b5a4a] mb-1.5">
            Nome do cliente <span className="font-normal">(opcional)</span>
          </label>
          <input
            id="table-client"
            maxLength={80}
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            style={{ borderColor: '#d9cfc2' }}
            placeholder="Ex: João Silva"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={opening}
            className="flex-1 py-2.5 rounded-lg font-semibold"
            style={{ background: '#f0ebe4', color: '#6b5a4a' }}
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={opening}
            className="flex-1 py-2.5 rounded-lg font-semibold text-white"
            style={{ background: '#c45c2a', opacity: opening ? 0.6 : 1 }}
          >
            {opening ? 'Abrindo…' : 'Abrir mesa'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
