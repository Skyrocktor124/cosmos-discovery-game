// Reading a ticket's text layer and guessing the fields a traveller cares
// about: what, when, where, and which reference number to quote if it goes
// wrong.
//
// Every guess is fallible, so `guessed` records which fields were inferred and
// the review screen highlights them. The parser's job is to save typing, not to
// be trusted blindly.

import type { TicketKind } from '../types';

export interface Extracted {
  title?: string;
  start?: string;
  venue?: string;
  city?: string;
  code?: string;
  party?: string;
  provider?: string;
  kind?: TicketKind;
  guessed: string[];
}

// ---------------------------------------------------------------- month names

const MONTHS: Record<string, number> = {};
const addMonths = (names: string[]) =>
  names.forEach((n, i) => {
    MONTHS[n] = i + 1;
    if (n.length > 3) MONTHS[n.slice(0, 3)] = i + 1;
  });

addMonths(['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']);
addMonths(['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember']);
addMonths(['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']);
addMonths(['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']);
addMonths(['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']);
addMonths(['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']);
addMonths(['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']);
MONTHS['sept'] = 9;
MONTHS['juill'] = 7;
MONTHS['febbr'] = 2;
MONTHS['sett'] = 9;

const MONTH_WORDS = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');

// ------------------------------------------------------------------- keywords

const DATE_LABELS = /(date|datum|data|fecha|when|visit|valid|válido|valable|gültig|arriv|départ|departure|check-?in|日期|入场|入場|使用日期)/i;

const PROVIDERS: [RegExp, string][] = [
  [/getyourguide/i, 'GetYourGuide'],
  [/tiqets/i, 'Tiqets'],
  [/musement/i, 'Musement'],
  [/\bviator\b/i, 'Viator'],
  [/civitatis/i, 'Civitatis'],
  [/headout/i, 'Headout'],
  [/\bklook\b/i, 'Klook'],
  [/tripadvisor/i, 'Tripadvisor'],
  [/booking\.com/i, 'Booking.com'],
  [/airbnb/i, 'Airbnb'],
  [/ticketmaster/i, 'Ticketmaster'],
  [/\bfever\b/i, 'Fever'],
  [/eventbrite/i, 'Eventbrite'],
  [/trainline/i, 'Trainline'],
  [/\bsncf\b|oui\.sncf|sncf connect/i, 'SNCF'],
  [/trenitalia/i, 'Trenitalia'],
  [/\bitalo\b/i, 'Italo'],
  [/\brenfe\b/i, 'Renfe'],
  [/deutsche bahn|\bdb navigator\b|bahn\.de/i, 'Deutsche Bahn'],
  [/eurostar/i, 'Eurostar'],
  [/\bthalys\b/i, 'Thalys'],
  [/\bflixbus\b/i, 'FlixBus'],
  [/\bomio\b/i, 'Omio'],
  [/\bryanair\b/i, 'Ryanair'],
  [/easyjet/i, 'easyJet'],
  [/lufthansa/i, 'Lufthansa'],
  [/air france/i, 'Air France'],
  [/\bvueling\b/i, 'Vueling'],
];

const KIND_HINTS: [RegExp, TicketKind][] = [
  [/boarding pass|flight|vol n°|flug|volo|check-in opens|gate\b|\bPNR\b/i, 'flight'],
  [/train|treno|zug|tren|coach\b|carriage|voiture|wagon|platform|binario|gleis|bus\b|ferry|metro|travelcard/i, 'transport'],
  [/hotel|hostel|apartment|check-?in|check-?out|nights?\b|b&b|guesthouse/i, 'stay'],
  [/museum|mus[ée]e|museo|museu|gallery|galleria|galerie|palace|palais|palazzo|cathedral|cath[ée]drale|duomo|basilica|castle|ch[âa]teau|castello|monument|exhibition|ausstellung|collection/i, 'museum'],
  [/tour|guided|walking|excursion|cruise|day trip|tasting|workshop|skip-the-line|coupe-file/i, 'tour'],
  [/concert|opera|theatre|theater|teatro|show|match|stadium|stadio|ballet|festival/i, 'show'],
];

// Accents are routinely stripped by PDF text layers, so every accented word
// here also has to match its bare-ASCII spelling.
const VENUE_HINTS = /(museum|mus[ée]e|museo|museu|gallery|galleria|galerie|palace|palais|palazzo|paleis|cathedral|cath[ée]drale|catedral|duomo|basilica|tower|torre|castle|castello|ch[âa]teau|kasteel|schloss|gardens|jardins|giardini|arena|stadium|stadio|theatre|theater|teatro|opera|station|gare|bahnhof|estaci[óo]n|stazione|abbey|abbazia|kunsthal|fondation|fondazione|acropolis|colosseo|colosseum|sagrada|alhambra|louvre|orsay|uffizi|prado|rijksmuseum|vatican|vaticano)/i;

