'use client';

import type { Table } from '@/types/api';
import { money } from '@/lib/format';
import Dialog from '@/components/ui/Dialog';

interface PickTableDialogProps {
  tables: Table[]; // só as ocupadas
  onPick: (t: Table) => void;
  onClose: () => void;
}

// "Adicionar itens" pelo topo: escolhe a mesa e segue para o lançamento
export default function PickTableDialog({ tables, onPick, onClose }: PickTableDialogProps) {
  return (
    <Dialog title="Adicionar itens" description="Em qual mesa?" size="sm" onClose={onClose}>
      <ul className="grid grid-cols-3 gap-2">
        {tables.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onPick(t)}
              className="flex min-h-tap w-full flex-col items-center rounded-md border border-accent/40 bg-accent/10 px-2 py-2 text-center hover:bg-accent/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span className="font-display text-lg font-bold leading-none text-ink">{t.identifier}</span>
              <span className="mt-1 w-full truncate text-xs text-ink-muted">
                {t.clientName ?? money(t.total)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
