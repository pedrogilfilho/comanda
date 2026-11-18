'use client';

import Dialog from './Dialog';

interface ConfirmModalProps {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode; // campos extras (ex.: motivo)
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel,
  tone = 'primary',
  loading,
  onConfirm,
  onCancel,
  children,
}: ConfirmModalProps) {
  const color = tone === 'danger' ? '#b03a2e' : '#c45c2a';
  return (
    <Dialog
      title={title}
      onClose={onCancel}
      size="sm"
      dismissible={!loading}
      footer={
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg font-semibold"
            style={{ background: '#f0ebe4', color: '#6b5a4a' }}
          >
            Voltar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg font-semibold text-white"
            style={{ background: color, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Aguarde…' : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="text-sm space-y-3" style={{ color: '#6b5a4a' }}>
        <div>{message}</div>
        {children}
      </div>
    </Dialog>
  );
}
