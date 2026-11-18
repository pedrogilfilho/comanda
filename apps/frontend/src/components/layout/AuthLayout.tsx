interface AuthLayoutProps {
  subtitle?: string;
  children: React.ReactNode;
}

// Telas fora da sessão (login, troca de senha): fundo escuro, marca e um cartão claro no centro
export default function AuthLayout({ subtitle, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-header flex flex-col items-center justify-center px-4 py-8 sm:px-6">
      <div className="mb-8 text-center">
        <p className="font-display text-2xl font-bold text-on-header">Comanda+</p>
        <p className="mt-1 text-sm text-on-header/70">{subtitle ?? 'Quintal do Roger'}</p>
      </div>
      <main className="w-full max-w-sm rounded-lg bg-surface p-5 sm:p-6">{children}</main>
    </div>
  );
}
