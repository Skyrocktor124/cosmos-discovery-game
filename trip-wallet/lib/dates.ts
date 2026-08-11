// Ticket times are stored as bare local wall-clock strings and never converted.
// A 10:30 slot at the Uffizi is 10:30 in Florence whether your phone is still
// on Beijing time or has caught up with CEST — converting would be actively
// harmful here.

export const parseLocal = (start?: string): Date | null => {
  if (!start) return null;
  const m = start.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
};

export const hasTime = (start?: string): boolean => !!start && start.includes('T');

export const dayKey = (start?: string): string => start?.slice(0, 10) ?? '';

export const todayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Whole days from today to `key`; negative for the past. */
export const daysFromToday = (key: string): number => {
  const a = parseLocal(todayKey());
  const b = parseLocal(key);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
};

export const formatTime = (start: string | undefined, locale: string): string => {
  const d = parseLocal(start);
  if (!d || !hasTime(start)) return '';
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
};

export const formatDay = (key: string, locale: string): string => {
  const d = parseLocal(key);
  if (!d) return '';
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
};

export const formatFullDate = (key: string, locale: string): string => {
  const d = parseLocal(key);
  if (!d) return '';
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
};

/** Sort key: dated tickets in chronological order, undated ones last. */
export const sortKey = (start?: string): string => start ?? '9999';
