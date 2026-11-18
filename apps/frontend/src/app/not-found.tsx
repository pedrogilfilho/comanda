import Link from 'next/link';
import { buttonClass } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 text-center sm:px-6">
      <p className="font-display text-2xl font-bold text-ink">Página não encontrada</p>
      <p className="mt-2 text-base text-ink-muted">
        O endereço pode estar errado ou a página mudou de lugar.
      </p>
      <Link href="/" className={buttonClass({ className: 'mt-6' })}>
        Voltar ao início
      </Link>
    </main>
  );
}