const STREET_WORDS = /\b(rue|avenue|boulevard|via|viale|corso|piazza|piazzale|calle|carrer|plaza|pla[çc]a|stra(?:ß|ss)e|straat|gracht|kade|street|road|lane|square)\b/i;

/** A street address is as good a "where" as a venue name. Timetable rows look
 *  superficially similar — "Gleis 14, Platz 51" — so anything carrying a clock
 *  time is disqualified. */
const looksLikeAddress = (line: string): boolean =>
  !/\d{1,2}:\d{2}/.test(line) && STREET_WORDS.test(line) && /\b\d{1,5}\b/.test(line);

/** Lines every voucher carries, which say nothing about what the ticket is. */
const BOILERPLATE = /(votre billet|your ticket|e-?ticket|online-?ticket|booking confirmation|confirmation de|bestätigung|conferma|confirmación|voucher|print this|présentez|show this|mobile ticket|order summary|thank you)/i;

const CITIES: [RegExp, string][] = [
  [/\bparis\b/i, 'Paris'], [/\blondon\b|londres|londra/i, 'London'],
  [/\brome?\b|roma\b/i, 'Rome'], [/florence|firenze/i, 'Florence'],
  [/venice|venezia|venise/i, 'Venice'], [/milan|milano/i, 'Milan'],
  [/naples|napoli/i, 'Naples'], [/barcelona|barcelone/i, 'Barcelona'],
  [/madrid/i, 'Madrid'], [/seville|sevilla/i, 'Seville'],
  [/granada/i, 'Granada'], [/lisbon|lisboa/i, 'Lisbon'],
  [/porto\b/i, 'Porto'], [/amsterdam/i, 'Amsterdam'],
  [/brussels|bruxelles|brussel/i, 'Brussels'], [/bruges|brugge/i, 'Bruges'],
  [/berlin/i, 'Berlin'], [/munich|münchen/i, 'Munich'],
  [/cologne|köln/i, 'Cologne'], [/hamburg/i, 'Hamburg'],
  [/vienna|wien/i, 'Vienna'], [/salzburg/i, 'Salzburg'],
  [/prague|praha|prag\b/i, 'Prague'], [/budapest/i, 'Budapest'],
  [/kraków|krakow|cracow/i, 'Kraków'], [/warsaw|warszawa/i, 'Warsaw'],
  [/zurich|zürich/i, 'Zurich'], [/geneva|genève/i, 'Geneva'],
  [/interlaken/i, 'Interlaken'], [/lucerne|luzern/i, 'Lucerne'],
  [/copenhagen|københavn/i, 'Copenhagen'], [/stockholm/i, 'Stockholm'],
  [/oslo\b/i, 'Oslo'], [/helsinki/i, 'Helsinki'],
  [/reykjav[íi]k/i, 'Reykjavík'], [/dublin/i, 'Dublin'],
  [/edinburgh/i, 'Edinburgh'], [/athens|athína|atene/i, 'Athens'],
  [/santorini|thira\b/i, 'Santorini'], [/istanbul/i, 'Istanbul'],
  [/dubrovnik/i, 'Dubrovnik'], [/split\b/i, 'Split'],
  [/ljubljana/i, 'Ljubljana'], [/nice\b|nizza/i, 'Nice'],
  [/marseille/i, 'Marseille'], [/lyon\b/i, 'Lyon'],
  [/bordeaux/i, 'Bordeaux'], [/valencia|valència/i, 'Valencia'],
  [/pisa\b/i, 'Pisa'], [/siena/i, 'Siena'],
  [/verona/i, 'Verona'], [/turin|torino/i, 'Turin'],
  [/bologna/i, 'Bologna'], [/rotterdam/i, 'Rotterdam'],
  [/antwerp|antwerpen|anvers/i, 'Antwerp'], [/frankfurt/i, 'Frankfurt'],
];

// ---------------------------------------------------------------------- dates

interface DateHit { iso: string; index: number; }

const pad = (n: number) => String(n).padStart(2, '0');

const clampYear = (y: number): number => (y < 100 ? 2000 + y : y);

const valid = (y: number, m: number, d: number) =>
  m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100;

const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

