interface StatTileProps {
  label: string;
  value: React.ReactNode;
  color: string;
}

export default function StatTile({ label, value, color }: StatTileProps) {
  return (
    <div
      className="rounded-2xl px-4 py-3 sm:p-5 flex items-center justify-between gap-3 sm:block"
      style={{ background: '#fff9f2', border: '1px solid #d9cfc2' }}
    >
      <p className="text-xs font-medium" style={{ color: '#6b5a4a' }}>
        {label}
      </p>
      <p
        className="text-xl sm:text-3xl font-bold sm:mt-2 whitespace-nowrap"
        style={{ color, fontFamily: 'Georgia, serif' }}
      >
        {value}
      </p>
    </div>
  );
}
