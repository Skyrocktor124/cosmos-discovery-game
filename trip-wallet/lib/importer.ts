// File in, reviewable ticket draft out.
//
// Order matters: render → find the code → crop it → read the text. The crop is
// stored losslessly because it is the image a turnstile scanner has to read;
// the full page is JPEG because it is only ever looked at by a human.

import { detectBarcode, cropBarcode } from './barcode';
import { extract } from './extract';
import { canvasToBlob, renderFile } from './render';
import { putAsset, uid } from '../db';
import type { Barcode, TicketDraft } from '../types';

const storeCanvas = async (
  canvas: HTMLCanvasElement,
  lossless: boolean,
): Promise<string> => {
  const id = uid();
  await putAsset({
    id,
    blob: await canvasToBlob(canvas, lossless),
    width: canvas.width,
    height: canvas.height,
  });
  return id;
};

export const importFile = async (
  file: File,
  onProgress?: (step: string) => void,
): Promise<TicketDraft> => {
  onProgress?.('render');
  const { pages, text } = await renderFile(file);
  if (!pages.length) throw new Error('nothing to import');

  const pageIds: string[] = [];
  const barcodes: Barcode[] = [];

  for (let i = 0; i < pages.length; i++) {
    const canvas = pages[i];
    onProgress?.('scan');
    const det = await detectBarcode(canvas);
    // Pages after the first are usually terms and conditions; keep them only
    // when they actually carry a code (multi-visitor vouchers often do).
    if (i > 0 && !det) continue;

    pageIds.push(await storeCanvas(canvas, false));
    if (det) {
      barcodes.push({
        text: det.text,
        format: det.format,
        page: pageIds.length - 1,
        assetId: await storeCanvas(cropBarcode(canvas, det), true),
      });
    }
  }

  onProgress?.('read');
  const info = extract(text, barcodes[0]?.text);

  return {
    title: info.title || file.name.replace(/\.[a-z0-9]+$/i, ''),
    kind: info.kind ?? 'museum',
    start: info.start,
    venue: info.venue,
    city: info.city,
    code: info.code,
    party: info.party,
    provider: info.provider,
    barcodes,
    pages: pageIds,
    sourceName: file.name,
    guessed: info.guessed,
  };
};

/**
 * A frame grabbed from the live camera — a paper ticket, or a code on someone
 * else's screen. We keep the frame as the page image and crop the code out of
 * it, so the wallet never has to re-encode a payload it might not understand
 * (Aztec and PDF417 are read-only for us).
 */
export const importCanvas = async (
  canvas: HTMLCanvasElement,
  name: string,
): Promise<TicketDraft> => {
  const det = await detectBarcode(canvas);
  const pageId = await storeCanvas(canvas, false);
  const barcodes: Barcode[] = det
    ? [{
        text: det.text,
        format: det.format,
        page: 0,
        assetId: await storeCanvas(cropBarcode(canvas, det), true),
      }]
    : [];

  const info = extract('', det?.text);
  return {
    title: '',
    kind: 'museum',
    provider: info.provider,
    barcodes,
    pages: [pageId],
    sourceName: name,
    guessed: info.guessed,
  };
};
