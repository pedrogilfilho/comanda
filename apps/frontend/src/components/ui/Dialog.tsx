'use client';

import { useEffect, useId, useRef } from 'react';

interface DialogProps {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  // Conteúdo fixo abaixo do título (ex.: busca) e rodapé fixo (ex.: botões); o meio rola
  header?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  // false enquanto salva: Esc, clique fora e o × não fecham
  dismissible?: boolean;
}

const SIZE = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' };

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Pilha de diálogos abertos: só o de cima responde ao teclado (um ConfirmModal sobre outro diálogo)
const stack: string[] = [];

export default function Dialog({
  title,
  onClose,
  children,
  header,
  footer,
  size = 'md',
  dismissible = true,
}: DialogProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  onCloseRef.current = onClose;
  dismissibleRef.current = dismissible;

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const previous = document.activeElement as HTMLElement | null;
    stack.push(id);

    // Foco inicial: respeita um autoFocus do conteúdo; senão o próprio painel (no celular não abre o teclado sem pedir)
    if (!panel.contains(document.activeElement)) panel.focus();

    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (dismissibleRef.current) onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      const i = stack.lastIndexOf(id);
      if (i >= 0) stack.splice(i, 1);
      if (stack.length === 0) document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [id]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && dismissible) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`bg-white rounded-t-2xl sm:rounded-2xl w-full ${SIZE[size]} max-h-[94vh] sm:max-h-[90vh] flex flex-col outline-none`}
      >
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-3">
          <div className="flex items-start justify-between gap-3">
            <h2
              id={titleId}
              className="text-lg sm:text-xl font-bold text-[#2a1f14] min-w-0 break-words"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={!dismissible}
              className="-mr-2 -mt-1 w-10 h-10 flex-shrink-0 rounded-lg text-2xl leading-none text-[#7a6650] hover:bg-[#f5f0eb] disabled:opacity-40"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
          {header && <div className="mt-3">{header}</div>}
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-5 sm:pb-6">{children}</div>

        {footer && (
          <div
            className="border-t px-5 sm:px-6 py-3 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4"
            style={{ borderColor: '#e8ddd2' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
