'use client';

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cx } from '@/lib/cx';
import IconButton from './IconButton';

interface DialogProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  // Conteúdo fixo abaixo do título (ex.: busca) e rodapé fixo (ex.: botões); o meio rola
  header?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  // false enquanto salva: Esc, clique fora e o X não fecham
  dismissible?: boolean;
}

const SIZE = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-2xl' };

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Pilha de diálogos abertos: só o de cima responde ao teclado (uma confirmação sobre outro diálogo)
const stack: string[] = [];

// Diálogo no computador, folha que sobe de baixo (sheet) no celular
export default function Dialog({
  title,
  description,
  onClose,
  children,
  header,
  footer,
  size = 'md',
  dismissible = true,
}: DialogProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-header/60 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && dismissible) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cx(
          'flex w-full flex-col bg-surface outline-none',
          'max-h-[94vh] rounded-t-lg sm:max-h-[90vh] sm:rounded-lg',
          SIZE[size],
        )}
      >
        <div className="px-5 sm:px-6 pt-4 sm:pt-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 pt-2">
              <h2 id={titleId} className="font-display text-xl font-bold text-ink break-words">
                {title}
              </h2>
              {description && (
                <p id={descId} className="text-sm text-ink-muted mt-1">
                  {description}
                </p>
              )}
            </div>
            <IconButton icon={X} label="Fechar" onClick={onClose} disabled={!dismissible} className="-mr-2" />
          </div>
          {header && <div className="mt-3">{header}</div>}
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-5 sm:pb-6">{children}</div>

        {footer && (
          <div className="border-t border-hairline px-5 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Rodapé padrão: no celular os botões empilham (principal em cima), no computador ficam lado a lado
export function DialogActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{children}</div>;
}
