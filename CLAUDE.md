# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A portfolio of four zero-running-cost browser games built as one static Vite + React 19 + TypeScript + Tailwind CSS 4 site, deployed to GitHub Pages:

- **Chroma Cosmos** (root, `App.tsx`) — procedurally generated universe explorer, the main game
- **Astro Merge** (`astro-merge/`) — 2048-style merge game
- **Orbit Dash** (`orbit-dash/`) — one-button canvas arcade game
- **Star Serpent** (`star-serpent/`) — space snake canvas game

The business goal (documented in Chinese in `docs/被动收入行动指南.md`) is a passive-income game matrix: each game is uploaded separately to itch.io / CrazyGames / Poki, and the games cross-promote each other via footer links.

## Commands

```bash
npm install
npm run dev        # dev server at http://localhost:3000 (host 0.0.0.0)
npm run build      # production build → dist/
npm run preview    # preview the production build
npx tsc --noEmit   # typecheck (no npm script exists for this)
```

There is no test runner or linter configured. Verify changes with `npm run build` and `npx tsc --noEmit`.

## Hard Constraints

- **Zero running cost.** No backend, no API keys, no external API calls. The main game's content generator (`services/proceduralService.ts`) deliberately replaced a Gemini API dependency with local procedural generation — do not reintroduce server or API dependencies.
- **Relative paths everywhere.** `vite.config.ts` sets `base: './'` so the same `dist/` works on GitHub Pages project sites and as a zip upload to itch.io/CrazyGames. Cross-game links are relative anchors (`./astro-merge/`, `../`). Don't use absolute URLs or root-relative paths.
- **Persistence is localStorage only**, with a versioned key per game (e.g. `chroma-cosmos-save-v1`, `astro-merge-best-v1`). Reads validate the parsed shape and are wrapped in try/catch; writes are try/catch'd so the game keeps working when storage is unavailable.

## Architecture

### Multi-page Vite build

Each game is a separate HTML entry registered in `vite.config.ts` under `build.rollupOptions.input`. Adding a new game means:

1. Create `<game-dir>/index.html` (with its own SEO meta tags) and `<game-dir>/main.tsx`
2. Register the entry in `vite.config.ts`
3. Add cross-links to/from the other games' footers (main game's links live in `App.tsx`'s footer)
4. Add the URL to `public/sitemap.xml`
5. Add press-kit assets to `docs/press-kit/` and update `docs/被动收入行动指南.md`

### Main game (Chroma Cosmos)

- `App.tsx` — all game state (React hooks, no state library): player resources, sector map, view mode (`MAP`/`SYSTEM`), ship log, discovery history, auto-save effect
- `services/proceduralService.ts` — pure content generator; maps a node's hex color to a `ColorTheme` (`COLOR_THEMES` keyed by the hex values in `constants.ts`) and assembles names/descriptions/stats from word banks
- `types.ts` / `constants.ts` — shared types and game-balance constants (fuel costs, science rewards)
- `components/` — presentational components (`Starfield`, `Visualizer`, `GalaxyMap`, `Button`)
- Game design invariant: the game must never soft-lock. When the player can't afford travel and can't synthesize fuel, an emergency "solar sails" button appears (`isStranded` in `App.tsx`)

### Mini-games

Each mini-game is self-contained in its directory and imports the shared `index.css`. Patterns to follow:

- Astro Merge separates pure, unit-testable game logic (`astro-merge/game.ts`, takes an injectable `rand`) from the React UI (`main.tsx`)
- The canvas games (Orbit Dash, Star Serpent) keep mutable game state in a `useRef`, with React state mirroring only HUD values (score/phase); the loop runs via `requestAnimationFrame`
- Canvas games accept a `?speed=N` URL param to speed up gameplay for automated testing
- All games support both keyboard and touch/swipe input

### Styling

Tailwind CSS 4 via the `@tailwindcss/vite` plugin — there is no `tailwind.config`; `index.css` starts with `@import "tailwindcss"` plus a few custom keyframe animations shared by all games. Visual language: dark slate/space background (`bg-slate-950`), neon fuchsia/cyan accents, monospace HUD text.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes `dist/` to the `gh-pages` branch (served by GitHub Pages at `https://skyrocktor124.github.io/cosmos-discovery-game/`). No manual deploy steps.

## Repo Conventions

- Path alias `@/*` maps to the repo root (configured in both `tsconfig.json` and `vite.config.ts`)
- `docs/` contains user-facing monetization docs and store-listing assets (`docs/press-kit/`), not developer docs; they are written in Chinese and reference concrete repo state (game count, deploy status) — keep them in sync when adding games
