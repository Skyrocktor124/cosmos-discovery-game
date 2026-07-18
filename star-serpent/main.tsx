import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import SoundToggle from '../shared/SoundToggle';
import { sfx } from '../shared/sfx';

const BEST_KEY = 'star-serpent-best-v1';

type Phase = 'ready' | 'playing' | 'over';
type Dir = 'up' | 'down' | 'left' | 'right';

interface Cell { x: number; y: number; }

const COLS = 22;
const ROWS = 26;
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
const DELTA: Record<Dir, Cell> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

// Tick-interval divisor for automated testing (?speed=3 → 3x faster)
const SPEED = Math.max(1, Math.min(10, Number(new URLSearchParams(location.search).get('speed')) || 1));

const loadBest = (): number => {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(loadBest);
  const phaseRef = useRef<Phase>('ready');
  phaseRef.current = phase;

  const game = useRef({
    snake: [] as Cell[],
    dir: 'up' as Dir,
    nextDir: 'up' as Dir,
    food: { x: 5, y: 5 } as Cell,
    score: 0,
    acc: 0,
    interval: 150, // ms per step
  });

  const placeFood = () => {
    const g = game.current;
    const occupied = new Set(g.snake.map(c => `${c.x},${c.y}`));
    let f: Cell;
    do {
      f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    } while (occupied.has(`${f.x},${f.y}`));
    g.food = f;
  };

  const reset = () => {
    const g = game.current;
    const cx = Math.floor(COLS / 2);
    const cy = Math.floor(ROWS / 2);
    g.snake = [{ x: cx, y: cy }, { x: cx, y: cy + 1 }, { x: cx, y: cy + 2 }];
    g.dir = 'up';
    g.nextDir = 'up';
    g.score = 0;
    g.acc = 0;
    g.interval = 150;
    placeFood();
    setScore(0);
  };

  const start = () => { sfx.play('click'); reset(); setPhase('playing'); };

  const steer = (d: Dir) => {
    const g = game.current;
    if (phaseRef.current !== 'playing') return;
    if (d !== OPPOSITE[g.dir]) g.nextDir = d;
  };

  // Input: keyboard + swipe
  useEffect(() => {
    const KEYMAP: Record<string, Dir> = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right',
      W: 'up', S: 'down', A: 'left', D: 'right',
    };
    const onKey = (e: KeyboardEvent) => {
      const d = KEYMAP[e.key];
      if (d) { e.preventDefault(); if (phaseRef.current === 'playing') steer(d); else start(); return; }
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (phaseRef.current !== 'playing') start(); }
    };
    let sx = 0, sy = 0;
    const onDown = (e: PointerEvent) => { sx = e.clientX; sy = e.clientY; };
    const onUp = (e: PointerEvent) => {
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (phaseRef.current !== 'playing') { start(); return; }
      if (Math.hypot(dx, dy) < 18) return; // tap, not swipe
      if (Math.abs(dx) > Math.abs(dy)) steer(dx > 0 ? 'right' : 'left');
      else steer(dy > 0 ? 'down' : 'up');
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
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
    let cell = 16;
    let ox = 0, oy = 0; // board offset (centered)

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = Math.floor(Math.min(window.innerWidth / COLS, (window.innerHeight - 90) / ROWS));
      ox = (window.innerWidth - cell * COLS) / 2;
      oy = 80 + (window.innerHeight - 90 - cell * ROWS) / 2;
    };
    resize();
    window.addEventListener('resize', resize);

    const gameOver = () => {
      sfx.play('crash');
      setPhase('over');
      const g = game.current;
      setBest(prev => {
        const nb = Math.max(prev, g.score);
        try { localStorage.setItem(BEST_KEY, String(nb)); } catch { /* ignore */ }
        return nb;
      });
    };

    const step = () => {
      const g = game.current;
      g.dir = g.nextDir;
      const head = g.snake[0];
      const nx = head.x + DELTA[g.dir].x;
      const ny = head.y + DELTA[g.dir].y;
      // wall crash
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) { gameOver(); return; }
      // self crash (tail cell vacates this tick unless we eat, but keep it strict & simple)
      if (g.snake.some(c => c.x === nx && c.y === ny)) { gameOver(); return; }
      g.snake.unshift({ x: nx, y: ny });
      if (nx === g.food.x && ny === g.food.y) {
        sfx.play('pickup');
        g.score += 1;
        setScore(g.score);
        g.interval = Math.max(70, 150 - g.score * 3);
        placeFood();
      } else {
        g.snake.pop();
      }
    };

    const frame = (now: number) => {
      const dt = now - last;
      last = now;
      const g = game.current;

      if (phaseRef.current === 'playing') {
        g.acc += dt * SPEED;
        while (g.acc >= g.interval) {
          g.acc -= g.interval;
          step();
          if (phaseRef.current !== 'playing') break;
        }
      }

      // --- Draw ---
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      // static starfield
      ctx.fillStyle = 'rgba(148,163,184,0.3)';
      for (let i = 0; i < 50; i++) {
        ctx.fillRect((i * 137 + 19) % w, (i * 173 + 53) % h, 1.5, 1.5);
      }
      // board
      ctx.fillStyle = 'rgba(15,23,42,0.55)';
      ctx.fillRect(ox, oy, cell * COLS, cell * ROWS);
      ctx.strokeStyle = 'rgba(100,116,139,0.4)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ox, oy, cell * COLS, cell * ROWS);
      // food star
      const fx = ox + g.food.x * cell + cell / 2;
      const fy = oy + g.food.y * cell + cell / 2;
      ctx.beginPath();
      ctx.arc(fx, fy, cell * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
      // snake: gradient from cyan head to fuchsia tail
      g.snake.forEach((c, i) => {
        const t = g.snake.length === 1 ? 0 : i / (g.snake.length - 1);
        const r = Math.round(34 + t * (217 - 34));
        const gc = Math.round(211 - t * (211 - 70));
        const b = Math.round(238 + t * (239 - 238));
        ctx.fillStyle = `rgb(${r},${gc},${b})`;
        if (i === 0) { ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 12; }
        const pad = i === 0 ? 1 : 2;
        ctx.beginPath();
        ctx.roundRect(ox + c.x * cell + pad, oy + c.y * cell + pad, cell - pad * 2, cell - pad * 2, 4);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

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
    <div className="fixed inset-0 select-none" style={{ background: 'radial-gradient(ellipse at 50% 20%, #172554 0%, #020617 60%)', touchAction: 'none' }}>
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* HUD */}
      <div className="absolute top-4 left-0 right-0 flex justify-center items-center gap-3 pointer-events-none font-mono">
        <div className="bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-1.5 text-center backdrop-blur-sm">
          <div className="text-[10px] uppercase text-slate-500">Stars</div>
          <div className="text-lg font-bold text-amber-300" data-testid="score">{score}</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-1.5 text-center backdrop-blur-sm">
          <div className="text-[10px] uppercase text-slate-500">Best</div>
          <div className="text-lg font-bold text-fuchsia-300">{best}</div>
        </div>
        <SoundToggle />
      </div>

      {/* Overlays */}
      {phase !== 'playing' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/60 backdrop-blur-[2px]">
          <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">
            STAR SERPENT
          </h1>
          {phase === 'over' ? (
            <div className="text-center">
              <div className="text-xl font-bold text-white mb-1" data-testid="gameover">SERPENT DOWN</div>
              <div className="text-sm text-slate-400">Stars {score} · Best {best}</div>
            </div>
          ) : (
            <p className="text-sm text-slate-300 max-w-xs text-center leading-relaxed">
              <span className="text-cyan-300 font-bold">Swipe</span> or use <span className="text-cyan-300 font-bold">arrow keys</span> to steer.<br />
              Devour <span className="text-amber-300 font-bold">stars</span>, grow longer, don't crash.
            </p>
          )}
          <div className="px-6 py-2.5 rounded-xl bg-cyan-600 font-bold text-sm uppercase tracking-wider animate-pulse">
            {phase === 'over' ? 'Tap to retry' : 'Tap to start'}
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-500 uppercase font-bold mt-2 px-4">
            <a href="../" className="hover:text-cyan-300 transition-colors pointer-events-auto" onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}>▶ Chroma Cosmos</a>
            <a href="../astro-merge/" className="hover:text-fuchsia-300 transition-colors pointer-events-auto" onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}>▶ Astro Merge</a>
            <a href="../orbit-dash/" className="hover:text-amber-300 transition-colors pointer-events-auto" onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}>▶ Orbit Dash</a>
          </div>
        </div>
      )}
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element');
ReactDOM.createRoot(rootElement).render(<App />);
