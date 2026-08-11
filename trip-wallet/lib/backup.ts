// Export / restore. With no server behind the app, a backup file is the only
// thing standing between a cleared browser and a lost trip, so it carries the
// images too rather than just the metadata.

import { allAssets, allTickets, putAsset, putTicket } from '../db';
import type { Asset, Ticket } from '../types';

interface Payload {
  format: 'wanderpass-backup';
  version: 1;
  exportedAt: string;
  tickets: Ticket[];
  assets: { id: string; width: number; height: number; type: string; data: string }[];
}

const toBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const fromBase64 = (data: string, type: string): Blob => {
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
};

export const exportBackup = async (): Promise<Blob> => {
  const [tickets, assets] = await Promise.all([allTickets(), allAssets()]);
  const payload: Payload = {
    format: 'wanderpass-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    tickets,
    assets: await Promise.all(
      assets.map(async (a: Asset) => ({
        id: a.id,
        width: a.width,
        height: a.height,
        type: a.blob.type || 'image/jpeg',
        data: await toBase64(a.blob),
      })),
    ),
  };
  return new Blob([JSON.stringify(payload)], { type: 'application/json' });
};

/** Merge a backup into whatever is already here; matching ids are overwritten. */
export const restoreBackup = async (file: File): Promise<number> => {
  const payload = JSON.parse(await file.text()) as Payload;
  if (payload?.format !== 'wanderpass-backup') throw new Error('not a Wanderpass backup');

  for (const a of payload.assets ?? []) {
    await putAsset({ id: a.id, width: a.width, height: a.height, blob: fromBase64(a.data, a.type) });
  }
  for (const ticket of payload.tickets ?? []) {
    await putTicket({ ...ticket, barcodes: ticket.barcodes ?? [], pages: ticket.pages ?? [] });
  }
  return payload.tickets?.length ?? 0;
};

export const downloadBlob = (blob: Blob, name: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};
