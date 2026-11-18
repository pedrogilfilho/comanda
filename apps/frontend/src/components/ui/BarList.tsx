export interface BarRow {
  label: string;
  value: number;
  display: string;
  hint?: string;
}

// Ranking em barras horizontais; o primeiro fica em destaque
export default function BarList({ rows }: { rows: BarRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.label}>
          <div className="flex justify-between gap-3 text-sm mb-1">
            <span className="text-ink font-medium min-w-0">
              <span className="text-ink-muted tabular-nums">{i + 1}.</span> {r.label}
              {r.hint && <span className="text-xs font-normal text-ink-muted"> · {r.hint}</span>}
            </span>
            <span className="font-semibold whitespace-nowrap text-accent-strong tabular-nums">
              {r.display}
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-2" aria-hidden>
            <div
              className={i === 0 ? 'h-2 rounded-full bg-accent' : 'h-2 rounded-full bg-accent/40'}
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
