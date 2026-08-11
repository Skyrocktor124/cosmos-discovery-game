import React, { useState } from 'react';
import type { TicketDraft, TicketKind } from '../types';
import { KIND_EMOJI, TICKET_KINDS } from '../types';
import AssetImage from './AssetImage';
import type { Key } from '../i18n';

interface Props {
  draft: TicketDraft;
  heading: string;
  t: (k: Key) => string;
  onSave: (draft: TicketDraft) => void;
  onCancel: () => void;
}

const splitStart = (start?: string) => ({
  date: start?.slice(0, 10) ?? '',
  time: start?.includes('T') ? start.slice(11, 16) : '',
});

const joinStart = (date: string, time: string): string | undefined => {
  if (!date) return undefined;
  return time ? `${date}T${time}` : date;
};

const Field: React.FC<{
  label: string;
  guessed?: boolean;
  guessedLabel: string;
  children: React.ReactNode;
}> = ({ label, guessed, guessedLabel, children }) => (
  <label className="block">
    <span className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-stone-500">
      {label}
      {guessed && (
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-amber-700">
          {guessedLabel}
        </span>
      )}
    </span>
    {children}
  </label>
);

const inputClass =
  'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-base text-stone-900 outline-none focus:border-stone-400';

const TicketForm: React.FC<Props> = ({ draft, heading, t, onSave, onCancel }) => {
  const initial = splitStart(draft.start);
  const [title, setTitle] = useState(draft.title);
  const [kind, setKind] = useState<TicketKind>(draft.kind);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [venue, setVenue] = useState(draft.venue ?? '');
  const [city, setCity] = useState(draft.city ?? '');
  const [code, setCode] = useState(draft.code ?? '');
  const [party, setParty] = useState(draft.party ?? '');
  const [notes, setNotes] = useState(draft.notes ?? '');

  const guessed = new Set(draft.guessed);
  const preview = draft.barcodes[0]?.assetId ?? draft.pages[0];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...draft,
      title: title.trim() || t('field.title'),
      kind,
      start: joinStart(date, time),
      venue: venue.trim() || undefined,
      city: city.trim() || undefined,
      code: code.trim() || undefined,
      party: party.trim() || undefined,
      notes: notes.trim() || undefined,
      // Once a human has looked at the form, nothing is a guess any more.
      guessed: [],
    });
  };

  return (
    <form
      onSubmit={submit}
      className="fixed inset-0 z-30 flex flex-col overflow-y-auto bg-[#f7f5f2] sheet-up"
    >
      <header className="pad-top sticky top-0 z-10 flex items-center gap-2 border-b border-stone-200 bg-[#f7f5f2]/95 px-3 py-2 backdrop-blur">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-3 py-2 text-sm font-medium text-stone-600 active:bg-stone-200"
        >
          {t('common.cancel')}
        </button>
        <h1 className="flex-1 text-center text-sm font-semibold text-stone-900">{heading}</h1>
        <button
          type="submit"
          className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white active:bg-stone-700"
        >
          {t('common.save')}
        </button>
      </header>

      <div className="space-y-4 p-4 pb-24">
        {preview && (
          <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3">
            <AssetImage
              id={preview}
              alt=""
              className="size-16 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 text-xs text-stone-500">
              <p className="truncate">{draft.sourceName}</p>
              <p className="mt-1">
                {draft.barcodes.length
                  ? draft.barcodes.map(b => b.format.replace(/_/g, ' ')).join(', ')
                  : t('import.noCode')}
              </p>
            </div>
          </div>
        )}

        {guessed.size > 0 && (
          <p className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
            {t('review.guessedNote')}
          </p>
        )}

        <Field label={t('field.title')} guessed={guessed.has('title')} guessedLabel={t('review.guessed')}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('field.titlePlaceholder')}
            className={inputClass}
            autoFocus={!title}
          />
        </Field>

        <div>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
            {t('field.kind')}
          </span>
          <div className="flex flex-wrap gap-2">
            {TICKET_KINDS.map(k => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  kind === k
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-200 bg-white text-stone-700'
                }`}
              >
                {KIND_EMOJI[k]} {t(`kind.${k}` as Key)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('field.date')} guessed={guessed.has('start')} guessedLabel={t('review.guessed')}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
          </Field>
          <Field label={t('field.time')} guessed={guessed.has('start')} guessedLabel={t('review.guessed')}>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputClass} />
          </Field>
        </div>

        <Field label={t('field.venue')} guessed={guessed.has('venue')} guessedLabel={t('review.guessed')}>
          <input value={venue} onChange={e => setVenue(e.target.value)} className={inputClass} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('field.city')} guessed={guessed.has('city')} guessedLabel={t('review.guessed')}>
            <input value={city} onChange={e => setCity(e.target.value)} className={inputClass} />
          </Field>
          <Field label={t('field.party')} guessed={guessed.has('party')} guessedLabel={t('review.guessed')}>
            <input value={party} onChange={e => setParty(e.target.value)} className={inputClass} />
          </Field>
        </div>

        <Field label={t('field.code')} guessedLabel={t('review.guessed')}>
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            className={`${inputClass} font-mono`}
            autoCapitalize="characters"
          />
        </Field>

        <Field label={t('field.notes')} guessedLabel={t('review.guessed')}>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className={inputClass}
          />
        </Field>
      </div>
    </form>
  );
};

export default TicketForm;
