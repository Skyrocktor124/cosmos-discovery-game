#!/usr/bin/env bash
# 重新生成产品 PDF、内页预览图和笔记首图。
# 依赖：chromium（或 chrome）、npm（首次运行时下载字体）。
set -euo pipefail
cd "$(dirname "$0")"

CHROME="${CHROME:-$(command -v chromium || command -v chromium-browser || command -v google-chrome || echo /opt/pw-browsers/chromium)}"
FLAGS="--headless --no-sandbox --disable-gpu --virtual-time-budget=10000 --hide-scrollbars"

# 1) 字体（思源黑体/宋体），只需下载一次
if [ ! -d fonts/noto-sans-sc ]; then
  echo "==> 下载字体（首次运行，约160MB）"
  mkdir -p fonts && cd fonts
  npm pack @fontsource/noto-sans-sc @fontsource/noto-serif-sc
  for f in fontsource-noto-sans-sc-*.tgz; do tar xzf "$f" && mv package noto-sans-sc; done
  for f in fontsource-noto-serif-sc-*.tgz; do tar xzf "$f" && mv package noto-serif-sc; done
  rm -f *.tgz && cd ..
fi

# 2) 产品 PDF
echo "==> 生成 PDF"
mkdir -p ../deliverable
$CHROME $FLAGS --no-pdf-header-footer \
  --print-to-pdf="../deliverable/自律人生手账套装V1.pdf" "file://$PWD/planner.html"

# 3) 内页预览图（794x1123 = A4 @96dpi）
echo "==> 生成内页预览图"
mkdir -p ../previews/pages
for p in $(seq 1 16); do
  $CHROME $FLAGS --screenshot="../previews/pages/page-$(printf %02d "$p").png" \
    --window-size=794,1123 "file://$PWD/planner.html?page=$p"
done

# 4) 笔记首图（1242x1656 = 小红书 3:4）
echo "==> 生成笔记首图"
for c in 1 2 3; do
  $CHROME $FLAGS --screenshot="../previews/note-cover-$c.png" \
    --window-size=1242,1656 "file://$PWD/covers.html?c=$c"
done

echo "==> 完成：deliverable/ 与 previews/ 已更新"
