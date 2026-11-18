'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PASSWORD_MIN_LENGTH, ROLE_LABEL, passwordProblem } from '@comanda/shared';
import { changePassword, getMe, type LoggedUser } from '@/services/auth';
import { errorMessage, tokenStore } from '@/services/http';
import AuthLayout from '@/components/layout/AuthLayout';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import PasswordInput from '@/components/ui/PasswordInput';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [user, setUser] = useState<LoggedUser | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tokenStore.get()) {
      router.replace('/login');
      return;
    }
    getMe()
      .then(setUser)
      .catch(() => router.replace('/login'));
  }, [router]);

  // Primeiro acesso: a senha inicial já foi digitada no login, então não pedimos de novo
  const firstAccess = user?.needsPasswordChange ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstAccess && !currentPassword) {
      setError('Digite a senha atual');
      return;
    }
    const problem = passwordProblem(newPassword);
    if (problem) {
      setError(problem);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      await changePassword(newPassword, firstAccess ? undefined : currentPassword);
      toast.success('Senha alterada');
      router.replace('/');
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível alterar a senha'));
      setLoading(false);
    }
  };

  if (!user) return null;

  const clear = () => setError('');

  return (
    <AuthLayout subtitle={firstAccess ? 'Troca obrigatória no primeiro acesso' : undefined}>
      <h1 className="font-display text-xl font-bold text-ink">Alterar senha</h1>
      <p className="text-sm text-ink-muted mt-1">
        {user.name} · {ROLE_LABEL[user.role] ?? user.role}
      </p>

      <ul className="mt-4 mb-5 space-y-1 rounded-md bg-surface-2 p-3 text-sm text-ink-muted">
        <li>Pelo menos {PASSWORD_MIN_LENGTH} caracteres</li>
        <li>Não pode ter só números</li>
        <li>Pode ter letras, números e símbolos</li>
      </ul>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {!firstAccess && (
          <Field label="Senha atual" htmlFor="current-password">
            <PasswordInput
              id="current-password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                clear();
              }}
              disabled={loading}
              autoComplete="current-password"
            />
          </Field>
        )}
        <Field label="Nova senha" htmlFor="new-password">
          <PasswordInput
            id="new-password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              clear();
            }}
            invalid={!!error}
            aria-describedby={error ? 'password-error' : undefined}
            disabled={loading}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirmar nova senha" htmlFor="confirm-password">
          <PasswordInput
            id="confirm-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              clear();
            }}
            invalid={!!error}
            aria-describedby={error ? 'password-error' : undefined}
            disabled={loading}
            autoComplete="new-password"
          />
        </Field>

        {error && (
          <p id="password-error" role="alert" className="rounded-md bg-danger/10 p-3 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" block loading={loading} className="mt-2">
          Alterar senha
        </Button>
        {!firstAccess && (
          <Button variant="ghost" block onClick={() => router.back()}>
            Voltar
          </Button>
        )}
      </form>
    </AuthLayout>
  );
}