const findDates = (text: string): DateHit[] => {
  const hits: DateHit[] = [];
  const push = (index: number, y: number, m: number, d: number) => {
    if (valid(y, m, d)) hits.push({ iso: iso(y, m, d), index });
  };

  // 2026-08-14
  for (const m of text.matchAll(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g)) {
    push(m.index!, +m[1], +m[2], +m[3]);
  }
  // 2026年8月14日
  for (const m of text.matchAll(/(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g)) {
    push(m.index!, +m[1], +m[2], +m[3]);
  }
  // 14/08/2026, 14.08.2026, 14-8-26
  for (const m of text.matchAll(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b/g)) {
    const a = +m[1], b = +m[2], y = clampYear(+m[3]);
    // Day-first unless that reading is impossible: Europe writes 14/08, and
    // these tickets are European by construction.
    if (a > 12 && b <= 12) push(m.index!, y, b, a);
    else if (b > 12 && a <= 12) push(m.index!, y, a, b);
    else push(m.index!, y, b, a);
  }
  // 14 August 2026 / 14. August 2026 / 14 de agosto de 2026
  const named = new RegExp(
    String.raw`\b(\d{1,2})\.?\s*(?:de\s+)?(${MONTH_WORDS})\.?\s*(?:de\s+|,\s*)?(20\d{2})?`,
    'gi',
  );
  for (const m of text.matchAll(named)) {
    const month = MONTHS[m[2].toLowerCase()];
    push(m.index!, m[3] ? +m[3] : new Date().getFullYear(), month, +m[1]);
  }
  // August 14, 2026
  const namedFirst = new RegExp(
    String.raw`\b(${MONTH_WORDS})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(20\d{2})?`,
    'gi',
  );
  for (const m of text.matchAll(namedFirst)) {
    const month = MONTHS[m[1].toLowerCase()];
    push(m.index!, m[3] ? +m[3] : new Date().getFullYear(), month, +m[2]);
  }

  return hits.sort((a, b) => a.index - b.index);
};

interface TimeHit { hhmm: string; index: number; }

const findTimes = (text: string): TimeHit[] => {
  const hits: TimeHit[] = [];
  // 14:30 / 14h30 / 2:30 PM. Deliberately not `14.30` — that collides with
  // European date separators far too often.
  for (const m of text.matchAll(/\b(\d{1,2})\s*[:h]\s*(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/gi)) {
    let h = +m[1];
    const min = +m[2];
    const mer = m[3]?.toLowerCase().replace(/\./g, '');
    if (min > 59) continue;
    if (mer === 'pm' && h < 12) h += 12;
    if (mer === 'am' && h === 12) h = 0;
    if (h > 23) continue;
    hits.push({ hhmm: `${pad(h)}:${pad(min)}`, index: m.index! });
  }
  return hits;
};

/** The date nearest a "visit date"-ish label wins; otherwise the first one. */
const pickDate = (text: string, dates: DateHit[]): DateHit | undefined => {
  if (!dates.length) return undefined;
  const labelled = dates.find(d =>
    DATE_LABELS.test(text.slice(Math.max(0, d.index - 60), d.index)),
  );
  return labelled ?? dates[0];
};

const pickTime = (times: TimeHit[], near?: number): string | undefined => {
  if (!times.length) return undefined;
  const usable = times.filter(t => t.hhmm !== '00:00');
  if (!usable.length) return undefined;
  if (near === undefined) return usable[0].hhmm;
  const close = usable
    .map(t => ({ t, d: Math.abs(t.index - near) }))
    .sort((a, b) => a.d - b.d)[0];
  return close.d < 400 ? close.t.hhmm : usable[0].hhmm;
};

// --------------------------------------------------------------------- fields

const CODE_PATTERNS = [
  /(?:booking|reservation|confirmation|order|voucher|ticket|reference|buchungs|auftrags|réservation|prenotazione|reserva)[^\n:]{0,24}[:#]\s*([A-Z0-9][A-Z0-9-]{4,19})/i,
  /\b(?:ref|pnr|conf)[.:# ]\s*([A-Z0-9]{5,10})\b/i,
  /\bGYG[A-Z0-9]{6,}\b/,
];

const findCode = (text: string): string | undefined => {
  for (const re of CODE_PATTERNS) {
    const m = text.match(re);
    if (m) return (m[1] ?? m[0]).trim().toUpperCase();
  }
  return undefined;
};

const findParty = (text: string): string | undefined => {
  const m = text.match(/(\d{1,2})\s*(adults?|adulte?s?|adulti|erwachsene[rn]?|personas?|persons?|people|guests?|travell?ers?|pax)\b/i);
  if (!m) return undefined;
  const extra = text.match(/(\d{1,2})\s*(child(?:ren)?|enfants?|bambini|kinder|niños?)\b/i);
  return extra ? `${m[1]} × ${m[2]}, ${extra[1]} × ${extra[2]}` : `${m[1]} × ${m[2]}`;
};

const NOISE_LINE = /^(voucher|e-?ticket|booking confirmation|confirmation|your booking|order|receipt|invoice|total|price|amount|vat|thank you|www\.|https?:|[\d\s€$£.,-]+)$/i;

const cleanLines = (text: string): string[] =>
  text
    .split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(l => l.length >= 6 && l.length <= 90)
    .filter(l => !NOISE_LINE.test(l))
    .filter(l => /[A-Za-zÀ-ÿ]{4}/.test(l))
    .filter(l => !/@/.test(l));

/** Pick the line that reads most like a product name. */
const findTitle = (text: string, provider?: string): string | undefined => {
  const lines = cleanLines(text.slice(0, 2500));
  const scored = lines.map((line, i) => {
    let score = 0;
    // Earlier lines are usually the headline.
    score += Math.max(0, 12 - i);
    // Product names sit in a comfortable middle length.
    score += line.length >= 14 && line.length <= 70 ? 8 : 0;
    // Title Case or a venue word both suggest a name rather than boilerplate.
    if (/^[A-ZÀ-Þ]/.test(line)) score += 3;
    if (VENUE_HINTS.test(line)) score += 8;
    if (/entr[ée]e?|entrance|admission|billet|biglietto|entrada|eintritt|ingresso|skip-?the-?line|coupe-?file|guided|tour\b|pass\b|cruise|show\b/i.test(line)) score += 5;
    if (provider && line.toLowerCase().includes(provider.toLowerCase())) score -= 10;
    // Generic voucher furniture is never the name of the thing you booked.
    if (BOILERPLATE.test(line)) score -= 14;
    if (looksLikeAddress(line)) score -= 6;
    if (DATE_LABELS.test(line)) score -= 6;
    if (/\d{4,}/.test(line)) score -= 6;
    if (/^(mr|mrs|ms|dear|hello|hi)\b/i.test(line)) score -= 8;
    return { line, score };
  });
  const best = scored.sort((a, b) => b.score - a.score)[0];
  return best && best.score > 6 ? best.line : lines[0];
};

const findVenue = (text: string, title?: string): string | undefined => {
  const labelled = text.match(/(?:venue|location|address|meeting point|treffpunkt|lieu|luogo|lugar|dirección|indirizzo|地址)[^\n:]{0,12}:\s*([^\n]{6,80})/i);
  if (labelled) return labelled[1].replace(/\s+/g, ' ').trim();
  const lines = cleanLines(text.slice(0, 4000)).filter(l => l !== title && !BOILERPLATE.test(l));
  // A named venue reads better than a street address, so look for one first.
  return (
    lines.find(l => VENUE_HINTS.test(l)) ??
    lines.find(looksLikeAddress)
  );
};

const findFrom = <T>(text: string, table: [RegExp, T][]): T | undefined =>
  table.find(([re]) => re.test(text))?.[1];

// ----------------------------------------------------------------------- main

export const extract = (rawText: string, barcodeText?: string): Extracted => {
  const text = rawText.replace(/\r/g, '');
  const guessed: string[] = [];
  const out: Extracted = { guessed };

  if (!text.trim()) {
    // A photo or a scanned PDF: nothing to read but the code itself.
    if (barcodeText && /^https?:\/\//i.test(barcodeText)) {
      try {
        out.provider = new URL(barcodeText).hostname.replace(/^www\./, '');
        guessed.push('provider');
      } catch {
        // Not a URL after all.
      }
    }
    return out;
  }

  const provider = findFrom(text, PROVIDERS);
  if (provider) out.provider = provider;

  const dates = findDates(text);
  const chosen = pickDate(text, dates);
  if (chosen) {
    const time = pickTime(findTimes(text), chosen.index);
    out.start = time ? `${chosen.iso}T${time}` : chosen.iso;
    guessed.push('start');
  }

  const title = findTitle(text, provider);
  if (title) {
    out.title = title;
    guessed.push('title');
  }

  const venue = findVenue(text, title);
  if (venue) {
    out.venue = venue;
    guessed.push('venue');
  }

  const city = findFrom(text, CITIES);
  if (city) {
    out.city = city;
    guessed.push('city');
  }

  const code = findCode(text);
  if (code) out.code = code;

  const party = findParty(text);
  if (party) {
    out.party = party;
    guessed.push('party');
  }

  const kind = findFrom(text, KIND_HINTS);
  if (kind) {
    out.kind = kind;
    guessed.push('kind');
  }

  return out;
};
