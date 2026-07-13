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

## 中文说明

这是一个零运行成本的网页产品矩阵(4 个小游戏 + 1 个工具站),已配置好自动部署和多平台上架条件。
**变现步骤请看:[docs/被动收入行动指南.md](docs/被动收入行动指南.md)**

- 🌌 Chroma Cosmos(宇宙探索)— `/`
- 🪐 Astro Merge(合成 2048)— `/astro-merge/`
- 🛰️ Orbit Dash(单键街机)— `/orbit-dash/`
- 🐍 Star Serpent(太空贪吃蛇)— `/star-serpent/`
- 🦋 女性AI成长加速器(21 天成长计划 + AI 提示词库工具站)— `/her-ai/`

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
