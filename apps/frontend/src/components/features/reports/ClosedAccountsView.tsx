'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, Download, ReceiptText, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { SERVICE_FEE_RATE, installmentValue } from '@comanda/shared';
import { errorMessage } from '@/services/http';
import { listClosedAccounts, ClosedAccountsResult } from '@/services/reports';
import type { Payment } from '@/types/api';
import { money, weight, time, dateTime, todayISO, PAYMENT_LABEL } from '@/lib/format';
import { cx } from '@/lib/cx';
import { currentUserName } from '@/lib/pdf/current-user';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import DateRangeFilter from '@/components/ui/DateRangeFilter';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import PageTitle from '@/components/ui/PageTitle';
import SearchInput from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Field';
import StatTile from '@/components/ui/StatTile';
import { SkeletonList } from '@/components/ui/Skeleton';

const FEE_PERCENT = Math.round(SERVICE_FEE_RATE * 100);

const duration = (from: string, to: string) => {
  const min = Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
};

const paymentText = (p: Payment) =>
  `${PAYMENT_LABEL[p.method] ?? p.method}${p.method === 'CREDITO' && p.installments > 1 ? ` ${p.installments}x` : ''}`;

export default function ClosedAccountsView() {
  const [range, setRange] = useState({ from: todayISO(), to: todayISO() });
  const [data, setData] = useState<ClosedAccountsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await listClosedAccounts(range.from, range.to));
    } catch (e) {
      toast.error(errorMessage(e, 'Erro ao carregar as contas fechadas'));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  // PDF com o resumo e todas as contas do período (ignora o filtro de busca)
  const handlePdf = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const { downloadClosedAccountsPdf } = await import('@/lib/pdf/reports-pdf');
      await downloadClosedAccountsPdf(data, range.from, range.to, currentUserName());
      toast.success('PDF gerado');
    } catch (e) {
      toast.error(errorMessage(e, 'Não foi possível gerar o PDF'));
    } finally {
      setExporting(false);
    }
  };

  const multiDay = range.from !== range.to;
  const accounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byTable = (data?.accounts ?? []).filter((a) => !tableFilter || a.tableIdentifier === tableFilter);
    if (!q) return byTable;
    return byTable.filter(
      (a) =>
        a.tableIdentifier.toLowerCase().includes(q) ||
        (a.openedBy ?? '').toLowerCase().includes(q) ||
        (a.clientName ?? '').toLowerCase().includes(q) ||
        a.closedBy.toLowerCase().includes(q) ||
        a.payments.some((p) => paymentText(p).toLowerCase().includes(q)) ||
        a.orders.some((o) => o.waiter.toLowerCase().includes(q)),
    );
  }, [data, search, tableFilter]);

  // Mesas que aparecem no período, numeradas primeiro
  const tableOptions = useMemo(
    () =>
      [...new Set((data?.accounts ?? []).map((a) => a.tableIdentifier))].sort((a, b) =>
        a.localeCompare(b, 'pt-BR', { numeric: true }),
      ),
    [data],
  );
  const divergent = data?.accounts.filter((a) => a.divergent).length ?? 0;

  return (
    <div className="space-y-5">
      <PageTitle
        title="Contas fechadas"
        subtitle="Cada fechamento de mesa, com pedidos e pagamentos"
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={load}>
              Atualizar lista
            </Button>
            <Button
              variant="secondary"
              icon={Download}
              onClick={handlePdf}
              disabled={!data || loading}
              loading={exporting}
            >
              Baixar PDF
            </Button>
          </>
        }
      />

      <Card>
        <DateRangeFilter from={range.from} to={range.to} onChange={setRange} />
      </Card>

      {data && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
          <StatTile label="Contas fechadas" value={data.summary.count} />
          <StatTile label="Vendas sem taxa" value={money(data.summary.subtotal)} />
          <StatTile label="Taxa de serviço" value={money(data.summary.serviceFee)} tone="success" />
          <StatTile label="Total recebido" value={money(data.summary.total)} tone="accent" />
        </div>
      )}

      {data && data.summary.byPayment.length > 0 && (
        <Card as="section" aria-labelledby="by-payment">
          <h2 id="by-payment" className="mb-3 text-sm font-semibold text-ink-muted">
            Recebido por forma de pagamento
          </h2>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {data.summary.byPayment.map((m) => (
              <div key={m.method}>
                <dt className="text-sm text-ink">{PAYMENT_LABEL[m.method] ?? m.method}</dt>
                <dd className="font-bold text-accent-strong tabular-nums">{money(m.amount)}</dd>
                <dd className="text-xs text-ink-muted">
                  {m.count} {m.count === 1 ? 'pagamento' : 'pagamentos'}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {divergent > 0 && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
        >
          <Icon icon={AlertTriangle} className="mt-0.5" />
          {divergent} {divergent === 1 ? 'conta tem' : 'contas têm'} diferença entre pedidos, valor cobrado e
          pagamentos. Abra a conta para conferir.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          aria-label="Mesa"
          className="sm:w-40"
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
        >
          <option value="">Todas as mesas</option>
          {tableOptions.map((t) => (
            <option key={t} value={t}>
              Mesa {t}
            </option>
          ))}
        </Select>
        <SearchInput
          className="flex-1"
          label="Filtrar contas"
          placeholder="Filtrar por mesa, cliente, funcionário ou pagamento (ex.: pix)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <SkeletonList rows={3} />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={search || tableFilter ? 'Nenhuma conta com esse filtro' : 'Nenhuma conta fechada no período'}
          description={search ? 'Tente outro termo.' : 'Mude o período para ver outros dias.'}
        />
      ) : (
        <ul className="space-y-2">
          {accounts.map((a) => {
            const expanded = open === a.id;
            const panelId = `account-${a.id}`;
            return (
              <Card
                as="li"
                key={a.id}
                padding="none"
                tone={a.divergent ? 'danger' : 'default'}
                className="overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : a.id)}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 p-3 text-left hover:bg-surface-2/60 sm:p-4"
                >
                  <Icon
                    icon={ChevronDown}
                    className={cx('text-ink-muted transition-transform', expanded && 'rotate-180')}
                  />
                  <div className="min-w-[120px]">
                    <p className="font-semibold text-ink">Mesa {a.tableIdentifier}</p>
                    {a.clientName && <p className="text-sm text-ink-muted">{a.clientName}</p>}
                  </div>
                  <div className="order-last min-w-0 flex-1 basis-full text-sm text-ink-muted sm:order-none sm:min-w-[180px] sm:basis-auto">
                    <p className="tabular-nums">
                      {multiDay ? dateTime(a.openedAt) : time(a.openedAt)} até{' '}
                      {multiDay ? dateTime(a.closedAt) : time(a.closedAt)} ({duration(a.openedAt, a.closedAt)}
                      )
                    </p>
                    <p>
                      Garçom <strong className="text-ink">{a.openedBy ?? '—'}</strong> · Fechada por{' '}
                      <strong className="text-ink">{a.closedBy}</strong> · {a.orders.length}{' '}
                      {a.orders.length === 1 ? 'pedido' : 'pedidos'}
                    </p>
                    {a.payments.length > 0 && <p>{a.payments.map(paymentText).join(' + ')}</p>}
                  </div>
                  {a.divergent && <Badge tone="danger">Divergência</Badge>}
                  <span className="ml-auto text-lg font-bold text-accent-strong tabular-nums sm:ml-0">
                    {money(a.total)}
                  </span>
                </button>

                {expanded && (
                  <div id={panelId} className="border-t border-hairline px-3 pb-4 pt-1 sm:px-4">
                    {a.orders.map((o) => (
                      <div key={o.id} className="mt-3">
                        <p className="mb-1 text-sm font-semibold text-ink-muted">
                          Pedido das {time(o.createdAt)}, lançado por {o.waiter}
                        </p>
                        <table className="w-full text-sm">
                          <caption className="sr-only">Itens do pedido das {time(o.createdAt)}</caption>
                          <tbody>
                            {o.items.map((it, i) => (
                              <tr key={i} className="border-b border-hairline last:border-0">
                                <td className="py-1 pr-2 text-ink">
                                  {it.productName}
                                  {it.notes && (
                                    <span className="block text-xs text-warning">Obs.: {it.notes}</span>
                                  )}
                                </td>
                                <td className="whitespace-nowrap py-1 text-right text-ink-muted tabular-nums">
                                  {it.isMeat ? weight(it.quantity) : `${it.quantity} un`}
                                </td>
                                <td className="hidden whitespace-nowrap py-1 pl-3 text-right text-xs text-ink-muted tabular-nums sm:table-cell">
                                  {it.isMeat ? `${money(it.unitPrice)}/kg` : `${money(it.unitPrice)} cada`}
                                </td>
                                <td className="whitespace-nowrap py-1 pl-3 text-right font-medium text-ink tabular-nums">
                                  {money(it.subtotal)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                    <dl className="mt-3 space-y-0.5 border-t border-hairline pt-2 text-sm tabular-nums">
                      <div className="flex justify-between">
                        <dt className="text-ink-muted">Subtotal</dt>
                        <dd>{money(a.subtotal)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-ink-muted">Taxa de serviço ({FEE_PERCENT}%)</dt>
                        <dd>{money(a.serviceFee)}</dd>
                      </div>
                      <div className="flex justify-between font-bold">
                        <dt>Total cobrado</dt>
                        <dd className="text-accent-strong">{money(a.total)}</dd>
                      </div>
                    </dl>
                    {a.payments.length > 0 ? (
                      <div className="pt-2 text-sm">
                        <p className="mb-0.5 font-semibold text-ink-muted">Pagamento</p>
                        <ul>
                          {a.payments.map((p, i) => (
                            <li key={i} className="flex justify-between tabular-nums">
                              <span>
                                {paymentText(p)}
                                {p.method === 'CREDITO' && p.installments > 1 && (
                                  <span className="text-xs text-ink-muted">
                                    {' '}
                                    de {money(installmentValue(p.amount, p.installments))}
                                  </span>
                                )}
                              </span>
                              <span>{money(p.amount)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      a.total > 0 && (
                        <p className="pt-1 text-sm text-ink-muted">Forma de pagamento não registrada.</p>
                      )
                    )}
                    {a.divergent && (
                      <p className="pt-2 text-sm text-danger">
                        Conferir: os pedidos somam {money(a.orders.reduce((s, o) => s + o.subtotal, 0))} e o
                        subtotal cobrado foi {money(a.subtotal)}
                        {a.payments.length > 0 && (
                          <>
                            ; os pagamentos somam {money(a.payments.reduce((s, p) => s + p.amount, 0))} para
                            um total de {money(a.total)}
                          </>
                        )}
                        .
                      </p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
