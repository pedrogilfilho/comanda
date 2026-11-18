'use client';

import { useState } from 'react';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_PASSWORD, ROLE_LABEL, USER_DELETE_GRACE_DAYS } from '@comanda/shared';
import { errorMessage } from '@/services/http';
import type { AppUser, UserRole } from '@/types/api';
import {
  createUser,
  deleteUser,
  resetUserPassword,
  resetUserTwoFactor,
  setUserActive,
} from '@/services/users';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Dialog, { DialogActions } from '@/components/ui/Dialog';
import Field, { Input, Select } from '@/components/ui/Field';
import PageTitle from '@/components/ui/PageTitle';
import { SkeletonList } from '@/components/ui/Skeleton';

const DAY = 24 * 60 * 60 * 1000;
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

// Exclusão liberada só depois do prazo da desativação
function deleteState(u: AppUser): { allowed: boolean; hint: string } {
  if (u.active || !u.deletableAt)
    return {
      allowed: false,
      hint: `Desative primeiro; a exclusão é liberada ${USER_DELETE_GRACE_DAYS} dias depois`,
    };
  const left = Math.ceil((new Date(u.deletableAt).getTime() - Date.now()) / DAY);
  if (left > 0)
    return {
      allowed: false,
      hint: `Exclusão liberada em ${shortDate(u.deletableAt)} (faltam ${left} ${left === 1 ? 'dia' : 'dias'})`,
    };
  return { allowed: true, hint: `Desativado há mais de ${USER_DELETE_GRACE_DAYS} dias` };
}

type Pending = { kind: 'delete' | 'reset' | 'toggle' | 'reset2fa'; user: AppUser } | null;

// Texto de cada confirmação
function pendingCopy(p: NonNullable<Pending>): { title: string; confirm: string; message: React.ReactNode } {
  const name = <strong>{p.user.name}</strong>;
  switch (p.kind) {
    case 'delete':
      return {
        title: 'Excluir usuário',
        confirm: 'Excluir usuário',
        message: (
          <>
            Excluir {name}? Esta ação não pode ser desfeita. Usuários que já lançaram pedidos ficam só
            desativados, para manter o histórico.
          </>
        ),
      };
    case 'reset2fa':
      return {
        title: 'Resetar verificação em 2 etapas',
        confirm: 'Resetar verificação',
        message: (
          <>
            Use quando {name} perdeu o celular. A verificação em 2 etapas será removida
            {p.user.twoFactorRequired
              ? ' e precisará ser configurada de novo no próximo login, porque é obrigatória para este perfil.'
              : '. Ela pode ser ativada de novo na página Segurança.'}
          </>
        ),
      };
    case 'reset':
      return {
        title: 'Resetar senha',
        confirm: 'Resetar senha',
        message: (
          <>
            A senha de {name} volta a ser <strong>{DEFAULT_PASSWORD}</strong> e precisa ser trocada no próximo
            acesso.
          </>
        ),
      };
    default:
      return p.user.active
        ? {
            title: 'Desativar usuário',
            confirm: 'Desativar usuário',
            message: (
              <>
                {name} não consegue mais entrar até ser reativado. O histórico de pedidos é mantido. A
                exclusão fica disponível {USER_DELETE_GRACE_DAYS} dias depois da desativação.
              </>
            ),
          }
        : {
            title: 'Reativar usuário',
            confirm: 'Reativar usuário',
            message: <>{name} volta a poder entrar no sistema.</>,
          };
  }
}

interface UsersManagerProps {
  users: AppUser[];
  loading: boolean;
  currentUserId?: string;
  onChange: () => void;
}

