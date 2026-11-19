'use client';

import { useEffect, useState } from 'react';
import { LogOut, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage, tokenStore } from '@/services/http';
import { getSettings } from '@/services/settings';
import { ROLE_LABEL, time } from '@/lib/format';
import { activeFor, tokenIssuedAt } from '@/lib/session';
import type { Theme } from '@/lib/theme';
import { useTheme } from '@/hooks/useTheme';
import { cx } from '@/lib/cx';
import { useSession } from '@/hooks/useSession';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Icon from '@/components/ui/Icon';
import PageTitle from '@/components/ui/PageTitle';
import SecuritySection from '@/components/features/settings/SecuritySection';
import TotalTablesDialog from '@/components/features/tables/TotalTablesDialog';

const THEMES: { key: Theme; label: string; icon: typeof Sun }[] = [
  { key: 'light', label: 'Claro', icon: Sun },
  { key: 'dark', label: 'Escuro', icon: Moon },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <Card as="section" aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="font-semibold text-ink">
        {title}
      </h2>
      {children}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-ink">{value}</dd>
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout } = useSession();
  const isAdmin = user.role === 'ADMIN';
  const [loginAt, setLoginAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [theme, chooseTheme] = useTheme();
  const [totalTables, setTotalTables] = useState<number | null>(null);
  const [editingTotal, setEditingTotal] = useState(false);

  // Lidos depois de montar: o HTML do servidor não conhece o navegador
  useEffect(() => {
    setLoginAt(tokenIssuedAt(tokenStore.get()));
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    getSettings()
      .then((s) => setTotalTables(s.totalTables))
      .catch((e) => toast.error(errorMessage(e, 'Erro ao carregar o restaurante')));
  }, [isAdmin]);

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <PageTitle title="Configurações" />

      <Section id="cfg-perfil" title="Meu perfil">
        <dl className="space-y-1.5">
          <Row label="Nome" value={user.name} />
          <Row label="Usuário" value={user.username} />
          <Row label="Perfil" value={ROLE_LABEL[user.role] ?? user.role} />
          {user.email && <Row label="E-mail" value={user.email} />}
        </dl>
      </Section>

      <Section id="cfg-sessao" title="Sessão">
        <p className="text-sm text-ink tabular-nums">
          {loginAt ? (
            <>
              Entrou{' '}
              {loginAt.toDateString() === new Date(now).toDateString()
                ? 'hoje'
                : 'em ' + loginAt.toLocaleDateString('pt-BR')}{' '}
              às {time(loginAt.toISOString())} · {activeFor(loginAt, now)}
            </>
          ) : (
            '—'
          )}
        </p>
      </Section>

      <section aria-label="Segurança">
        <SecuritySection />
      </section>

      <Section id="cfg-aparencia" title="Aparência">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="cfg-aparencia">
          {THEMES.map((t) => {
            const active = theme === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => chooseTheme(t.key)}
                className={cx(
                  'flex min-h-tap items-center justify-center gap-2 rounded-sm border p-2 text-sm font-semibold transition-colors',
                  active
                    ? 'border-accent bg-accent/10 text-accent-strong'
                    : 'border-hairline bg-surface text-ink hover:bg-surface-2',
                )}
              >
                <Icon icon={t.icon} />
                {t.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-ink-muted">Vale só neste aparelho.</p>
      </Section>

      {isAdmin && (
        <Section id="cfg-restaurante" title="Restaurante">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-ink">
              Total de mesas: <strong className="tabular-nums">{totalTables ?? '…'}</strong>
            </p>
            <Button
              variant="secondary"
              size="sm"
              disabled={totalTables === null}
              onClick={() => setEditingTotal(true)}
            >
              Alterar
            </Button>
          </div>
        </Section>
      )}

      <Button variant="secondary" icon={LogOut} className="w-full" onClick={logout}>
        Sair
      </Button>

      {editingTotal && totalTables !== null && (
        <TotalTablesDialog
          current={totalTables}
          onClose={() => setEditingTotal(false)}
          onSaved={setTotalTables}
        />
      )}
    </div>
  );
}
