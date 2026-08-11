/**
 * 逐帧渲染 castle-growth/index.html 并编码为视频。
 *
 *   node render.mjs                       → out/castle-growth.mp4 (1600x900)
 *   node render.mjs --portrait            → 追加导出 1080x1920 竖版
 *   node render.mjs --frames 0.5,7,13.5   → 只抽这几个时间点存 PNG（调试用）
 *   node render.mjs --scale 1.35          → 超采样后缩回，边缘更干净
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// playwright 可能装在本地，也可能是全局安装
const require = createRequire(import.meta.url);
function loadPlaywright() {
  try { return require('playwright'); } catch {}
  try {
    const root = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    return require(path.join(root, 'playwright'));
  } catch {}
  throw new Error('未找到 playwright，请先 `npm i -D playwright`');
}
const { chromium } = loadPlaywright();

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT  = path.join(HERE, 'out');
const TMP  = path.join(OUT, 'frames');

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i < 0 ? d : (argv[i + 1] ?? true); };
const PORTRAIT = argv.includes('--portrait');
const PROBE    = flag('frames', null);
const SCALE    = Number(flag('scale', 1));

// 带 H.264 的 ffmpeg（imageio-ffmpeg 提供）；退回 PATH 上的 ffmpeg
function ffmpegPath() {
  const cands = [
    process.env.FFMPEG,
    '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2',
  ].filter(Boolean);
  for (const c of cands) if (fs.existsSync(c)) return c;
  return 'ffmpeg';
}

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
const page = await browser.newPage({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: SCALE,
});
await page.goto('file://' + path.join(HERE, 'index.html') + '?export=1');
await page.waitForFunction(() => !!window.__meta);
const meta = await page.evaluate(() => window.__meta);
console.log('meta', meta, 'scale', SCALE);
fs.writeFileSync(path.join(OUT, 'timeline.json'),
  JSON.stringify(await page.evaluate(() => window.__timeline())));

async function grab(t, file) {
  await page.evaluate((tt) => window.__renderFrame(tt), t);
  const b64 = await page.evaluate(() =>
    document.getElementById('c').toDataURL('image/jpeg', 0.96).slice(23));
  fs.writeFileSync(file, Buffer.from(b64, 'base64'));
}

if (PROBE) {
  for (const s of String(PROBE).split(',')) {
    const t = Number(s);
    const f = path.join(OUT, `probe-${t.toFixed(2)}.jpg`);
    await grab(t, f);
    console.log('probe', f);
  }
  await browser.close();
  process.exit(0);
}

const N = meta.frames;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  await grab(i / meta.FPS, path.join(TMP, String(i).padStart(4, '0') + '.jpg'));
  if (i % 30 === 0) process.stdout.write(`\r  frame ${i}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
console.log(`\r  frames done ${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s          `);
await browser.close();

const FF = ffmpegPath();
const mp4 = path.join(OUT, 'castle-growth.mp4');
execFileSync(FF, [
  '-y', '-framerate', String(meta.FPS),
  '-i', path.join(TMP, '%04d.jpg'),
  '-vf', `scale=${meta.W}:${meta.H}:flags=lanczos,format=yuv420p`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17',
  '-movflags', '+faststart', mp4,
], { stdio: ['ignore', 'ignore', 'inherit'] });
console.log('→', mp4, (fs.statSync(mp4).size / 1e6).toFixed(1) + ' MB');

// 配乐：audio.py 依据落位密度合成，再混入视频
if (!argv.includes('--silent')) {
  try {
    execFileSync('python3', [path.join(HERE, 'audio.py')], { stdio: 'inherit' });
    const wav = path.join(OUT, 'track.wav');
    const withA = path.join(OUT, 'castle-growth-audio.mp4');
    execFileSync(FF, ['-y', '-i', mp4, '-i', wav, '-map', '0:v', '-map', '1:a',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest',
      '-movflags', '+faststart', withA], { stdio: ['ignore', 'ignore', 'ignore'] });
    fs.renameSync(withA, mp4);
    fs.unlinkSync(wav);
    console.log('→ 已混入配乐');
  } catch (e) {
    console.warn('配乐生成失败，输出无声版本：', e.message);
  }
}

if (PORTRAIT) {
  const vert = path.join(OUT, 'castle-growth-portrait.mp4');
  execFileSync(FF, [
    '-y', '-i', mp4,
    '-vf', 'scale=1080:-2:flags=lanczos,pad=1080:1920:0:(1920-ih)/2:color=0x08080a,setsar=1,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
    '-movflags', '+faststart', vert,
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
  console.log('→', vert, (fs.statSync(vert).size / 1e6).toFixed(1) + ' MB');
}

fs.rmSync(TMP, { recursive: true, force: true });
