'use client';

import Button from './Button';
import Dialog, { DialogActions } from './Dialog';

interface ConfirmDialogProps {
  title: string;
  message: React.ReactNode;
  confirmLabel: string; // verbo + objeto: "Excluir usuário", "Cancelar pedido"
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode; // campos extras (ex.: motivo)
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  tone = 'primary',
  loading,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog
      title={title}
      onClose={onCancel}
      size="sm"
      dismissible={!loading}
      footer={
        <DialogActions>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Voltar
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </DialogActions>
      }
    >
      <div className="space-y-4 text-sm text-ink-muted">
        <div>{message}</div>
        {children}
      </div>
    </Dialog>
  );
}
