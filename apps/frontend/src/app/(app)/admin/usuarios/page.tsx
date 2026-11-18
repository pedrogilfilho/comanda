'use client';

import { listUsers } from '@/services/users';
import { useSession } from '@/hooks/useSession';
import { useResource } from '@/hooks/useResource';
import UsersManager from '@/components/features/admin/UsersManager';

export default function UsuariosPage() {
  const { user } = useSession();
  const { data, loading, reload } = useResource(listUsers, 'Erro ao carregar usuários');
  return <UsersManager users={data ?? []} loading={loading} currentUserId={user.id} onChange={reload} />;
}
