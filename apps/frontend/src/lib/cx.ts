// Junta classes CSS ignorando valores falsos: cx('a', cond && 'b')
export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');
