import React from 'react';
import type { Ticket } from '../types';
import { KIND_EMOJI } from '../types';
import { dayKey, daysFromToday, formatDay, formatTime, sortKey } from '../lib/dates';
import type { Key, Lang } from '../i18n';
import { LOCALES } from '../i18n';

interface Props {
  tickets: Ticket[];
  lang: Lang;
  t: (k: Key) => string;
  onOpen: (t: Ticket) => void;
}

const dayLabel = (key: string, lang: Lang, t: (k: Key) => string): string => {
  if (!key) return t('day.undated');
  const delta = daysFromToday(key);
  if (delta === 0) return t('day.today');
  if (delta === 1) return t('day.tomorrow');
  if (delta === -1) return t('day.yesterday');
  return formatDay(key, LOCALES[lang]);
};

const Timeline: React.FC<Props> = ({ tickets, lang, t, onOpen }) => {
  const sorted = [...tickets].sort((a, b) => sortKey(a.start).localeCompare(sortKey(b.start)));

  // Group into day buckets while preserving the sorted order.
  const groups: { key: string; items: Ticket[] }[] = [];
  for (const ticket of sorted) {
    const key = dayKey(ticket.start);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(ticket);
    else groups.push({ key, items: [ticket] });
  }

  return (
    <div className="space-y-6">
      {groups.map(group => {
        const isToday = group.key !== '' && daysFromToday(group.key) === 0;
        return (
          <section key={group.key || 'undated'}>
            <h2
              className={`sticky top-0 z-10 -mx-4 bg-[#f7f5f2]/95 px-4 py-2 text-sm font-semibold backdrop-blur ${
                isToday ? 'text-amber-700' : 'text-stone-500'
              }`}
            >
              {dayLabel(group.key, lang, t)}
            </h2>
            <ul className="space-y-2">
              {group.items.map(ticket => (
                <li key={ticket.id}>
                  <button
                    onClick={() => onOpen(ticket)}
                    className={`flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 text-left shadow-sm transition active:scale-[0.99] ${
                      ticket.usedAt ? 'opacity-55' : ''
                    }`}
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-stone-100 text-xl">
                      {KIND_EMOJI[ticket.kind]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        {ticket.start?.includes('T') && (
                          <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-stone-900">
                            {formatTime(ticket.start, LOCALES[lang])}
                          </span>
                        )}
                        <span className="truncate font-medium text-stone-900">
                          {ticket.title || t('field.title')}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2 text-xs text-stone-500">
                        <span className="truncate">
                          {ticket.venue || ticket.city || ticket.provider || ''}
                        </span>
                        {ticket.usedAt ? (
                          <span className="shrink-0 rounded-full bg-stone-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                            {t('detail.usedOn')}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    {ticket.barcodes.length > 0 && (
                      <span className="shrink-0 text-stone-300" aria-hidden>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 3h8v8H3V3Zm2 2v4h4V5H5Zm8-2h8v8h-8V3Zm2 2v4h4V5h-4ZM3 13h8v8H3v-8Zm2 2v4h4v-4H5Zm8-2h3v3h-3v-3Zm5 0h3v3h-3v-3Zm-5 5h3v3h-3v-3Zm5 0h3v3h-3v-3Z" />
                        </svg>
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

export default Timeline;
