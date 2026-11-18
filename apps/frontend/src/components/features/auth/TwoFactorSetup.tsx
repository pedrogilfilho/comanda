'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, Download, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage } from '@/services/http';
import { TwoFactorSetup as SetupData } from '@/services/auth';
import Button, { buttonClass } from '@/components/ui/Button';
import CodeInput from '@/components/ui/CodeInput';
import Icon from '@/components/ui/Icon';
import Skeleton from '@/components/ui/Skeleton';

interface TwoFactorSetupProps {
  start: () => Promise<SetupData>; // gera o QR Code
  confirm: (code: string) => Promise<{ recoveryCodes: string[] }>; // ativa com o 1º código
  onFinish: () => void; // depois que o usuário guardou os códigos de recuperação
  onCancel?: () => void;
  intro?: React.ReactNode;
  username?: string; // vai no arquivo de códigos baixado
}

// Passo a passo: escanear o QR Code, digitar o código, guardar os códigos de recuperação
export default function TwoFactorSetup({
  start,
  confirm,
  onFinish,
  onCancel,
  intro,
  username,
}: TwoFactorSetupProps) {
  const [data, setData] = useState<SetupData | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start()
      .then(setData)
      .catch((e) => {
        toast.error(errorMessage(e, 'Não foi possível gerar o QR Code'));
        onCancel?.();
      });
  }, [start, onCancel]);

  const handleConfirm = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length !== 6) {
      toast.error('Digite os 6 dígitos que aparecem no app');
      return;
    }
    setBusy(true);
    try {
      const res = await confirm(code);
      setRecoveryCodes(res.recoveryCodes);
      toast.success('Verificação em 2 etapas ativada');
    } catch (err) {
      toast.error(errorMessage(err, 'Código inválido'));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const copyCodes = async () => {
    if (!recoveryCodes) return;
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      toast.success('Códigos copiados');
    } catch {
      toast.error('Não foi possível copiar. Anote os códigos à mão.');
    }
  };

  // Arquivo .txt com os códigos (para guardar no computador, Drive, etc.)
  const downloadCodes = () => {
    if (!recoveryCodes) return;
    const when = new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const text = [
      'Comanda+ - Quintal do Roger',
      'Códigos de recuperação da verificação em 2 etapas',
      username ? `Usuário: ${username}` : '',
      `Gerados em: ${when}`,
      '',
      'Use um destes códigos no lugar do código do app se perder o celular.',
      'Cada código vale UMA VEZ SÓ. Guarde este arquivo em lugar seguro e não compartilhe.',
      '',
      ...recoveryCodes.map((c, i) => `${i + 1}. ${c}`),
      '',
    ]
      .filter((l, i) => l !== '' || i > 3)
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `codigos-recuperacao${username ? `-${username}` : ''}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success('Arquivo com os códigos baixado');
  };

  // Passo 3: códigos de recuperação (aparecem uma única vez)
  if (recoveryCodes) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">Guarde seus códigos de recuperação</h2>
          <p className="text-sm text-ink-muted mt-1">
            Se perder o celular, use um destes códigos no lugar do código do app. Cada um vale{' '}
            <strong>uma vez só</strong>. Eles não aparecem de novo: baixe o arquivo, copie ou tire um print e
            guarde em lugar seguro.
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-2 rounded-md bg-surface-2 p-3">
          {recoveryCodes.map((c) => (
            <li key={c} className="text-center">
              <code className="font-mono text-base font-semibold text-ink break-all">{c}</code>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" icon={Download} onClick={downloadCodes}>
            Baixar códigos
          </Button>
          <Button variant="secondary" icon={Copy} onClick={copyCodes}>
            Copiar códigos
          </Button>
        </div>
        <label className="flex min-h-tap cursor-pointer items-center gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
            className="h-5 w-5 flex-shrink-0 accent-[rgb(var(--accent-strong))]"
          />
          Já guardei os códigos em um lugar seguro
        </label>
        <Button block onClick={onFinish} disabled={!saved}>
          Concluir configuração
        </Button>
      </div>
    );
  }

  // Passos 1 e 2: QR Code e código
  return (
    <form onSubmit={handleConfirm} className="space-y-4">
      {intro}
      <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-muted">
        <li>
          Instale no celular o <strong>Google Authenticator</strong> ou o{' '}
          <strong>Microsoft Authenticator</strong>.
        </li>
        <li>
          No app, toque em <strong>+</strong> e escaneie o QR Code abaixo.
        </li>
        <li>Digite o código de 6 dígitos que aparece no app.</li>
      </ol>

      <div className="flex justify-center">
        {data ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.qrCode}
            alt="QR Code para o app autenticador"
            className="h-48 w-48 rounded-md border border-hairline bg-white p-2 sm:h-52 sm:w-52"
          />
        ) : (
          <Skeleton className="h-48 w-48 rounded-md sm:h-52 sm:w-52" />
        )}
      </div>

      {data && (
        <div className="space-y-2 text-center">
          {/* No celular não dá para escanear a própria tela: o link abre o app direto */}
          <a
            href={data.otpauthUrl}
            className={buttonClass({ variant: 'secondary', block: true, className: 'sm:hidden' })}
          >
            <Icon icon={Smartphone} />
            Abrir no app autenticador
          </a>
          {showKey ? (
            <p className="text-sm text-ink-muted">
              Chave para digitar no app:
              <code className="mt-1 block select-all break-all font-mono text-sm font-semibold text-ink">
                {data.secret}
              </code>
            </p>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowKey(true)}>
              Mostrar a chave para digitar
            </Button>
          )}
        </div>
      )}

      <CodeInput
        value={code}
        onChange={setCode}
        disabled={!data || busy}
        label="Código de 6 dígitos do app"
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Voltar
          </Button>
        )}
        <Button type="submit" disabled={!data} loading={busy}>
          Ativar verificação
        </Button>
      </div>
    </form>
  );
}
