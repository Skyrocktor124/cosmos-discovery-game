# Wanderpass — an offline ticket wallet for a European trip

Book a fortnight in Europe and you end up with fifteen bookings from a dozen
sellers: the Uffizi direct, the Louvre through GetYourGuide, a Trenitalia leg,
a Tiqets voucher for the Sagrada Família. Each one arrives as a PDF attachment
buried in a mail thread. At the gate you are scrolling your inbox on hotel wifi
looking for the right QR code, and the timed entry is in four minutes.

Wanderpass is one screen with every one of those tickets on it, sorted by when
you actually need them, working with no signal.

## What it does

- **Import a PDF or a screenshot.** The page is rendered, the barcode is found
  and cropped out, and the text layer is read for the date, time, venue, city,
  party size and booking reference. Everything it guesses is flagged for you to
  check before saving.
- **Reads the formats European venues actually use** — QR, Aztec (rail),
  PDF417 (boarding passes), Data Matrix, Code 128.
- **Shows the code big.** The gate screen is white, the cropped code fills the
  width, and the screen is kept awake while it is open.
- **Works offline.** A service worker caches the app; the tickets themselves are
  in IndexedDB. No signal needed, which is the point — museum basements and
  metro platforms are where you need this most.
- **Nothing leaves the device.** No account, no server, no analytics, no network
  request of any kind once the page has loaded. Backup is a file you export.
- **English and 中文**, following the browser locale by default.

## What it deliberately does not do

- **Read your email.** Every competitor's headline feature is inbox scanning,
  and it is why people do not install them. Forwarding or downloading an
  attachment takes five seconds; handing a stranger your mailbox does not.
- **Sell you tickets.** Sellers' own apps only ever show their own bookings,
  which is the reason this problem exists.

## How it is built

Pure static files, no backend, no API keys — same as everything else in this
repository.

| Piece | File |
| --- | --- |
| Storage (tickets + image blobs) | `db.ts` |
| PDF/image → page bitmaps + text | `lib/render.ts` |
| Barcode detection and cropping | `lib/barcode.ts` |
| Field extraction heuristics | `lib/extract.ts` |
| Import orchestration | `lib/importer.ts` |
| Backup export/restore | `lib/backup.ts` |
| Offline cache | `../public/wanderpass-sw.js` |

`pdfjs-dist` and `@zxing/*` are loaded lazily, so opening the wallet to show a
code does not pull in the import machinery.

Two details worth knowing if you touch this code:

- Times are stored as bare local strings (`2026-09-14T10:30`) and never
  converted. A 10:30 slot in Florence is 10:30 in Florence regardless of what
  timezone the phone is in.
- The **legacy** pdf.js build is used on purpose. The modern one needs browser
  features (`Promise.withResolvers`, `Map.getOrInsertComputed`) that a
  two-year-old phone does not have.

## Running it

From the repository root:

```bash
npm install
npm run dev      # http://localhost:3000/trip-wallet/
npm run build
```

Note that the service worker is only registered in production builds.
