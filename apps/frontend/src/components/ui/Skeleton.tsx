// Bloco cinza pulsando enquanto o conteúdo carrega
export default function Skeleton({ className = 'h-32 rounded-2xl' }: { className?: string }) {
  return <div className={`animate-pulse ${className}`} style={{ background: '#f0e8dd' }} aria-hidden />;
}
