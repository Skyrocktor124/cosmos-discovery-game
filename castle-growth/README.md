# 城堡生長 · Castle Growth

一段「建筑生长」动画：镜头固定不动，砖、石、木、瓦从散落状态飞向各自的结构位置，
由下至上完成装配，最终长成一座中世纪城堡。参照的是把一栋建筑「一次性长出来」的
构造研究短片形式，外面套一层编辑排版（标题 / 阶段标签 / 进度条 / 比例小人）。

整帧画面——包括所有文字排版——都绘制在同一张 canvas 上，所以逐帧导出即得视频。

```
castle-growth/
├── index.html     动画本体（单文件，直接用浏览器打开就能看）
├── render.mjs     Playwright 逐帧截图 → ffmpeg 编码
├── audio.py       依据方块落位密度合成音轨
└── out/           成品视频
```

## 播放

直接打开 `index.html`：

- `空格` 播放 / 暂停（点击画面同样有效）
- `R` 换一颗随机种子重新搭建
- `← →` 拖动时间轴

## 导出视频

```bash
npm i -D playwright && npx playwright install chromium   # 首次
pip install numpy imageio-ffmpeg                          # 音轨 + 带 H.264 的 ffmpeg

node render.mjs                 # → out/castle-growth.mp4        1600×900
node render.mjs --portrait      # 追加 out/castle-growth-portrait.mp4  1080×1920
node render.mjs --silent        # 不合成音轨
node render.mjs --scale 1.5     # 超采样后缩回，边缘更干净（慢一些）
node render.mjs --frames 3,8,13 # 只抽这几秒存图，调参时用
```

`render.mjs` 会优先使用 `imageio-ffmpeg` 自带的 ffmpeg（Playwright 内置的那个
只有 VP8，编不了 mp4），也可以用 `FFMPEG=/path/to/ffmpeg` 指定。

## 结构

**模型**（`buildModel`）用整数体素堆出城堡：岩基 → 城墙与雉堞 → 城门楼与拱券 →
四隅角楼 → 主堡与尖顶 → 门扉、旌旗、院内小树。全部被 5 面邻居包围的方块会被剔除，
约 2 万个体素压到 9 千个左右。

**时序**：每个方块按所属阶段 + 自身高度算出落位时刻 `t0`，因此天然形成由下至上的
装配波。起飞点是终点沿径向外推 + 抬高的一个随机位置，用 `easeOutBack` 收尾，
落位时有一点回弹。脚手架是临时方块，跟着主堡一起长起来，第 12.15 秒起自上而下拆除。

**音轨**：`render.mjs` 把每 0.05 秒的落位数量导出成 `timeline.json`，`audio.py` 据此
撒下木石轻响的密度——所以听到的节奏和看到的节奏是同一条曲线。另有低频持续音、
每个阶段的闷响、以及落成时的一记钟声。

## 改动指引

| 想改什么 | 改哪里 |
| --- | --- |
| 总时长、帧率、画幅 | `index.html` 顶部的 `W / H / FPS / DUR` |
| 各阶段起止与标签 | `PHASES` 表 |
| 城堡形状 | `buildModel` 里的 1–7 节（`box` / `cyl` / `cone` / `spire` / `merlons`） |
| 配色 | `buildModel` 中的 `stone / slate / tile / wood …` |
| 飞入手感 | `LEAD`（飞行时长）与 `drawBuilding` 里的缓动 |
| 排版文字 | `drawChrome` |
| 取景大小 | `fit()` 里的 `targetH / targetW` |

换一座建筑，只要重写 `buildModel` 的模型部分，时序、排版、导出都不用动。
