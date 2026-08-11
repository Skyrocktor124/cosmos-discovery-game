import React, { useEffect, useState } from 'react';
import type { Ticket } from '../types';
import { KIND_EMOJI } from '../types';
import { barcodeLabel } from '../lib/barcode';
import { formatFullDate, formatTime } from '../lib/dates';
import AssetImage from './AssetImage';
import type { Key, Lang } from '../i18n';
import { LOCALES } from '../i18n';

interface Props {
  ticket: Ticket;
  lang: Lang;
  t: (k: Key) => string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleUsed: () => void;
}

/** Keep the screen awake while a code is on display — phones love to dim just
 *  as you reach the front of the queue. */
const useWakeLock = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    let sentinel: { release: () => Promise<void> } | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const lock = await (navigator as Navigator & {
          wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
        }).wakeLock?.request('screen');
        if (cancelled) await lock?.release();
        else sentinel = lock ?? null;
      } catch {
        // Unsupported or denied — the screen just dims as usual.
      }
    };

    request();
    // Browsers drop the lock whenever the tab is hidden; take it again on return.
    const onVisible = () => document.visibilityState === 'visible' && request();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      sentinel?.release().catch(() => undefined);
    };
  }, [active]);
};

const TicketDetail: React.FC<Props> = ({ ticket, lang, t, onClose, onEdit, onDelete, onToggleUsed }) => {
  const [showFull, setShowFull] = useState(ticket.barcodes.length === 0);
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  useWakeLock(true);

  const barcode = ticket.barcodes[index];
  const locale = LOCALES[lang];

  // Venue lines lifted off a voucher usually end with the city already.
  const place = [
    ticket.venue,
    ticket.city && !ticket.venue?.toLowerCase().includes(ticket.city.toLowerCase())
      ? ticket.city
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const copy = async () => {
    if (!ticket.code) return;
    try {
      await navigator.clipboard.writeText(ticket.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (insecure context) — the code is on screen anyway.
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex flex-col overflow-y-auto bg-white fade-in">
      <header className="pad-top sticky top-0 z-10 flex items-center gap-2 bg-white/95 px-2 py-2 backdrop-blur">
        <button
          onClick={onClose}
          className="rounded-full px-3 py-2 text-sm font-medium text-stone-600 active:bg-stone-100"
        >
          ‹ {t('common.back')}
        </button>
        <div className="flex-1" />
        <button
          onClick={onEdit}
          className="rounded-full px-3 py-2 text-sm font-medium text-stone-600 active:bg-stone-100"
        >
          {t('common.edit')}
        </button>
      </header>

      <div className="px-5 pb-2">
        <p className="flex items-center gap-2 text-sm text-stone-500">
          <span>{KIND_EMOJI[ticket.kind]}</span>
          <span>{t(`kind.${ticket.kind}` as Key)}</span>
          {ticket.provider && <span>· {ticket.provider}</span>}
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-stone-900">
          {ticket.title}
        </h1>
        {ticket.start && (
          <p className="mt-2 text-lg font-semibold text-stone-800">
            {formatFullDate(ticket.start.slice(0, 10), locale)}
            {ticket.start.includes('T') && (
              <span className="ml-2 font-mono tabular-nums">{formatTime(ticket.start, locale)}</span>
            )}
          </p>
        )}
        {place && <p className="mt-1 text-sm text-stone-600">{place}</p>}
        {ticket.party && <p className="mt-1 text-sm text-stone-600">{ticket.party}</p>}
      </div>

      {/* The part that matters at the turnstile. */}
      <div className="px-4 pt-2">
        {barcode && !showFull ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-3 shadow-sm">
            <AssetImage
              id={barcode.assetId ?? ticket.pages[barcode.page]}
              alt={barcodeLabel(barcode)}
              className="mx-auto w-full max-w-sm rounded-xl"
            />
            <p className="mt-2 break-all text-center font-mono text-[11px] text-stone-400">
              {barcodeLabel(barcode)} · {barcode.text.slice(0, 60)}
              {barcode.text.length > 60 ? '…' : ''}
            </p>
          </div>
        ) : ticket.pages.length ? (
          <div className="space-y-3">
            {ticket.pages.map(page => (
              <AssetImage
                key={page}
                id={page}
                alt={ticket.title}
                className="w-full rounded-2xl border border-stone-200 shadow-sm"
              />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-stone-100 p-6 text-center text-sm text-stone-500">
            {t('detail.noCode')}
          </p>
        )}
      </div>

      {ticket.barcodes.length > 1 && !showFull && (
        <div className="mt-3 flex justify-center gap-2">
          {ticket.barcodes.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}`}
              className={`size-2.5 rounded-full ${i === index ? 'bg-stone-800' : 'bg-stone-300'}`}
            />
          ))}
        </div>
      )}

      {barcode && (
        <p className="px-8 pt-3 text-center text-xs text-stone-400">{t('detail.brightness')}</p>
      )}

      <div className="mt-4 space-y-2 px-4 pb-8">
        {ticket.barcodes.length > 0 && ticket.pages.length > 0 && (
          <button
            onClick={() => setShowFull(v => !v)}
            className="w-full rounded-2xl border border-stone-200 bg-white py-3 text-sm font-semibold text-stone-700 active:bg-stone-50"
          >
            {showFull ? t('detail.showCode') : t('detail.showFull')}
          </button>
        )}

        {ticket.code && (
          <button
            onClick={copy}
            className="flex w-full items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left active:bg-stone-50"
          >
            <span className="text-xs uppercase tracking-wide text-stone-400">{t('field.code')}</span>
            <span className="font-mono text-sm font-semibold text-stone-800">
              {copied ? t('detail.copied') : ticket.code}
            </span>
          </button>
        )}

        {ticket.notes && (
          <p className="whitespace-pre-wrap rounded-2xl bg-stone-100 p-4 text-sm text-stone-700">
            {ticket.notes}
          </p>
        )}

        <button
          onClick={onToggleUsed}
          className="w-full rounded-2xl bg-stone-900 py-3 text-sm font-semibold text-white active:bg-stone-700"
        >
          {ticket.usedAt ? t('detail.markUnused') : t('detail.markUsed')}
        </button>

        <button
          onClick={() => {
            if (confirm(t('common.deleteConfirm'))) onDelete();
          }}
          className="w-full py-3 text-sm font-medium text-red-600 active:opacity-60"
        >
          {t('common.delete')}
        </button>
      </div>
    </div>
  );
};

export default TicketDetail;
