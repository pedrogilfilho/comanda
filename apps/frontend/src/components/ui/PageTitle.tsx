interface PageTitleProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

// Título da tela (h1) com ações à direita; no celular as ações descem e ocupam a largura
export default function PageTitle({ title, subtitle, actions }: PageTitleProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-ink-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-col gap-2 sm:flex-row sm:flex-shrink-0">{actions}</div>}
    </div>
  );
}
