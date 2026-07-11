---
name: verify
description: Build, serve, and drive this multi-page Vite site (games + invest-watch) in headless Chromium to verify changes end-to-end.
---

# Verifying changes in this repo

Multi-page Vite + React + Tailwind static site. Each sub-app is a directory
with its own `index.html` registered in `vite.config.ts` `build.rollupOptions.input`.

## Build & serve

```bash
npm install
npm run build                       # dist/ — new pages MUST be in vite.config.ts input
npm run preview -- --port 4173 --host 127.0.0.1 &
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4173/<sub-app>/   # expect 200
```

`npm run dev` (port 3000) also works, but preview exercises the production
build including the multi-page rollup inputs — prefer it.

## Drive (headless Chromium)

Playwright is not a repo dependency. In the scratchpad: `npm i playwright-core`,
then launch with the pre-installed browser:

```js
chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] })
```

(`/opt/pw-browsers/chromium` is not the executable — use the versioned dir;
`ls /opt/pw-browsers` if the version changed.)

## Gotchas

- Chinese UI text: `text=` / `label:has-text()` selectors are unreliable with
  the `名称 *` style labels — locate form inputs by their unique `placeholder`
  attributes instead.
- Apps auto-accept `confirm()`/`alert()` flows: register `page.on('dialog', d => d.accept())`.
- State lives in localStorage (`invest-watch-v1`, `orbit-dash-best-v1`, …);
  reload the page to verify persistence, use a fresh browser context for a
  clean slate.
