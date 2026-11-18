'use client';

import { useId } from 'react';
import { todayISO, daysAgoISO } from '@/lib/format';
import { cx } from '@/lib/cx';
import { inputClass } from './Field';

interface DateRangeFilterProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
}

const SHORTCUTS = [
  { label: 'Hoje', range: () => ({ from: todayISO(), to: todayISO() }) },
  { label: 'Ontem', range: () => ({ from: daysAgoISO(1), to: daysAgoISO(1) }) },
  { label: '7 dias', range: () => ({ from: daysAgoISO(6), to: todayISO() }) },
  { label: '30 dias', range: () => ({ from: daysAgoISO(29), to: todayISO() }) },
];

// Período com datas e atalhos; no celular as duas datas ficam lado a lado sem passar da borda
export default function DateRangeFilter({ from, to, onChange }: DateRangeFilterProps) {
  const id = useId();
  return (
    <fieldset className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 w-full sm:w-auto min-w-0">
      <legend className="sr-only">Período</legend>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:flex min-w-0">
        <div className="min-w-0 sm:w-40">
          <label htmlFor={`${id}-from`} className="block text-sm font-medium text-ink mb-1.5">
            De
          </label>
          <input
            id={`${id}-from`}
            type="date"
            value={from}
            max={to}
            onChange={(e) => e.target.value && onChange({ from: e.target.value, to })}
            className={inputClass(false, 'date-input px-2 sm:px-3')}
          />
        </div>
        <div className="min-w-0 sm:w-40">
          <label htmlFor={`${id}-to`} className="block text-sm font-medium text-ink mb-1.5">
            Até
          </label>
          <input
            id={`${id}-to`}
            type="date"
            value={to}
            min={from}
            max={todayISO()}
            onChange={(e) => e.target.value && onChange({ from, to: e.target.value })}
            className={inputClass(false, 'date-input px-2 sm:px-3')}
          />
        </div>
      </div>
      <div
        className="flex w-full sm:w-auto gap-1 rounded-md bg-surface-2 p-1"
        role="group"
        aria-label="Atalhos de período"
      >
        {SHORTCUTS.map((s) => {
          const r = s.range();
          const active = r.from === from && r.to === to;
          return (
            <button
              key={s.label}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(r)}
              className={cx(
                'flex-1 sm:flex-none min-h-tap sm:min-h-9 px-3 rounded-sm text-sm font-semibold whitespace-nowrap transition-colors',
                active
                  ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(var(--ink)/0.12)]'
                  : 'text-ink-muted hover:text-ink',
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
