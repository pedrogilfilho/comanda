import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 text-center"
      style={{ background: '#faf6ef' }}
    >
      <h1 className="text-6xl font-bold text-[#2a1f14]">404</h1>
      <p className="text-xl text-[#6b5a4a] mt-4">Página não encontrada</p>
      <Link
        href="/"
        className="inline-block mt-6 px-6 py-3 rounded-xl font-semibold"
        style={{ background: '#c45c2a', color: '#faf6ef' }}
      >
        Voltar ao início
      </Link>
    </div>
  );
}
