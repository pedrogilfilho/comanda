import { redirect } from 'next/navigation';

// Link antigo: a segurança agora fica dentro de Configurações
export default function SecurityRedirect() {
  redirect('/configuracoes');
}
