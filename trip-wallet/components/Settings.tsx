import React, { useEffect, useRef, useState } from 'react';
import { clearAll, estimateUsage, requestPersistence } from '../db';
import { downloadBlob, exportBackup, restoreBackup } from '../lib/backup';
import type { Key, Lang } from '../i18n';

interface Props {
  lang: Lang;
  t: (k: Key) => string;
  onLang: (lang: Lang) => void;
  onChanged: () => void;
  onClose: () => void;
}

const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const Row: React.FC<{ onClick?: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left text-sm text-stone-800 disabled:opacity-100 active:bg-stone-50"
  >
    {children}
  </button>
);

const Settings: React.FC<Props> = ({ lang, t, onLang, onChanged, onClose }) => {
  const [usage, setUsage] = useState<number | null>(null);
  const [persisted, setPersisted] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    estimateUsage().then(setUsage);
    navigator.storage?.persisted?.().then(setPersisted).catch(() => undefined);
    setOfflineReady(!!navigator.serviceWorker?.controller);
  }, []);

  const restore = async (file: File) => {
    try {
      await restoreBackup(file);
      onChanged();
      estimateUsage().then(setUsage);
    } catch {
      alert(t('import.failed'));
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex flex-col overflow-y-auto bg-[#f7f5f2] sheet-up">
      <header className="pad-top sticky top-0 z-10 flex items-center border-b border-stone-200 bg-[#f7f5f2]/95 px-3 py-2 backdrop-blur">
        <button
          onClick={onClose}
          className="rounded-full px-3 py-2 text-sm font-medium text-stone-600 active:bg-stone-200"
        >
          ‹ {t('common.back')}
        </button>
        <h1 className="flex-1 pr-16 text-center text-sm font-semibold text-stone-900">
          {t('settings.title')}
        </h1>
      </header>

      <div className="space-y-6 p-4 pb-16">
        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <Row>
            <span>{t('settings.language')}</span>
            <span className="flex gap-1 rounded-full bg-stone-100 p-1">
              {(['en', 'zh'] as Lang[]).map(code => (
                <span
                  key={code}
                  onClick={() => onLang(code)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold ${
                    lang === code ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
                  }`}
                >
                  {code === 'en' ? 'English' : '中文'}
                </span>
              ))}
            </span>
          </Row>
        </section>

        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <Row>
            <span>{t('settings.storage')}</span>
            <span className="font-mono text-stone-500">{usage === null ? '…' : formatBytes(usage)}</span>
          </Row>
          <div className="h-px bg-stone-100" />
          <Row
            onClick={persisted ? undefined : async () => setPersisted(await requestPersistence())}
          >
            <span>{t('settings.persist')}</span>
            <span className="text-stone-500">{persisted ? `✓ ${t('settings.persisted')}` : '›'}</span>
          </Row>
          <div className="h-px bg-stone-100" />
          <Row>
            <span>{t('settings.offline')}</span>
            <span className="text-stone-500">
              {offlineReady ? '✓' : t('settings.offlineNo')}
            </span>
          </Row>
        </section>

        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <Row
            onClick={async () => {
              const stamp = new Date().toISOString().slice(0, 10);
              downloadBlob(await exportBackup(), `wanderpass-${stamp}.json`);
            }}
          >
            <span>
              {t('settings.export')}
              <span className="mt-0.5 block text-xs text-stone-400">{t('settings.exportHint')}</span>
            </span>
            <span className="text-stone-400">›</span>
          </Row>
          <div className="h-px bg-stone-100" />
          <Row onClick={() => fileRef.current?.click()}>
            <span>{t('settings.import')}</span>
            <span className="text-stone-400">›</span>
          </Row>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={e => {
              // Pull the File out before clearing `value`: the reset empties
              // the input's FileList.
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) restore(file);
            }}
          />
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-stone-900">{t('settings.privacyTitle')}</h2>
          <p className="mt-2 text-xs leading-relaxed text-stone-500">{t('settings.privacy')}</p>
          <h2 className="mt-4 text-sm font-semibold text-stone-900">{t('settings.install')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">{t('settings.installHint')}</p>
        </section>

        <button
          onClick={async () => {
            if (!confirm(t('settings.clearConfirm'))) return;
            await clearAll();
            onChanged();
            estimateUsage().then(setUsage);
          }}
          className="w-full py-3 text-sm font-medium text-red-600 active:opacity-60"
        >
          {t('settings.clear')}
        </button>
      </div>
    </div>
  );
};

export default Settings;
