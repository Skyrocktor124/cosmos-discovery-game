import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';

const BEST_KEY = 'nebula-breaker-best-v1';

type Phase = 'ready' | 'playing' | 'over';
type DropType = 'wide' | 'life';

interface Brick { c: number; r: number; hp: number; }
interface Drop { x: number; y: number; type: DropType; }

const BRICK_COLS = 10;
const MAX_LIVES = 5;
const WIDE_MS = 12000;

// Time-scale for automated testing (?speed=3 → 3x faster)
const SPEED = Math.max(1, Math.min(10, Number(new URLSearchParams(location.search).get('speed')) || 1));

const loadBest = (): number => {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
};

const hpFor = (r: number, level: number): number => {
  if (level >= 3 && r < 2) return 3;
  if (level >= 2 && r < 3) return 2;
  return r < 2 ? 2 : 1;
};

const buildBricks = (level: number): Brick[] => {
  const rows = Math.min(4 + level, 9);
  const bricks: Brick[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      if ((r + c + level) % 7 === 0) continue; // gaps for variety
      bricks.push({ c, r, hp: hpFor(r, level) });
    }
  }
  return bricks;
};

const HP_COLORS: Record<number, string> = { 1: '#22d3ee', 2: '#d946ef', 3: '#fbbf24' };

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(loadBest);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const phaseRef = useRef<Phase>('ready');
  phaseRef.current = phase;

  const game = useRef({
    level: 1,
    score: 0,
    lives: 3,
    bricks: [] as Brick[],
    paddleX: 0.5,        // center, in field fraction [0,1]
    targetX: 0.5,
    keyDir: 0,           // -1 / 0 / 1 from keyboard
    ball: { x: 0, y: 0, vx: 0, vy: 0, stuck: true },
    drops: [] as Drop[],
    wideUntil: 0,
    flash: '',           // transient banner text
    flashUntil: 0,
  });

  const setupLevel = (level: number) => {
    const g = game.current;
    g.level = level;
    g.bricks = buildBricks(level);
    g.drops = [];
    g.ball.stuck = true;
    g.flash = `LEVEL ${level}`;
    g.flashUntil = performance.now() + 1400;
    setLevel(level);
  };

  const reset = () => {
    const g = game.current;
    g.score = 0;
    g.lives = 3;
    g.paddleX = 0.5;
    g.targetX = 0.5;
    g.wideUntil = 0;
    setScore(0);
    setLives(3);
    setupLevel(1);
  };

  const start = () => { reset(); setPhase('playing'); };

  // Field geometry, shared between input handlers and the render loop
  const fieldRef = useRef({ fw: 0, fh: 0, ox: 0, oy: 0 });

  // Input: pointer to aim the paddle, tap/space to launch
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const g = game.current;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); g.keyDir = -1; return; }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); g.keyDir = 1; return; }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (phaseRef.current !== 'playing') start();
        else g.ball.stuck = false;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const g = game.current;
      if (['ArrowLeft', 'a', 'A'].includes(e.key) && g.keyDir === -1) g.keyDir = 0;
      if (['ArrowRight', 'd', 'D'].includes(e.key) && g.keyDir === 1) g.keyDir = 0;
    };
    const onMove = (e: PointerEvent) => {
      const g = game.current;
      const field = fieldRef.current;
      if (field.fw > 0) g.targetX = Math.max(0, Math.min(1, (e.clientX - field.ox) / field.fw));
    };
    const onDown = (e: PointerEvent) => {
      onMove(e);
      if (phaseRef.current !== 'playing') start();
      else game.current.ball.stuck = false;
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const f = fieldRef.current;
      f.fw = Math.min(window.innerWidth - 16, 560);
      f.fh = window.innerHeight - 96;
      f.ox = (window.innerWidth - f.fw) / 2;
      f.oy = 88;
    };
    resize();
    window.addEventListener('resize', resize);

    const gameOver = () => {
      setPhase('over');
      const g = game.current;
      setBest(prev => {
        const nb = Math.max(prev, g.score);
        try { localStorage.setItem(BEST_KEY, String(nb)); } catch { /* ignore */ }
        return nb;
      });
    };

    const geometry = () => {
      const f = fieldRef.current;
      const brickW = f.fw / BRICK_COLS;
      const brickH = Math.max(16, Math.min(24, f.fh * 0.032));
      const paddleBase = Math.max(70, Math.min(110, f.fw * 0.18));
      const paddleW = performance.now() < game.current.wideUntil ? paddleBase * 1.6 : paddleBase;
      const paddleY = f.fh - 26;
      const ballR = 7;
      return { brickW, brickH, brickTop: 12, paddleW, paddleH: 12, paddleY, ballR };
    };

    const brickRect = (b: Brick, geo: ReturnType<typeof geometry>) => ({
      x: b.c * geo.brickW + 2,
      y: geo.brickTop + b.r * (geo.brickH + 4),
      w: geo.brickW - 4,
      h: geo.brickH,
    });

    const loseLife = () => {
      const g = game.current;
      g.lives -= 1;
      setLives(g.lives);
      g.drops = [];
      g.wideUntil = 0;
      if (g.lives <= 0) { gameOver(); return; }
      g.ball.stuck = true;
      g.flash = 'COMET LOST';
      g.flashUntil = performance.now() + 1000;
    };

    const update = (dt: number) => {
      const g = game.current;
      const f = fieldRef.current;
      const geo = geometry();

      // paddle follows pointer / keyboard
      if (g.keyDir !== 0) g.targetX = Math.max(0, Math.min(1, g.targetX + g.keyDir * dt * 0.9));
      const px = g.paddleX + (g.targetX - g.paddleX) * Math.min(1, dt * 18);
      const half = geo.paddleW / 2 / f.fw;
      g.paddleX = Math.max(half, Math.min(1 - half, px));

      const ball = g.ball;
      if (ball.stuck) {
        ball.x = g.paddleX * f.fw;
        ball.y = geo.paddleY - geo.ballR - 2;
        const speed = 320 + g.level * 25;
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        ball.vx = Math.cos(ang) * speed;
        ball.vy = Math.sin(ang) * speed;
        return;
      }

      // sub-step to avoid tunneling through bricks at high speed
      const speed = Math.hypot(ball.vx, ball.vy);
      const steps = Math.max(1, Math.ceil((speed * dt) / 6));
      const sdt = dt / steps;

      for (let s = 0; s < steps; s++) {
        ball.x += ball.vx * sdt;
        ball.y += ball.vy * sdt;

        // walls
        if (ball.x < geo.ballR) { ball.x = geo.ballR; ball.vx = Math.abs(ball.vx); }
        if (ball.x > f.fw - geo.ballR) { ball.x = f.fw - geo.ballR; ball.vx = -Math.abs(ball.vx); }
        if (ball.y < geo.ballR) { ball.y = geo.ballR; ball.vy = Math.abs(ball.vy); }

        // fell out
        if (ball.y > f.fh + geo.ballR * 2) { loseLife(); return; }

        // paddle
        const pw = geo.paddleW;
        const pl = g.paddleX * f.fw - pw / 2;
        if (
          ball.vy > 0 &&
          ball.y + geo.ballR >= geo.paddleY &&
          ball.y - geo.ballR <= geo.paddleY + geo.paddleH &&
          ball.x >= pl - geo.ballR && ball.x <= pl + pw + geo.ballR
        ) {
          const hit = ((ball.x - pl) / pw) * 2 - 1; // -1 left edge … 1 right edge
          const ang = -Math.PI / 2 + hit * 1.05;    // steer by hit position
          const sp = Math.hypot(ball.vx, ball.vy);
          ball.vx = Math.cos(ang) * sp;
          ball.vy = Math.sin(ang) * sp;
          ball.y = geo.paddleY - geo.ballR;
        }

        // bricks (at most one hit per sub-step)
        for (let i = 0; i < g.bricks.length; i++) {
          const rect = brickRect(g.bricks[i], geo);
          const cx = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w));
          const cy = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h));
          const dx = ball.x - cx;
          const dy = ball.y - cy;
          if (dx * dx + dy * dy > geo.ballR * geo.ballR) continue;

          // reflect along the shallower penetration axis
          if (Math.abs(dx) > Math.abs(dy)) ball.vx = dx > 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx);
          else ball.vy = dy > 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);

          const b = g.bricks[i];
          b.hp -= 1;
          if (b.hp <= 0) {
            g.score += 25;
            const roll = Math.random();
            if (roll < 0.10) g.drops.push({ x: rect.x + rect.w / 2, y: rect.y + rect.h, type: 'wide' });
            else if (roll < 0.13) g.drops.push({ x: rect.x + rect.w / 2, y: rect.y + rect.h, type: 'life' });
            g.bricks.splice(i, 1);
          } else {
            g.score += 10;
          }
          setScore(g.score);
          break;
        }
      }

      // level cleared
      if (g.bricks.length === 0) {
        g.score += 200;
        setScore(g.score);
        setupLevel(g.level + 1);
        return;
      }

      // falling power-ups
      const pw = geo.paddleW;
      const pl = g.paddleX * f.fw - pw / 2;
      for (let i = g.drops.length - 1; i >= 0; i--) {
        const d = g.drops[i];
        d.y += 150 * dt;
        if (d.y > f.fh + 20) { g.drops.splice(i, 1); continue; }
        if (d.y >= geo.paddleY - 8 && d.y <= geo.paddleY + geo.paddleH + 10 && d.x >= pl && d.x <= pl + pw) {
          if (d.type === 'wide') {
            g.wideUntil = performance.now() + WIDE_MS;
            g.score += 50;
          } else {
            g.lives = Math.min(MAX_LIVES, g.lives + 1);
            setLives(g.lives);
            g.score += 100;
          }
          setScore(g.score);
          g.drops.splice(i, 1);
        }
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000) * SPEED;
      last = now;
      const g = game.current;
      const f = fieldRef.current;

      if (phaseRef.current === 'playing') update(dt);

      // --- Draw ---
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      // static starfield
      ctx.fillStyle = 'rgba(148,163,184,0.3)';
      for (let i = 0; i < 60; i++) {
        ctx.fillRect((i * 137 + 19) % w, (i * 173 + 53) % h, 1.5, 1.5);
      }

      ctx.save();
      ctx.translate(f.ox, f.oy);
      // field
      ctx.fillStyle = 'rgba(15,23,42,0.55)';
      ctx.fillRect(0, 0, f.fw, f.fh);
      ctx.strokeStyle = 'rgba(100,116,139,0.4)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, 0, f.fw, f.fh);

      const geo = geometry();

      // bricks
      for (const b of g.bricks) {
        const rect = brickRect(b, geo);
        ctx.fillStyle = HP_COLORS[b.hp] ?? '#22d3ee';
        ctx.globalAlpha = 0.4 + b.hp * 0.2;
        ctx.beginPath();
        ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 5);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // drops
      for (const d of g.drops) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = d.type === 'wide' ? '#38bdf8' : '#f472b6';
        ctx.shadowColor = ctx.fillStyle as string;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#020617';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(d.type === 'wide' ? 'W' : '♥', d.x, d.y + 0.5);
      }

      // paddle
      const pw = geo.paddleW;
      const pl = g.paddleX * f.fw - pw / 2;
      const wide = performance.now() < g.wideUntil;
      ctx.beginPath();
      ctx.roundRect(pl, geo.paddleY, pw, geo.paddleH, 6);
      ctx.fillStyle = wide ? '#38bdf8' : '#e2e8f0';
      ctx.shadowColor = wide ? '#38bdf8' : '#94a3b8';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // ball (comet)
      const ball = g.ball;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, geo.ballR, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.shadowBlur = 0;

      // level banner
      if (performance.now() < g.flashUntil && phaseRef.current === 'playing') {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(g.flash, f.fw / 2, f.fh * 0.45);
      } else if (ball.stuck && phaseRef.current === 'playing') {
        ctx.fillStyle = 'rgba(226,232,240,0.7)';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TAP / SPACE TO LAUNCH', f.fw / 2, geo.paddleY - 40);
      }
      ctx.restore();

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 select-none" style={{ background: 'radial-gradient(ellipse at 50% 20%, #2e1065 0%, #020617 60%)', touchAction: 'none' }}>
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* HUD */}
      <div className="absolute top-4 left-0 right-0 flex justify-center gap-3 pointer-events-none font-mono">
        <div className="bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-1.5 text-center backdrop-blur-sm">
          <div className="text-[10px] uppercase text-slate-500">Score</div>
          <div className="text-lg font-bold text-amber-300" data-testid="score">{score}</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-1.5 text-center backdrop-blur-sm">
          <div className="text-[10px] uppercase text-slate-500">Best</div>
          <div className="text-lg font-bold text-fuchsia-300">{best}</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-1.5 text-center backdrop-blur-sm">
          <div className="text-[10px] uppercase text-slate-500">Level</div>
          <div className="text-lg font-bold text-cyan-300" data-testid="level">{level}</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-1.5 text-center backdrop-blur-sm">
          <div className="text-[10px] uppercase text-slate-500">Lives</div>
          <div className="text-lg font-bold text-rose-300" data-testid="lives">{'●'.repeat(Math.max(0, lives))}</div>
        </div>
      </div>

      {/* Overlays */}
      {phase !== 'playing' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/60 backdrop-blur-[2px]">
          <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-fuchsia-400">
            NEBULA BREAKER
          </h1>
          {phase === 'over' ? (
            <div className="text-center">
              <div className="text-xl font-bold text-white mb-1" data-testid="gameover">COMET BURNED OUT</div>
              <div className="text-sm text-slate-400">Score {score} · Level {level} · Best {best}</div>
            </div>
          ) : (
            <p className="text-sm text-slate-300 max-w-xs text-center leading-relaxed">
              <span className="text-cyan-300 font-bold">Move</span> your ship with mouse, touch or <span className="text-cyan-300 font-bold">←→</span>.<br />
              Bounce the <span className="text-amber-300 font-bold">comet</span>, smash every crystal brick.<br />
              Catch <span className="text-sky-300 font-bold">W</span> for a wide ship, <span className="text-rose-300 font-bold">♥</span> for an extra life.
            </p>
          )}
          <div className="px-6 py-2.5 rounded-xl bg-fuchsia-600 font-bold text-sm uppercase tracking-wider animate-pulse">
            {phase === 'over' ? 'Tap to retry' : 'Tap to start'}
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-500 uppercase font-bold mt-2 px-4">
            <a href="../" className="hover:text-cyan-300 transition-colors pointer-events-auto" onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}>▶ Chroma Cosmos</a>
            <a href="../astro-merge/" className="hover:text-fuchsia-300 transition-colors pointer-events-auto" onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}>▶ Astro Merge</a>
            <a href="../orbit-dash/" className="hover:text-amber-300 transition-colors pointer-events-auto" onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}>▶ Orbit Dash</a>
            <a href="../star-serpent/" className="hover:text-emerald-300 transition-colors pointer-events-auto" onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}>▶ Star Serpent</a>
          </div>
        </div>
      )}
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element');
ReactDOM.createRoot(rootElement).render(<App />);
