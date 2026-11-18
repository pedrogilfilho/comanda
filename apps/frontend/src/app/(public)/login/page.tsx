'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  AuthSession,
  login,
  verifyTwoFactor,
  setupTwoFactorDuringLogin,
  enableTwoFactorDuringLogin,
} from '@/services/auth';
import { errorMessage, isApiError, tokenStore } from '@/services/http';
import AuthLayout from '@/components/layout/AuthLayout';
import Button from '@/components/ui/Button';
import Field, { Input } from '@/components/ui/Field';
import PasswordInput from '@/components/ui/PasswordInput';
import CodeInput from '@/components/ui/CodeInput';
import TwoFactorSetup from '@/components/features/auth/TwoFactorSetup';

type Stage = 'credentials' | 'verify' | 'setup';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>('credentials');
  const [challengeToken, setChallengeToken] = useState('');
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [pendingSession, setPendingSession] = useState<AuthSession | null>(null);

  const finishLogin = useCallback(
    (session: AuthSession) => {
      // Só o token fica no navegador; o perfil vem sempre do GET /auth/me
      tokenStore.set(session.accessToken);
      if (typeof session.recoveryCodesLeft === 'number') {
        toast.warning(
          `Você usou um código de recuperação. Restam ${session.recoveryCodesLeft}. Se perdeu o celular, peça ao administrador para resetar a verificação em 2 etapas.`,
          { duration: 10000 },
        );
      }
      router.push(session.user.needsPasswordChange ? '/change-password' : '/');
    },
    [router],
  );

  const backToCredentials = useCallback(() => {
    setStage('credentials');
    setChallengeToken('');
    setCode('');
    setUseRecovery(false);
    setPassword('');
    setLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(username, password);
      if (result.status === 'OK') {
        finishLogin(result);
        return;
      }
      setChallengeToken(result.challengeToken);
      setStage(result.status === 'TWO_FACTOR_REQUIRED' ? 'verify' : 'setup');
      setLoading(false);
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível entrar'));
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!useRecovery && code.length !== 6) {
      toast.error('Digite os 6 dígitos do app autenticador');
      return;
    }
    setLoading(true);
    try {
      finishLogin(await verifyTwoFactor(challengeToken, code));
    } catch (error) {
      toast.error(errorMessage(error, 'Código inválido'));
      setCode('');
      setLoading(false);
      // Token provisório venceu: volta para usuário e senha
      if (isApiError(error, 'CHALLENGE_EXPIRED')) backToCredentials();
    }
  };

  // Configuração obrigatória (Admin/Gerente): a sessão sai junto com os códigos de recuperação
  const startSetup = useCallback(() => setupTwoFactorDuringLogin(challengeToken), [challengeToken]);
  const confirmSetup = useCallback(
    async (c: string) => {
      const res = await enableTwoFactorDuringLogin(challengeToken, c);
      setPendingSession(res.session);
      return res;
    },
    [challengeToken],
  );

  if (stage === 'setup') {
    return (
      <AuthLayout>
        <h1 className="font-display text-xl font-bold text-ink mb-2">Verificação em 2 etapas</h1>
        <TwoFactorSetup
          intro={
            <p className="text-sm text-ink-muted">
              Para administrador e gerente ela é obrigatória. Configure agora, leva um minuto. Depois, a cada
              login, o sistema pede o código do app.
            </p>
          }
          start={startSetup}
          username={username.trim().toLowerCase()}
          confirm={confirmSetup}
          onCancel={backToCredentials}
          onFinish={() => pendingSession && finishLogin(pendingSession)}
        />
      </AuthLayout>
    );
  }

  if (stage === 'verify') {
    return (
      <AuthLayout>
        <h1 className="font-display text-xl font-bold text-ink">Código de verificação</h1>
        <p className="text-sm text-ink-muted mt-1 mb-5">
          {useRecovery
            ? 'Digite um dos seus códigos de recuperação. Cada um vale uma vez.'
            : 'Abra o app autenticador no celular e digite o código de 6 dígitos.'}
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <CodeInput value={code} onChange={setCode} recovery={useRecovery} disabled={loading} autoFocus />
          <Button type="submit" block loading={loading}>
            Confirmar código
          </Button>
        </form>

        <div className="mt-4 flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setUseRecovery(!useRecovery);
              setCode('');
            }}
          >
            {useRecovery ? 'Usar o código do app' : 'Perdi o celular: usar código de recuperação'}
          </Button>
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={backToCredentials}>
            Voltar ao login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-xl font-bold text-ink mb-5">Entrar</h1>
      <form onSubmit={handleLogin} className="space-y-4">
        <Field label="Usuário" htmlFor="username">
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
          />
        </Field>
        <Field label="Senha" htmlFor="password">
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
            required
          />
        </Field>
        <Button type="submit" block loading={loading} className="mt-2">
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
}
