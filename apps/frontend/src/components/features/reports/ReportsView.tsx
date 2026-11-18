'use client';

import { useEffect, useState, useCallback } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { toast } from 'sonner';
import { SERVICE_FEE_RATE } from '@comanda/shared';
import { errorMessage } from '@/services/http';
import { getReports, Reports } from '@/services/reports';
import { money, weight, CATEGORY_LABEL, PAYMENT_LABEL, todayISO } from '@/lib/format';
import { currentUserName } from '@/lib/pdf/current-user';
import BarList from '@/components/ui/BarList';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import DateRangeFilter from '@/components/ui/DateRangeFilter';
import EmptyState from '@/components/ui/EmptyState';
import PageTitle from '@/components/ui/PageTitle';
import Skeleton from '@/components/ui/Skeleton';
import StatTile from '@/components/ui/StatTile';
import Tabs from '@/components/ui/Tabs';

type ReportKey =
  'revenue' | 'payments' | 'employees' | 'tables' | 'beers' | 'meats' | 'categories' | 'ticket';

const REPORTS: { key: ReportKey; label: string }[] = [
  { key: 'revenue', label: 'Faturamento' },
  { key: 'payments', label: 'Formas de pagamento' },
  { key: 'employees', label: 'Vendas por funcionário' },
  { key: 'tables', label: 'Vendas por mesa' },
  { key: 'beers', label: 'Cervejas mais vendidas' },
  { key: 'meats', label: 'Carnes com mais saída' },
  { key: 'categories', label: 'Vendas por categoria' },
  { key: 'ticket', label: 'Ticket médio' },
];

const FEE_PERCENT = Math.round(SERVICE_FEE_RATE * 100);

export default function ReportsView() {
  const [range, setRange] = useState({ from: todayISO(), to: todayISO() });
  const [selected, setSelected] = useState<ReportKey>('revenue');
  const [data, setData] = useState<Reports | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getReports(range.from, range.to));
    } catch (e) {
      toast.error(errorMessage(e, 'Erro ao carregar relatórios'));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  // PDF com todos os relatórios do período
  const handlePdf = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const { downloadReportsPdf } = await import('@/lib/pdf/reports-pdf');
      await downloadReportsPdf(data, range.from, range.to, currentUserName());
      toast.success('PDF gerado');
    } catch (e) {
      toast.error(errorMessage(e, 'Não foi possível gerar o PDF'));
    } finally {
      setExporting(false);
    }
  };

  const empty = (
    <EmptyState
      icon={BarChart3}
      title="Nenhuma venda fechada no período"
      description="Mude o período para ver outros dias."
    />
  );
  const fmt = (d: string) => d.split('-').reverse().join('/');
  const periodLabel =
    range.from === range.to ? `em ${fmt(range.from)}` : `de ${fmt(range.from)} a ${fmt(range.to)}`;

  const render = () => {
    if (!data) return null;
    switch (selected) {
      case 'revenue':
        return data.revenue.accounts === 0 ? (
          empty
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
              <StatTile label="Vendas sem taxa" value={money(data.revenue.subtotal)} />
              <StatTile
                label={`Taxa de serviço (${FEE_PERCENT}%)`}
                value={money(data.revenue.serviceFee)}
                tone="success"
              />
              <StatTile label="Total recebido" value={money(data.revenue.total)} tone="accent" />
            </div>
            <p className="text-sm text-ink-muted">
              {data.revenue.accounts} {data.revenue.accounts === 1 ? 'conta fechada' : 'contas fechadas'}{' '}
              {periodLabel}.
            </p>
          </div>
        );
      case 'payments':
        return data.byPayment.length === 0 ? (
          empty
        ) : (
          <BarList
            rows={data.byPayment.map((m) => ({
              label: PAYMENT_LABEL[m.method] ?? m.method,
              value: m.amount,
              display: money(m.amount),
              hint: `${m.count} ${m.count === 1 ? 'pagamento' : 'pagamentos'}`,
            }))}
          />
        );
      case 'employees':
        return data.topEmployees.length === 0 ? (
          empty
        ) : (
          <BarList
            rows={data.topEmployees.map((e) => ({
              label: e.name,
              value: e.subtotal,
              display: money(e.subtotal),
              hint: `${e.orders} ${e.orders === 1 ? 'pedido' : 'pedidos'}`,
            }))}
          />
        );
      case 'tables':
        return data.byTable.length === 0 ? (
          empty
        ) : (
          <BarList
            rows={data.byTable.map((t) => ({
              label: `Mesa ${t.tableIdentifier}`,
              value: t.total,
              display: money(t.total),
              hint: `${t.accounts} ${t.accounts === 1 ? 'conta' : 'contas'} · ticket ${money(t.averageTicket)}`,
            }))}
          />
        );
      case 'beers':
        return data.topBeers.length === 0 ? (
          empty
        ) : (
          <BarList
            rows={data.topBeers.map((b) => ({
              label: b.name,
              value: b.quantity,
              display: `${b.quantity} un`,
              hint: money(b.subtotal),
            }))}
          />
        );
      case 'meats':
        return data.topMeats.length === 0 ? (
          empty
        ) : (
          <BarList
            rows={data.topMeats.map((m) => ({
              label: m.name,
              value: m.grams,
              display: weight(m.grams),
              hint: money(m.subtotal),
            }))}
          />
        );
      case 'categories':
        return data.byCategory.length === 0 ? (
          empty
        ) : (
          <BarList
            rows={data.byCategory.map((c) => ({
              label: CATEGORY_LABEL[c.category as keyof typeof CATEGORY_LABEL] ?? c.category,
              value: c.subtotal,
              display: money(c.subtotal),
            }))}
          />
        );
      case 'ticket':
        return data.revenue.accounts === 0 ? (
          empty
        ) : (
          <div>
            <p className="text-sm text-ink-muted">Valor médio por conta fechada, com taxa</p>
            <p className="mt-1 font-display text-2xl font-bold text-accent-strong tabular-nums">
              {money(data.averageTicket)}
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              Base: {data.revenue.accounts} {data.revenue.accounts === 1 ? 'conta' : 'contas'} {periodLabel}.
            </p>
          </div>
        );
    }
  };

  const current = REPORTS.find((r) => r.key === selected)!;

  return (
    <div className="space-y-5">
      <PageTitle
        title="Relatórios"
        subtitle="Só contas já fechadas entram nos números"
        actions={
          <Button
            variant="secondary"
            icon={Download}
            onClick={handlePdf}
            disabled={!data || loading}
            loading={exporting}
            title="Baixa um PDF com todos os relatórios do período"
          >
            Baixar PDF do período
          </Button>
        }
      />

      <Card>
        <DateRangeFilter from={range.from} to={range.to} onChange={setRange} />
      </Card>

      <Tabs
        label="Relatório"
        active={selected}
        onChange={(k) => setSelected(k as ReportKey)}
        items={REPORTS.map((r) => ({ key: r.key, label: r.label }))}
      />

      <Card as="section" role="tabpanel" aria-label={current.label} className="sm:p-6">
        <h2 className="mb-4 font-semibold text-ink">{current.label}</h2>
        {loading ? <Skeleton className="h-32 rounded-md" /> : render()}
      </Card>
    </div>
  );
}
