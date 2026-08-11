// Wanderpass — data model.
//
// Everything here lives in the browser (IndexedDB). There is no server, no
// account and no network call anywhere in this app, which is the whole point:
// a ticket wallet should not require handing your inbox to a startup.

export type TicketKind =
  | 'museum'
  | 'tour'
  | 'transport'
  | 'flight'
  | 'stay'
  | 'show'
  | 'other';

export const TICKET_KINDS: TicketKind[] = [
  'museum', 'tour', 'transport', 'flight', 'stay', 'show', 'other',
];

export const KIND_EMOJI: Record<TicketKind, string> = {
  museum: '🏛️',
  tour: '🎒',
  transport: '🚆',
  flight: '✈️',
  stay: '🏨',
  show: '🎭',
  other: '🎫',
};

/** A decoded 1D/2D code found on a ticket page. */
export interface Barcode {
  /** Raw payload, e.g. the URL or reference the venue scanner reads. */
  text: string;
  /** ZXing format name: QR_CODE, AZTEC, PDF_417, CODE_128… */
  format: string;
  /** Asset id of the tightly cropped, upscaled code image (what we show at the gate). */
  assetId?: string;
  /** Index of the source page in `pages`. */
  page: number;
}

export interface Ticket {
  id: string;
  title: string;
  kind: TicketKind;
  /** Local wall-clock time as `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`.
   *  Deliberately timezone-free: a 10:30 slot at the Louvre is 10:30 in Paris
   *  no matter which timezone your phone thinks it is in. */
  start?: string;
  venue?: string;
  city?: string;
  /** Booking reference / confirmation code. */
  code?: string;
  party?: string;
  notes?: string;
  provider?: string;
  barcodes: Barcode[];
  /** Asset ids of the full ticket pages, in order. */
  pages: string[];
  sourceName?: string;
  createdAt: number;
  usedAt?: number | null;
}

/** A stored image blob (rendered PDF page, uploaded photo, or barcode crop). */
export interface Asset {
  id: string;
  blob: Blob;
  width: number;
  height: number;
}

/** What the importer hands to the review screen before the user confirms. */
export interface TicketDraft extends Omit<Ticket, 'id' | 'createdAt' | 'usedAt'> {
  /** Fields the parser guessed rather than read verbatim — highlighted in the UI. */
  guessed: string[];
}
