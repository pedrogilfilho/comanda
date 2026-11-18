'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage } from '@/services/http';
import {
  TwoFactorStatus,
  getTwoFactorStatus,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
} from '@/services/auth';
import TwoFactorSetup from '@/components/features/auth/TwoFactorSetup';
import Badge from '@/components/ui/Badge';
import Button, { buttonClass } from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import CodeInput from '@/components/ui/CodeInput';
import Icon from '@/components/ui/Icon';
import Skeleton from '@/components/ui/Skeleton';
import { useSession } from '@/hooks/useSession';

// Senha e verificação em 2 etapas (antes era a página /seguranca)
export default function SecuritySection() {
  const { user } = useSession();
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [mode, setMode] = useState<'view' | 'setup' | 'disable'>('view');
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await getTwoFactorStatus());
    } catch (e) {
      toast.error(errorMessage(e, 'Erro ao carregar a segurança da conta'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const backToView = useCallback(() => {
    setMode('view');
    setCode('');
    setUseRecovery(false);
  }, []);

  const handleDisable = async () => {
    if (!useRecovery && code.length !== 6) {
      toast.error('Digite os 6 dígitos do app autenticador');
      return;
    }
    setBusy(true);
    try {
      await disableTwoFactor(code);
      toast.success('Verificação em 2 etapas desativada');
      backToView();
      load();
    } catch (e) {
      toast.error(errorMessage(e, 'Não foi possível desativar'));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card as="section" aria-labelledby="two-factor-title">
        {!status ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-2/3 rounded-sm" />
            <Skeleton className="h-4 w-full rounded-sm" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        ) : mode === 'setup' ? (
          <TwoFactorSetup
            start={setupTwoFactor}
            username={user.username}
            confirm={enableTwoFactor}
            onCancel={backToView}
            onFinish={() => {
              backToView();
              load();
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="two-factor-title" className="flex items-center gap-2 font-semibold text-ink">
                <Icon icon={ShieldCheck} className="text-ink-muted" />
                Verificação em 2 etapas
              </h2>
              <Badge tone={status.enabled ? 'success' : 'neutral'}>
                {status.enabled ? 'Ativada' : 'Desativada'}
              </Badge>
            </div>
            <p className="text-sm text-ink-muted">
              Além da senha, o login pede um código de 6 dígitos gerado pelo app autenticador do seu celular.
              Assim, mesmo que alguém descubra sua senha, não consegue entrar.
            </p>

            {status.required && (
              <p className="rounded-md bg-warning/10 p-3 text-sm text-warning">
                Obrigatória para administrador e gerente. Se perder o celular, use um código de recuperação ou
                peça a outro administrador para resetar.
              </p>
            )}

            {status.enabled && (
              <p className={status.recoveryCodesLeft <= 2 ? 'text-sm text-danger' : 'text-sm text-ink-muted'}>
                Códigos de recuperação restantes: <strong>{status.recoveryCodesLeft}</strong>
                {status.recoveryCodesLeft <= 2 &&
                  '. Estão acabando: peça ao administrador para resetar e configure de novo para gerar códigos novos.'}
              </p>
            )}

            {mode === 'disable' ? (
              <div className="space-y-3 pt-1">
                <label htmlFor="disable-code" className="block text-sm font-semibold text-ink">
                  {useRecovery
                    ? 'Digite um código de recuperação para confirmar'
                    : 'Digite o código atual do app para confirmar'}
                </label>
                <CodeInput
                  id="disable-code"
                  value={code}
                  onChange={setCode}
                  recovery={useRecovery}
                  disabled={busy}
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUseRecovery(!useRecovery);
                    setCode('');
                  }}
                >
                  {useRecovery ? 'Usar o código do app' : 'Usar código de recuperação'}
                </Button>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="secondary" onClick={backToView} disabled={busy}>
                    Voltar
                  </Button>
                  <Button variant="danger" onClick={handleDisable} loading={busy}>
                    Desativar verificação
                  </Button>
                </div>
              </div>
            ) : !status.enabled ? (
              <Button block onClick={() => setMode('setup')}>
                Ativar verificação em 2 etapas
              </Button>
            ) : !status.required ? (
              <Button variant="danger" block onClick={() => setMode('disable')}>
                Desativar verificação em 2 etapas
              </Button>
            ) : null}
          </div>
        )}
      </Card>

      <Card
        as="section"
        aria-labelledby="password-title"
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 id="password-title" className="flex items-center gap-2 font-semibold text-ink">
            <Icon icon={KeyRound} className="text-ink-muted" />
            Senha
          </h2>
          <p className="text-sm text-ink-muted mt-1">Troque a senha de acesso.</p>
        </div>
        <Link
          href="/change-password"
          className={buttonClass({ variant: 'secondary', className: 'w-full sm:w-auto' })}
        >
          Trocar senha
        </Link>
      </Card>
    </div>
  );
}
