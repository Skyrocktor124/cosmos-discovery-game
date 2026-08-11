#!/usr/bin/env python3
"""
为 castle-growth 生成配乐轨。

读取 out/timeline.json（由 render.mjs 从页面导出的方块落位密度），
按真实的装配节奏合成：低频持续音 + 砖石落位的木石轻响 + 阶段闷响 + 落成钟声。

    python3 audio.py            → out/track.wav
"""
import json
import os
import wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
SR = 44100

tl = json.load(open(os.path.join(OUT, 'timeline.json')))
DUR, BIN, hist = tl['DUR'], tl['BIN'], tl['hist']
N = int(SR * DUR)
t = np.arange(N) / SR
buf = np.zeros((2, N))
rng = np.random.default_rng(97)


def add(sig, at, gain=1.0, pan=0.0):
    """把片段叠加到指定时间点，pan ∈ [-1,1]。"""
    i = int(at * SR)
    if i >= N:
        return
    seg = sig[:N - i]
    l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    buf[0, i:i + len(seg)] += seg * gain * l
    buf[1, i:i + len(seg)] += seg * gain * r


def env_exp(n, tau):
    return np.exp(-np.arange(n) / (SR * tau))


def smoothstep(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


# ── 1. 低频持续音（石头的“重量”） ──────────────────────────────
drift = 1 + 0.0016 * np.sin(2 * np.pi * 0.07 * t)
drone = (0.50 * np.sin(2 * np.pi * 55.0 * t * drift)
         + 0.30 * np.sin(2 * np.pi * 82.4 * t + 0.7)
         + 0.17 * np.sin(2 * np.pi * 110.0 * t + 1.3)
         + 0.09 * np.sin(2 * np.pi * 164.8 * t + 2.1))
swell = smoothstep((t - 0.4) / 2.6) * (0.55 + 0.45 * smoothstep((t - 5) / 7))
swell *= 1 - smoothstep((t - (DUR - 1.6)) / 1.6) * 0.85
buf[0] += drone * swell * 0.085
buf[1] += np.roll(drone, 311) * swell * 0.085          # 轻微展宽

# ── 2. 空气底噪 ───────────────────────────────────────────────
air = rng.standard_normal(N)
for _ in range(4):                                      # 简易低通
    air = np.convolve(air, np.ones(48) / 48, mode='same')
air /= np.max(np.abs(air)) + 1e-9
buf += air * 0.026 * smoothstep((t - 0.2) / 1.5) * (1 - smoothstep((t - 13.2) / 1.4))


# ── 3. 砖石落位的轻响 ─────────────────────────────────────────
def clack(freq, tau=0.030, noise_amt=0.55):
    n = int(SR * min(0.35, tau * 7))
    tt = np.arange(n) / SR
    body = np.sin(2 * np.pi * freq * tt) * np.exp(-tt / tau)
    body += 0.4 * np.sin(2 * np.pi * freq * 2.02 * tt) * np.exp(-tt / (tau * 0.45))
    nz = rng.standard_normal(n) * np.exp(-tt / 0.008)
    nz = np.convolve(nz, np.ones(6) / 6, mode='same')
    return (1 - noise_amt) * body + noise_amt * nz


hits = 0
for i, c in enumerate(hist):
    if c <= 0:
        continue
    p = min(0.62, c / 68.0)
    k = int(p) + (1 if rng.random() < (p % 1.0) else 0)
    for _ in range(k):
        at = (i + rng.random()) * BIN
        hi = at > 8.0                                   # 越往上砌，声音越清脆
        f = rng.uniform(520, 1500) if hi else rng.uniform(260, 780)
        g = rng.uniform(0.030, 0.078) * (0.75 + 0.25 * rng.random())
        add(clack(f, tau=rng.uniform(0.018, 0.042)), at, g, rng.uniform(-0.72, 0.72))
        hits += 1

# ── 4. 阶段闷响 ───────────────────────────────────────────────
for ph in tl['phases'][:-1]:
    n = int(SR * 0.9)
    tt = np.arange(n) / SR
    f = 92 * np.exp(-tt / 0.30) + 42
    thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.24)
    rise = rng.standard_normal(n) * smoothstep(tt / 0.30) * np.exp(-tt / 0.10)
    rise = np.convolve(rise, np.ones(90) / 90, mode='same')
    add(thump * 0.16 + rise * 0.09, max(0.0, ph['t0'] - 0.06), 1.0, 0.0)

# ── 5. 落成钟声 ───────────────────────────────────────────────
n = int(SR * 4.2)
tt = np.arange(n) / SR
bell = np.zeros(n)
for f, a, tau in ((587.3, 0.55, 3.0), (1174.7, 0.42, 1.9),
                  (1760.0, 0.22, 1.1), (2637.0, 0.11, 0.7), (146.8, 0.30, 2.6)):
    bell += a * np.sin(2 * np.pi * f * tt + rng.random()) * np.exp(-tt / tau)
bell *= 1 - np.exp(-tt / 0.004)
add(bell, 12.98, 0.115, 0.0)
add(bell, 13.20, 0.045, 0.35)                            # 一次淡回声

# ── 6. 总线 ───────────────────────────────────────────────────
buf = np.tanh(buf * 1.15) / 1.15
fi, fo = int(SR * 0.12), int(SR * 0.7)
buf[:, :fi] *= np.linspace(0, 1, fi)
buf[:, -fo:] *= np.linspace(1, 0, fo)
peak = np.max(np.abs(buf))
buf *= 0.89 / (peak + 1e-9)

path = os.path.join(OUT, 'track.wav')
with wave.open(path, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((buf.T * 32767).astype('<i2').tobytes())
print(f'→ {path}  {DUR:.2f}s  {hits} hits  peak {peak:.2f}')
