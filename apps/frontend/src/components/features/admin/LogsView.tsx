'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { History, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AUDIT_ACTION_LABEL, type AuditAction } from '@comanda/shared';
import { errorMessage } from '@/services/http';
import { listLogs, AuditLog } from '@/services/reports';
import { time, dateTime, todayISO } from '@/lib/format';
import Badge, { type BadgeTone } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import DateRangeFilter from '@/components/ui/DateRangeFilter';
import EmptyState from '@/components/ui/EmptyState';
import Field, { Select } from '@/components/ui/Field';
import PageTitle from '@/components/ui/PageTitle';
import SearchInput from '@/components/ui/SearchInput';
import { SkeletonList } from '@/components/ui/Skeleton';

// Cor do selo por tipo de ação: verde = algo concluído, vermelho = remoção, laranja = mudança de acesso
const ACTION_TONE: Partial<Record<AuditAction, BadgeTone>> = {
  CONTA_FECHADA: 'success',
  PEDIDO_LANCADO: 'accent',
  PEDIDO_CANCELADO: 'danger',
  MESA_ABERTA: 'accent',
  SENHA_RESETADA: 'warning',
  DOIS_FATORES_ATIVADO: 'success',
  DOIS_FATORES_RESETADO: 'warning',
  USUARIO_ATIVADO: 'success',
  USUARIO_EXCLUIDO: 'danger',
  ITEM_REMOVIDO: 'danger',
};

const ACTION_OPTIONS = (Object.entries(AUDIT_ACTION_LABEL) as [AuditAction, string][]).sort((a, b) =>
  a[1].localeCompare(b[1], 'pt-BR'),
);

export default function LogsView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState({ from: todayISO(), to: todayISO() });
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await listLogs(range.from, range.to, action || undefined));
    } catch (e) {
      toast.error(errorMessage(e, 'Erro ao carregar logs'));
    } finally {
      setLoading(false);
    }
  }, [range, action]);

  useEffect(() => {
    load();
  }, [load]);

  const multiDay = range.from !== range.to;
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) => l.actor.toLowerCase().includes(q) || l.details.toLowerCase().includes(q));
  }, [logs, search]);

  return (
    <div className="space-y-5">
      <PageTitle
        title="Logs do sistema"
        subtitle={`${visible.length} ${visible.length === 1 ? 'registro' : 'registros'} no período`}
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={load}>
            Atualizar logs
          </Button>
        }
      />

      <Card className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <Field label="Tipo" htmlFor="log-action" className="w-full sm:w-auto sm:min-w-[220px]">
          <Select id="log-action" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">Todos os tipos</option>
            {ACTION_OPTIONS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <DateRangeFilter from={range.from} to={range.to} onChange={setRange} />
      </Card>

      <SearchInput
        label="Filtrar por usuário ou detalhe"
        placeholder="Filtrar por usuário ou detalhe (ex.: mesa 5, Picanha)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <SkeletonList rows={4} className="h-14" />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={History}
          title="Nenhuma atividade encontrada"
          description="Mude o período ou os filtros."
        />
      ) : (
        <Card as="section" padding="none" aria-label="Atividades">
          <ul className="divide-y divide-hairline">
            {visible.map((l) => (
              <li key={l.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={ACTION_TONE[l.action as AuditAction] ?? 'neutral'}>
                    {AUDIT_ACTION_LABEL[l.action as AuditAction] ?? l.action}
                  </Badge>
                  <span className="text-sm font-semibold text-ink">{l.actor}</span>
                  <span className="text-sm text-ink-muted tabular-nums">
                    {multiDay ? dateTime(l.createdAt) : time(l.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink">{l.details}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
