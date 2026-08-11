// Turning whatever the user hands us — a PDF voucher, a screenshot, a photo of
// a paper ticket — into (a) page bitmaps we can display and (b) plain text we
// can mine for the date, venue and booking code.
//
// pdf.js is loaded lazily so the app shell stays small: most sessions are
// "open wallet, show code", not "import".

export interface RenderedDoc {
  pages: HTMLCanvasElement[];
  /** Concatenated text layer, empty for scans and photos. */
  text: string;
}

/** Long edge of a rendered page. High enough that a 2cm QR stays scannable. */
const PAGE_LONG_EDGE = 1800;
const MAX_PAGES = 6;

const canvasFor = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};

const renderPdf = async (file: File): Promise<RenderedDoc> => {
  // The legacy build, not the modern one: it ships the polyfills pdf.js 6 needs
  // (Promise.withResolvers, Map.getOrInsertComputed…) so the app still imports
  // tickets on the two-year-old phone someone is actually travelling with.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerUrl = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  // These PDFs arrive by email from strangers, so nothing beyond rendering is
  // enabled: no XFA forms, no outbound fetches, no scripting.
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    disableAutoFetch: true,
    enableXfa: false,
  });
  const doc = await loadingTask.promise;

  const pages: HTMLCanvasElement[] = [];
  const chunks: string[] = [];
  const count = Math.min(doc.numPages, MAX_PAGES);

  for (let i = 1; i <= count; i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = PAGE_LONG_EDGE / Math.max(base.width, base.height);
    const viewport = page.getViewport({ scale });
    const canvas = canvasFor(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d')!;
    // Vouchers are printed on white; PDFs with no background would otherwise
    // render onto transparent black and break barcode contrast.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    pages.push(canvas);

    try {
      const content = await page.getTextContent();
      chunks.push(
        content.items
          .map(it => ('str' in it ? it.str + (it.hasEOL ? '\n' : ' ') : ''))
          .join(''),
      );
    } catch {
      // Scanned PDF with no text layer — the barcode pass still works.
    }
    page.cleanup();
  }
  await loadingTask.destroy();

  return { pages, text: chunks.join('\n') };
};

const renderImage = async (file: File): Promise<RenderedDoc> => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PAGE_LONG_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = canvasFor(bitmap.width * scale, bitmap.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return { pages: [canvas], text: '' };
};

export const renderFile = async (file: File): Promise<RenderedDoc> => {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  return isPdf ? renderPdf(file) : renderImage(file);
};

/** Canvas → Blob, JPEG for photos of paper, PNG when the page is mostly flat
 *  colour (a generated voucher) so the barcode edges stay razor sharp. */
export const canvasToBlob = (canvas: HTMLCanvasElement, lossless: boolean): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('canvas encode failed'))),
      lossless ? 'image/png' : 'image/jpeg',
      lossless ? undefined : 0.88,
    );
  });
