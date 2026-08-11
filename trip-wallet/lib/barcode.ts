// Barcode detection on a rendered ticket page.
//
// Venue scanners in Europe read a mix of formats: QR at museums, Aztec on DB /
// SNCF / Trenitalia rail tickets, PDF417 on boarding passes, Code128 on some
// legacy attraction vouchers. We decode all of them so we can crop the code out
// of the page and show it big — a small code buried in an A4 PDF is exactly why
// people fumble at the turnstile.

import type { Barcode } from '../types';

export interface Detection {
  text: string;
  format: string;
  /** Bounding box of the code within the source canvas, already padded. */
  box: { x: number; y: number; w: number; h: number };
}

type Zxing = typeof import('@zxing/library');

let readerPromise: Promise<{
  reader: import('@zxing/browser').BrowserMultiFormatReader;
  lib: Zxing;
}> | null = null;

const getReader = () => {
  if (readerPromise) return readerPromise;
  readerPromise = (async () => {
    const [{ BrowserMultiFormatReader }, lib] = await Promise.all([
      import('@zxing/browser'),
      import('@zxing/library'),
    ]);
    const hints = new Map<number, unknown>();
    hints.set(lib.DecodeHintType.POSSIBLE_FORMATS, [
      lib.BarcodeFormat.QR_CODE,
      lib.BarcodeFormat.AZTEC,
      lib.BarcodeFormat.PDF_417,
      lib.BarcodeFormat.DATA_MATRIX,
      lib.BarcodeFormat.CODE_128,
      lib.BarcodeFormat.CODE_39,
      lib.BarcodeFormat.EAN_13,
      lib.BarcodeFormat.ITF,
    ]);
    hints.set(lib.DecodeHintType.TRY_HARDER, true);
    return {
      reader: new BrowserMultiFormatReader(hints as Map<never, never>),
      lib,
    };
  })();
  return readerPromise;
};

/** Camera-facing reader, shared with the live scanner screen. */
export const cameraReader = async () => (await getReader()).reader;

const decodeCanvas = async (canvas: HTMLCanvasElement): Promise<Detection | null> => {
  const { reader, lib } = await getReader();
  try {
    const result = reader.decodeFromCanvas(canvas);
    const points = result.getResultPoints?.() ?? [];
    const xs = points.map(p => p.getX()).filter(Number.isFinite);
    const ys = points.map(p => p.getY()).filter(Number.isFinite);
    const box = xs.length >= 2
      ? { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
      : { x: 0, y: 0, w: canvas.width, h: canvas.height };
    return {
      text: result.getText(),
      format: lib.BarcodeFormat[result.getBarcodeFormat()] ?? 'UNKNOWN',
      box,
    };
  } catch {
    // NotFoundException / ChecksumException / FormatException all mean
    // "nothing readable here" for our purposes.
    return null;
  }
};

/** Copy a region of `src` into a fresh canvas, optionally upscaled. */
const crop = (
  src: HTMLCanvasElement,
  x: number, y: number, w: number, h: number,
  scale = 1,
): HTMLCanvasElement => {
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(w * scale));
  out.height = Math.max(1, Math.round(h * scale));
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingEnabled = scale < 1;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(src, x, y, w, h, 0, 0, out.width, out.height);
  return out;
};

/**
 * Find the code on a page.
 *
 * ZXing looks at the image as a whole, so a 200px QR sitting in a 1600px A4
 * scan often falls below its detection threshold. When the whole-page pass
 * fails we sweep a grid of overlapping tiles, which is what actually rescues
 * most real-world attraction vouchers.
 */
export const detectBarcode = async (canvas: HTMLCanvasElement): Promise<Detection | null> => {
  const whole = await decodeCanvas(canvas);
  if (whole) return whole;

  const cols = 3;
  const rows = 4;
  const tw = canvas.width / cols;
  const th = canvas.height / rows;
  // Overlap by half a tile so a code straddling a seam is still fully inside
  // some tile.
  for (let r = 0; r < rows * 2 - 1; r++) {
    for (let c = 0; c < cols * 2 - 1; c++) {
      const x = Math.max(0, (c * tw) / 2);
      const y = Math.max(0, (r * th) / 2);
      const w = Math.min(tw, canvas.width - x);
      const h = Math.min(th, canvas.height - y);
      if (w < 40 || h < 40) continue;
      const tile = crop(canvas, x, y, w, h, 2);
      const hit = await decodeCanvas(tile);
      if (hit) {
        return {
          text: hit.text,
          format: hit.format,
          box: {
            x: x + hit.box.x / 2,
            y: y + hit.box.y / 2,
            w: hit.box.w / 2,
            h: hit.box.h / 2,
          },
        };
      }
    }
  }
  return null;
};

/**
 * Cut the code out of the page with a generous quiet zone and render it large.
 * This is the image the gate scanner sees, so it is worth the extra pixels.
 */
export const cropBarcode = (
  page: HTMLCanvasElement,
  det: Detection,
): HTMLCanvasElement => {
  const oneDimensional = /CODE_|EAN|ITF|CODABAR|UPC/.test(det.format);
  // 1D codes report only the two ends of the scan line, so the reported height
  // is meaningless — grow the box vertically instead of proportionally.
  const padX = Math.max(det.box.w * 0.18, 24);
  const padY = oneDimensional
    ? Math.max(det.box.w * 0.16, 40)
    : Math.max(det.box.h * 0.18, 24);

  const x = Math.max(0, det.box.x - padX);
  const y = Math.max(0, det.box.y - padY);
  const w = Math.min(page.width - x, det.box.w + padX * 2);
  const h = Math.min(page.height - y, (oneDimensional ? det.box.w * 0.32 : det.box.h) + padY * 2);

  // Target ~1200px on the long edge: crisp on any phone, still a small file.
  const scale = Math.min(4, Math.max(1, 1200 / Math.max(w, h)));
  return crop(page, x, y, w, h, scale);
};

export const barcodeLabel = (b: Barcode): string =>
  b.format.replace(/_/g, ' ').replace('CODE 128', 'Code 128');
