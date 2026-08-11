import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Timeline from './components/Timeline';
import TicketDetail from './components/TicketDetail';
import TicketForm from './components/TicketForm';
import Scanner from './components/Scanner';
import Settings from './components/Settings';
import { allTickets, deleteTicket, putTicket, uid } from './db';
import { importCanvas, importFile } from './lib/importer';
import { dayKey, todayKey } from './lib/dates';
import type { Ticket, TicketDraft } from './types';
import type { Key, Lang } from './i18n';
import { detectLang, saveLang, translator } from './i18n';

type Filter = 'upcoming' | 'all' | 'used';

type Overlay =
  | { kind: 'none' }
  | { kind: 'add' }
  | { kind: 'detail'; id: string }
  // `seq` keys the form so each draft in the review queue gets a fresh set of
  // inputs instead of inheriting the previous ticket's values.
  | { kind: 'form'; draft: TicketDraft; editing?: string; seq: number }
  | { kind: 'scanner' }
  | { kind: 'settings' };

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
}

const sampleTickets = (t: (k: Key) => string): Ticket[] => {
  const day = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const base = { barcodes: [], pages: [], createdAt: Date.now(), usedAt: null };
  return [
    {
      ...base, id: uid(), title: 'Musée du Louvre — timed entry', kind: 'museum',
      start: `${day(0)}T09:30`, venue: 'Pyramide entrance', city: 'Paris',
      code: 'LVR-8842019', party: '2 × adults', provider: 'Sample',
      notes: t('empty.sampleNote'),
    },
    {
      ...base, id: uid(), title: 'Eurostar 9037 · Paris → London', kind: 'transport',
      start: `${day(1)}T16:13`, venue: 'Gare du Nord', city: 'Paris',
      code: 'XKD8P2', provider: 'Sample',
    },
    {
      ...base, id: uid(), title: 'Sagrada Família + towers', kind: 'museum',
      start: `${day(4)}T11:00`, venue: 'Carrer de la Marina 253', city: 'Barcelona',
      code: 'SF-2026-77410', party: '2 × adults', provider: 'Sample',
    },
  ];
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Lang>(detectLang);
  const t = useMemo(() => translator(lang), [lang]);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [overlay, setOverlay] = useState<Overlay>({ kind: 'none' });
  const [busy, setBusy] = useState<Key | null>(null);
  const [queue, setQueue] = useState<TicketDraft[]>([]);
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formSeq = useRef(0);

  const openForm = (draft: TicketDraft, editing?: string) =>
    setOverlay({ kind: 'form', draft, editing, seq: ++formSeq.current });

  const refresh = useCallback(async () => {
    setTickets(await allTickets());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const chooseLang = (next: Lang) => {
    setLang(next);
    saveLang(next);
  };

  // ------------------------------------------------------------------ import

  const handleFiles = async (files: File[]) => {
    const drafts: TicketDraft[] = [];
    for (const file of files) {
      try {
        drafts.push(await importFile(file, step => setBusy(`import.${step}` as Key)));
      } catch (err) {
        // Surfaced in the console too: a broken PDF is the one thing a user
        // might reasonably want to report.
        console.error('Wanderpass import failed', file.name, err);
        setBusy(null);
        alert(t('import.failed'));
      }
    }
    setBusy(null);
    if (!drafts.length) return;
    // Review one at a time; the rest wait in the queue.
    setQueue(drafts.slice(1));
    openForm(drafts[0]);
  };

  const handleCapture = async (frame: HTMLCanvasElement) => {
    setBusy('import.read');
    try {
      openForm(await importCanvas(frame, 'camera'));
    } catch {
      alert(t('import.failed'));
      setOverlay({ kind: 'none' });
    } finally {
      setBusy(null);
    }
  };

  const nextInQueue = () => {
    if (queue.length) {
      openForm(queue[0]);
      setQueue(q => q.slice(1));
    } else {
      setOverlay({ kind: 'none' });
    }
  };

  const save = async (draft: TicketDraft, editing?: string) => {
    const existing = editing ? tickets.find(x => x.id === editing) : undefined;
    const { guessed: _guessed, ...fields } = draft;
    await putTicket({
      ...fields,
      id: existing?.id ?? uid(),
      createdAt: existing?.createdAt ?? Date.now(),
      usedAt: existing?.usedAt ?? null,
    });
    await refresh();
    if (editing) setOverlay({ kind: 'detail', id: editing });
    else nextInQueue();
  };

  // ------------------------------------------------------------------- lists

  const today = todayKey();
  const visible = tickets.filter(ticket => {
    if (filter === 'used') return !!ticket.usedAt;
    if (filter === 'all') return true;
    if (ticket.usedAt) return false;
    const key = dayKey(ticket.start);
    return !key || key >= today;
  });

  const current = overlay.kind === 'detail' ? tickets.find(x => x.id === overlay.id) : undefined;
  useEffect(() => {
    // The ticket was deleted from under us.
    if (overlay.kind === 'detail' && !current) setOverlay({ kind: 'none' });
  }, [overlay, current]);

  // --------------------------------------------------------------------- ui

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col">
      <header className="pad-top sticky top-0 z-20 bg-[#f7f5f2]/95 px-4 pb-2 pt-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-stone-900">{t('app.name')}</h1>
          <button
            onClick={() => setOverlay({ kind: 'settings' })}
            aria-label={t('settings.title')}
            className="grid size-9 place-items-center rounded-full text-stone-500 active:bg-stone-200"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Zm7.4-2.6.1-.9-.1-.9 1.9-1.5-1.9-3.3-2.3.9a7.3 7.3 0 0 0-1.6-.9L15.1 4H8.9l-.4 2.3c-.6.2-1.1.5-1.6.9l-2.3-.9L2.7 9.6l1.9 1.5-.1.9.1.9-1.9 1.5 1.9 3.3 2.3-.9c.5.4 1 .7 1.6.9l.4 2.3h6.2l.4-2.3c.6-.2 1.1-.5 1.6-.9l2.3.9 1.9-3.3-1.9-1.5Z" />
            </svg>
          </button>
        </div>

        <nav className="mt-3 flex gap-1 rounded-full bg-stone-200/70 p-1 text-sm font-medium">
          {(['upcoming', 'all', 'used'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-full py-1.5 transition ${
                filter === f ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
              }`}
            >
              {t(`nav.${f}` as Key)}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 px-4 pb-28 pt-2">
        {install && (
          <button
            onClick={async () => {
              await install.prompt();
              setInstall(null);
            }}
            className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-stone-900/10 bg-stone-900 px-4 py-3 text-left text-white"
          >
            <span className="text-lg">📲</span>
            <span className="flex-1 text-sm font-semibold">
              {t('settings.install')}
              <span className="mt-0.5 block text-xs font-normal text-white/60">
                {t('settings.installHint')}
              </span>
            </span>
          </button>
        )}

        {visible.length === 0 ? (
          tickets.length === 0 ? (
            <div className="mt-16 text-center">
              <p className="text-5xl">🎫</p>
              <h2 className="mt-4 text-lg font-semibold text-stone-900">{t('empty.title')}</h2>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-stone-500">
                {t('empty.body')}
              </p>
              <button
                onClick={() => setOverlay({ kind: 'add' })}
                className="mt-6 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white"
              >
                {t('empty.cta')}
              </button>
              <button
                onClick={async () => {
                  for (const s of sampleTickets(t)) await putTicket(s);
                  await refresh();
                }}
                className="mt-3 block w-full text-sm text-stone-400 underline underline-offset-4"
              >
                {t('empty.sample')}
              </button>
            </div>
          ) : (
            <p className="mt-16 text-center text-sm text-stone-400">{t('empty.filtered')}</p>
          )
        ) : (
          <Timeline
            tickets={visible}
            lang={lang}
            t={t}
            onOpen={ticket => setOverlay({ kind: 'detail', id: ticket.id })}
          />
        )}
      </main>

      <div className="pad-bottom pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-lg justify-center bg-gradient-to-t from-[#f7f5f2] via-[#f7f5f2]/90 to-transparent px-4 pb-4 pt-8">
        <button
          onClick={() => setOverlay({ kind: 'add' })}
          className="pointer-events-auto rounded-full bg-stone-900 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-stone-900/20 active:scale-95"
        >
          + {t('add.title')}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,image/*"
        multiple
        className="hidden"
        onChange={e => {
          // Copy the list out first: clearing `value` (so picking the same file
          // twice still fires a change) also empties the live FileList.
          // (The cast is needed only because the repo has no React typings, so
          // the event object arrives as `any`.)
          const picked = e.target.files as FileList | null;
          const files = picked ? Array.from(picked) : [];
          e.target.value = '';
          if (files.length) {
            setOverlay({ kind: 'none' });
            handleFiles(files);
          }
        }}
      />

      {overlay.kind === 'add' && (
        <div
          className="fixed inset-0 z-30 flex items-end bg-black/30 fade-in"
          onClick={() => setOverlay({ kind: 'none' })}
        >
          <div
            className="pad-bottom sheet-up w-full rounded-t-3xl bg-white p-3 sm:mx-auto sm:max-w-lg sm:rounded-b-3xl"
            onClick={e => e.stopPropagation()}
          >
            {[
              { key: 'file', action: () => fileRef.current?.click(), icon: '📄' },
              { key: 'camera', action: () => setOverlay({ kind: 'scanner' }), icon: '📷' },
              {
                key: 'manual',
                action: () =>
                  openForm({ title: '', kind: 'museum', barcodes: [], pages: [], guessed: [] }),
                icon: '✏️',
              },
            ].map(item => (
              <button
                key={item.key}
                onClick={item.action}
                className="flex w-full items-center gap-3 rounded-2xl p-3 text-left active:bg-stone-100"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-stone-100 text-xl">
                  {item.icon}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-stone-900">
                    {t(`add.${item.key}` as Key)}
                  </span>
                  <span className="block text-xs text-stone-500">
                    {t(`add.${item.key}Hint` as Key)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {overlay.kind === 'scanner' && (
        <Scanner t={t} onCapture={handleCapture} onClose={() => setOverlay({ kind: 'none' })} />
      )}

      {overlay.kind === 'form' && (
        <TicketForm
          key={overlay.seq}
          draft={overlay.draft}
          heading={overlay.editing ? t('common.edit') : t('review.title')}
          t={t}
          onSave={draft => save(draft, overlay.editing)}
          onCancel={() =>
            overlay.editing ? setOverlay({ kind: 'detail', id: overlay.editing }) : nextInQueue()
          }
        />
      )}

      {current && (
        <TicketDetail
          ticket={current}
          lang={lang}
          t={t}
          onClose={() => setOverlay({ kind: 'none' })}
          onEdit={() => openForm({ ...current, guessed: [] }, current.id)}
          onDelete={async () => {
            await deleteTicket(current);
            setOverlay({ kind: 'none' });
            await refresh();
          }}
          onToggleUsed={async () => {
            await putTicket({ ...current, usedAt: current.usedAt ? null : Date.now() });
            await refresh();
          }}
        />
      )}

      {overlay.kind === 'settings' && (
        <Settings
          lang={lang}
          t={t}
          onLang={chooseLang}
          onChanged={refresh}
          onClose={() => setOverlay({ kind: 'none' })}
        />
      )}

      {busy && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-white/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="mx-auto size-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900" />
            <p className="mt-3 text-sm text-stone-600">{t(busy)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
