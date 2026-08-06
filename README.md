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

这是一个零运行成本的网页宇宙探索游戏,已配置好自动部署和多平台上架条件。
**变现步骤请看:[docs/被动收入行动指南.md](docs/被动收入行动指南.md)**

## 提示词手册(附赠)

`booklet/index.html` 是一个零依赖的单文件交互电子小册子(搜索 / 分类 / 一键复制 /
离线导出),可以直接发给粉丝,也会随构建发布到 `/booklet/`。
换成你自己的提示词只需改一个数组,见 [booklet/README.md](booklet/README.md)。

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
