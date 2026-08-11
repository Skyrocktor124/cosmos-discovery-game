# Chroma Cosmos 🚀

An infinite, procedurally generated universe explorer. Every planet, star,
nebula and anomaly is unique — generated instantly in the browser with zero
server or API cost. Free to play, no download, no sign-up.

**Play it** (after enabling GitHub Pages): `https://skyrocktor124.github.io/cosmos-discovery-game/`

## Features

- 🌌 Infinite procedurally generated sectors, discoveries themed by color
- 💾 Auto-save — progress persists across browser sessions
- ⛽ Fuel/science resource loop with a soft-lock escape hatch (solar sails)
- 📱 Responsive layout, works on desktop and mobile
- 💸 **Zero running cost** — no API keys, no backend, pure static files

## Apps in this repo

Each folder is an independent, zero-cost static entry point built by the same
Vite config:

| Path | What it is |
| --- | --- |
| `/` | **Chroma Cosmos** — infinite procedural universe explorer |
| `/astro-merge/` | **Astro Merge** — merge puzzle |
| `/orbit-dash/` | **Orbit Dash** — one-touch orbit runner |
| `/star-serpent/` | **Star Serpent** — space snake arcade |
| `/mood-radio/` | **心情电台 Mood Radio** — type a mood, get a healing station |

### 心情电台 Mood Radio 🎧

Type how you feel (Chinese or English) and it tunes a station for you:

- **A generated piece per mood, playing in-page** — chord progression, bass,
  an improvised melody, arpeggio and a soft pulse, arranged over four sections
  (起 / 承 / 转 / 合) that cycle with a fresh melody each time. All of it is
  synthesised from oscillators and noise with the Web Audio API: no audio
  files, no streaming, no bandwidth cost, and nothing to license.
- **Stations differ on four axes, not just major vs minor** — instrument
  (felt piano, bell, kalimba, reed, glass, breath, strings), register, rhythmic
  grid, and the direction the melodic line tends to move. `improvise()` in
  `music.ts` is exported pure so that last one can be measured directly:
  falling stations run about −0.6 direction bias, the joyful one about +0.6.
- **Breathing ring** paced to the station's own swell, doubling as play/pause,
  plus a live output meter so a muted device is obvious.
- **A 6-track playlist** of real healing songs per mood, linking out to search
  on YouTube / Spotify / 网易云 — those are commercial recordings, so the page
  links to them rather than serving them.
- 9 moods (焦虑 / 难过 / 疲惫 / 孤独 / 愤怒 / 平静 / 开心 / 思念 / 睡不着), matched by an
  in-browser keyword dictionary — no API key, works offline after first load.
- `?mood=<id>` deep links, so a shared station opens straight on that frequency.

## 中文说明

这是一个零运行成本的网页宇宙探索游戏,已配置好自动部署和多平台上架条件。
**变现步骤请看:[docs/被动收入行动指南.md](docs/被动收入行动指南.md)**

## Development

Prerequisites: Node.js 18+

```bash
npm install
npm run dev      # local dev server at http://localhost:3000
npm run build    # production build → dist/
npm run preview  # preview the production build
```

## Deployment

Pushing to `main` automatically builds and deploys to GitHub Pages via
`.github/workflows/deploy.yml`. One-time setup: repository **Settings →
Pages → Source: GitHub Actions**.

The `dist/` folder is fully static and relative-pathed, so it can also be
zipped and uploaded as-is to itch.io, CrazyGames, or any static host.