export default function UsersManager({ users, loading, currentUserId, onChange }: UsersManagerProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', role: 'GARCOM' as UserRole });
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim()) {
      toast.error('Preencha o nome e o usuário');
      return;
    }
    setCreating(true);
    try {
      await createUser({
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        role: form.role,
      });
      toast.success(`Usuário ${form.name.trim()} criado. Senha inicial: ${DEFAULT_PASSWORD}`);
      setForm({ name: '', username: '', role: 'GARCOM' });
      setShowCreate(false);
      onChange();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao criar usuário'));
    } finally {
      setCreating(false);
    }
  };

  const confirmPending = async () => {
    if (!pending) return;
    setBusy(true);
    const { kind, user } = pending;
    try {
      if (kind === 'delete') {
        await deleteUser(user.id);
        toast.success(`Usuário ${user.name} excluído`);
      } else if (kind === 'reset2fa') {
        await resetUserTwoFactor(user.id);
        toast.success(`Verificação em 2 etapas de ${user.name} removida`);
      } else if (kind === 'reset') {
        await resetUserPassword(user.id);
        toast.success(`Senha de ${user.name} redefinida para ${DEFAULT_PASSWORD}`);
      } else {
        await setUserActive(user.id, !user.active);
        toast.success(`Usuário ${user.name} ${user.active ? 'desativado' : 'reativado'}`);
      }
      setPending(null);
      onChange();
    } catch (e) {
      toast.error(errorMessage(e, 'Não foi possível concluir a ação'));
    } finally {
      setBusy(false);
    }
  };

  // Sugere o login a partir do primeiro nome
  const suggestUsername = (name: string) =>
    name
      .trim()
      .split(/\s+/)[0]
      ?.normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') ?? '';

  const copy = pending ? pendingCopy(pending) : null;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Usuários"
        subtitle="Quem entra no sistema e com qual perfil"
        actions={
          <Button icon={UserPlus} onClick={() => setShowCreate(true)}>
            Criar usuário
          </Button>
        }
      />

      {loading ? (
        <SkeletonList rows={3} className="h-20" />
      ) : (
        <ul className="space-y-3">
          {users.map((u) => {
            const isMe = u.id === currentUserId;
            const del = deleteState(u);
            return (
              <Card as="li" key={u.id} padding="sm" className={u.active ? 'sm:p-4' : 'sm:p-4 opacity-70'}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">
                      {u.name}
                      {isMe && <span className="text-sm font-normal text-ink-muted"> (você)</span>}
                    </p>
                    <p className="text-sm text-ink-muted">{u.username}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone={u.role === 'ADMIN' ? 'accent' : 'neutral'}>
                        {ROLE_LABEL[u.role] ?? u.role}
                      </Badge>
                      {!u.active ? (
                        <Badge>Inativo</Badge>
                      ) : u.needsPasswordChange ? (
                        <Badge tone="warning">Aguardando 1º acesso</Badge>
                      ) : (
                        <Badge tone="success">Ativo</Badge>
                      )}
                      {u.twoFactorEnabled ? (
                        <Badge tone="success" icon={ShieldCheck} title="Verificação em 2 etapas ativa">
                          2 etapas
                        </Badge>
                      ) : (
                        u.twoFactorRequired &&
                        u.active && (
                          <Badge
                            tone="warning"
                            icon={ShieldCheck}
                            title="Precisa configurar no próximo login"
                          >
                            Configura no próximo login
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                  {!isMe && (
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPending({ kind: 'reset', user: u })}
                      >
                        Resetar senha
                      </Button>
                      {u.twoFactorEnabled && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setPending({ kind: 'reset2fa', user: u })}
                        >
                          Resetar 2 etapas
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPending({ kind: 'toggle', user: u })}
                      >
                        {u.active ? 'Desativar' : 'Reativar'}
                      </Button>
                      {!u.active && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => del.allowed && setPending({ kind: 'delete', user: u })}
                          disabled={!del.allowed}
                          title={del.hint}
                        >
                          Excluir
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {!isMe && !u.active && (
                  <p className={del.allowed ? 'mt-2 text-sm text-success' : 'mt-2 text-sm text-ink-muted'}>
                    {u.deactivatedAt ? `Desativado em ${shortDate(u.deactivatedAt)}. ` : ''}
                    {del.hint}
                  </p>
                )}
              </Card>
            );
          })}
        </ul>
      )}

      {showCreate && (
        <Dialog title="Criar usuário" onClose={() => setShowCreate(false)} dismissible={!creating}>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Nome" htmlFor="user-name">
              <Input
                id="user-name"
                autoFocus
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    username:
                      f.username && f.username !== suggestUsername(f.name)
                        ? f.username
                        : suggestUsername(name),
                  }));
                }}
              />
            </Field>
            <Field
              label="Usuário (login)"
              htmlFor="user-username"
              hint="Letras minúsculas, números, ponto ou hífen."
            >
              <Input
                id="user-username"
                value={form.username}
                aria-describedby="user-username-hint"
                onChange={(e) =>
                  setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, '') }))
                }
                autoCapitalize="none"
              />
            </Field>
            <Field label="Perfil" htmlFor="user-role">
              <Select
                id="user-role"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
              >
                <option value="GARCOM">Garçom</option>
                <option value="COZINHA">Cozinha</option>
                <option value="GERENTE">Gerente (fecha contas e vê relatórios)</option>
                <option value="ADMIN">Administrador</option>
              </Select>
            </Field>
            <p className="rounded-md bg-surface-2 p-3 text-sm text-ink-muted">
              A senha inicial é <strong>{DEFAULT_PASSWORD}</strong>. O usuário troca no primeiro acesso.
            </p>
            <DialogActions>
              <Button variant="secondary" onClick={() => setShowCreate(false)} disabled={creating}>
                Voltar
              </Button>
              <Button type="submit" loading={creating}>
                Criar usuário
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}

      {pending && copy && (
        <ConfirmDialog
          title={copy.title}
          message={copy.message}
          confirmLabel={copy.confirm}
          tone={pending.kind === 'delete' ? 'danger' : 'primary'}
          loading={busy}
          onConfirm={confirmPending}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
