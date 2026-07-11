# Project context for Claude

This repo is a **matrix of zero-cost browser games** built for passive income.
The owner is a solo, non-technical developer: deliver finished work, not
coding instructions. Explain things to the owner in **Simplified Chinese**;
keep in-game text and store copy in English (international platforms), with
Chinese translations for domestic ones.

**For any game-building, packaging, platform-listing, or monetization task,
use the `game-factory` agent (`.claude/agents/game-factory.md`) — it carries
the full pipeline and definition-of-done.**

## The matrix (4 games, one repo, one deploy)

| Game | Path | Type |
|------|------|------|
| Chroma Cosmos | `/` (root: `App.tsx`, `components/`, `services/`) | procedural space exploration |
| Astro Merge | `astro-merge/` | merge/2048 |
| Orbit Dash | `orbit-dash/` | one-button arcade |
| Star Serpent | `star-serpent/` | space snake |

Stack: React 19 + Vite + Tailwind, TypeScript. Each non-root game is a
self-contained folder with `index.html` + `main.tsx`, registered as an extra
input in `vite.config.ts`. Games cross-link to each other for traffic.

## Hard rules

- **Zero running cost**: no backend, no API keys, no paid services. All
  content is procedurally generated in the browser.
- `base: './'` in Vite must stay — `dist/` must work on GitHub Pages, itch.io
  zips, and any static host unmodified.
- Every game: localStorage auto-save, no soft-locks, mobile + desktop.
- Never promise the owner income; be honest that traffic drives revenue.

## Commands

```bash
npm install
npm run dev      # dev server, port 3000
npm run build    # → dist/ (all games)
npm run preview
```

## Deploy

Push/merge to `main` → `.github/workflows/deploy.yml` builds and publishes
`dist/` to the `gh-pages` branch → live at
`https://skyrocktor124.github.io/cosmos-discovery-game/` (subfolder per game).
Never deploy manually.

## Key docs

- `docs/被动收入行动指南.md` — the owner's monetization roadmap and the list
  of what only the owner can do (accounts, platform forms). Update its game
  list when adding a game.
- `docs/press-kit/` — per-game 630×500 cover + 1280×720 screenshot(s) and
  `上架文案与表单答案.md` (copy-paste store listing answers). Every new game
  must add its entry here.
- `public/sitemap.xml` — add every new game's URL.
