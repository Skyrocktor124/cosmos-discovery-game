// Minimal IndexedDB layer. Tickets are small JSON records; page images and
// barcode crops are stored as Blobs in a separate store so the ticket list can
// be read without pulling megabytes of images into memory.

import type { Asset, Ticket } from './types';

const DB_NAME = 'wanderpass';
const DB_VERSION = 1;
const TICKETS = 'tickets';
const ASSETS = 'assets';

let dbPromise: Promise<IDBDatabase> | null = null;

const open = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TICKETS)) db.createObjectStore(TICKETS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(ASSETS)) db.createObjectStore(ASSETS, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
};

const tx = async <T>(
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = run(t.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const uid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const allTickets = (): Promise<Ticket[]> =>
  tx<Ticket[]>(TICKETS, 'readonly', s => s.getAll());

export const putTicket = (t: Ticket): Promise<IDBValidKey> =>
  tx(TICKETS, 'readwrite', s => s.put(t));

export const deleteTicket = async (t: Ticket): Promise<void> => {
  await Promise.all(assetIdsOf(t).map(id => tx(ASSETS, 'readwrite', s => s.delete(id))));
  await tx(TICKETS, 'readwrite', s => s.delete(t.id));
};

export const putAsset = (a: Asset): Promise<IDBValidKey> =>
  tx(ASSETS, 'readwrite', s => s.put(a));

export const getAsset = (id: string): Promise<Asset | undefined> =>
  tx<Asset | undefined>(ASSETS, 'readonly', s => s.get(id));

export const allAssets = (): Promise<Asset[]> =>
  tx<Asset[]>(ASSETS, 'readonly', s => s.getAll());

/** Every asset a ticket owns — pages plus barcode crops. */
export const assetIdsOf = (t: Ticket): string[] => [
  ...t.pages,
  ...t.barcodes.map(b => b.assetId).filter((id): id is string => !!id),
];

export const clearAll = async (): Promise<void> => {
  await tx(TICKETS, 'readwrite', s => s.clear());
  await tx(ASSETS, 'readwrite', s => s.clear());
};

/** Rough on-disk footprint, for the settings screen. */
export const estimateUsage = async (): Promise<number> => {
  try {
    const est = await navigator.storage?.estimate?.();
    if (est?.usage) return est.usage;
  } catch {
    // Storage Manager unavailable (older Safari) — fall back to summing blobs.
  }
  const assets = await allAssets();
  return assets.reduce((n, a) => n + a.blob.size, 0);
};

/** Ask the browser not to evict the wallet when disk gets tight. */
export const requestPersistence = async (): Promise<boolean> => {
  try {
    if (await navigator.storage?.persisted?.()) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
};
