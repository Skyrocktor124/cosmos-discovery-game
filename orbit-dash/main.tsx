import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';

const BEST_KEY = 'orbit-dash-best-v1';

type Phase = 'ready' | 'playing' | 'over';

interface Asteroid { x: number; y: number; vx: number; vy: number; r: number; }
interface Star { angle: number; }

const TAU = Math.PI * 2;

const loadBest = (): number => {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
};

// Spawn-rate multiplier for automated testing (?speed=5)
const SPEED = Math.max(1, Math.min(20, Number(new URLSearchParams(location.search).get('speed')) || 1));

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(loadBest);
  const phaseRef = useRef<Phase>('ready');
  phaseRef.current = phase;

  // Mutable game state lives in refs; React state only mirrors HUD values.
  const game = useRef({
    angle: 0,
    dir: 1,
    orbitR: 0,
    shipR: 9,
    speed: 1.6, // radians per second
    asteroids: [] as Asteroid[],
    star: { angle: Math.PI / 2 } as Star,
    spawnTimer: 0,
    score: 0,
    elapsed: 0,
  });

  const reset = () => {
    const g = game.current;
    g.angle = -Math.PI / 2;
    g.dir = 1;
    g.speed = 1.6;
    g.asteroids = [];
    g.star = { angle: Math.random() * TAU };
    g.spawnTimer = 0;
    g.score = 0;
    g.elapsed = 0;
    setScore(0);
  };

  const start = () => {
    reset();
    setPhase('playing');
  };

  const tap = () => {
    if (phaseRef.current === 'playing') {
      game.current.dir *= -1;
    } else {
      start();
    }
  };

  // Input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter') { e.preventDefault(); tap(); }
    };
    const onPointer = () => tap();
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
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
      game.current.orbitR = Math.min(window.innerWidth, window.innerHeight) * 0.28;
    };
    resize();
    window.addEventListener('resize', resize);

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w / 2;
      const cy = h / 2;
      const g = game.current;

      // --- Update ---
      if (phaseRef.current === 'playing') {
        g.elapsed += dt;
        g.speed = 1.6 + Math.min(1.6, g.elapsed * 0.03);
        g.angle += g.dir * g.speed * dt;

        // Spawn asteroids aimed at a random point on the orbit ring
        g.spawnTimer -= dt * SPEED;
        if (g.spawnTimer <= 0) {
          g.spawnTimer = Math.max(0.45, 1.4 - g.elapsed * 0.02);
          const targetA = Math.random() * TAU;
          const tx = cx + Math.cos(targetA) * g.orbitR;
          const ty = cy + Math.sin(targetA) * g.orbitR;
          const edgeA = Math.random() * TAU;
          const edgeDist = Math.max(w, h) * 0.75;
          const x = cx + Math.cos(edgeA) * edgeDist;
          const y = cy + Math.sin(edgeA) * edgeDist;
          const sp = 90 + Math.min(160, g.elapsed * 3);
          const d = Math.hypot(tx - x, ty - y) || 1;
          g.asteroids.push({ x, y, vx: ((tx - x) / d) * sp, vy: ((ty - y) / d) * sp, r: 7 + Math.random() * 9 });
        }

        const shipX = cx + Math.cos(g.angle) * g.orbitR;
        const shipY = cy + Math.sin(g.angle) * g.orbitR;

        // Move asteroids, cull, collide
        g.asteroids = g.asteroids.filter(a => {
          a.x += a.vx * dt;
          a.y += a.vy * dt;
          return Math.hypot(a.x - cx, a.y - cy) < Math.max(w, h);
        });
        for (const a of g.asteroids) {
          if (Math.hypot(a.x - shipX, a.y - shipY) < a.r + g.shipR - 2) {
            setPhase('over');
            setBest(prev => {
              const nb = Math.max(prev, g.score);
              try { localStorage.setItem(BEST_KEY, String(nb)); } catch { /* ignore */ }
              return nb;
            });
            break;
          }
        }

        // Star pickup
        const starX = cx + Math.cos(g.star.angle) * g.orbitR;
        const starY = cy + Math.sin(g.star.angle) * g.orbitR;
        if (Math.hypot(starX - shipX, starY - shipY) < 16 + g.shipR) {
          g.score += 1;
          setScore(g.score);
          let na = Math.random() * TAU;
          // keep the next star away from the ship
          while (Math.abs(((na - g.angle) % TAU + TAU) % TAU) < 1) na = Math.random() * TAU;
          g.star = { angle: na };
        }
      }

      // --- Draw ---
      ctx.clearRect(0, 0, w, h);
      // background stars
      ctx.fillStyle = 'rgba(148,163,184,0.35)';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 97 + 31) % w;
        const sy = (i * 211 + 67) % h;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }
      // orbit ring
      ctx.beginPath();
      ctx.arc(cx, cy, g.orbitR, 0, TAU);
      ctx.strokeStyle = 'rgba(100,116,139,0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // planet
      const grad = ctx.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, 34);
      grad.addColorStop(0, '#a855f7');
      grad.addColorStop(1, '#3b0764');
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, TAU);
      ctx.fillStyle = grad;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 35;
      ctx.fill();
      ctx.shadowBlur = 0;
      // star pickup
      const stX = cx + Math.cos(g.star.angle) * g.orbitR;
      const stY = cy + Math.sin(g.star.angle) * g.orbitR;
      ctx.beginPath();
      ctx.arc(stX, stY, 7, 0, TAU);
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 18;
      ctx.fill();
      ctx.shadowBlur = 0;
      // asteroids
      for (const a of g.asteroids) {
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, TAU);
        ctx.fillStyle = '#64748b';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
      }
      // ship
      const shX = cx + Math.cos(g.angle) * g.orbitR;
      const shY = cy + Math.sin(g.angle) * g.orbitR;
      ctx.beginPath();
      ctx.arc(shX, shY, g.shipR, 0, TAU);
      ctx.fillStyle = '#22d3ee';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 22;
      ctx.fill();
      ctx.shadowBlur = 0;

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
    <div className="fixed inset-0 select-none" style={{ background: 'radial-gradient(ellipse at 50% 30%, #1e1b4b 0%, #020617 65%)', touchAction: 'none' }}>
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* HUD */}
      <div className="absolute top-4 left-0 right-0 flex justify-center gap-3 pointer-events-none font-mono">
        <div className="bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-1.5 text-center backdrop-blur-sm">
          <div className="text-[10px] uppercase text-slate-500">Score</div>
          <div className="text-lg font-bold text-cyan-300" data-testid="score">{score}</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-1.5 text-center backdrop-blur-sm">
          <div className="text-[10px] uppercase text-slate-500">Best</div>
          <div className="text-lg font-bold text-fuchsia-300">{best}</div>
        </div>
      </div>

      {/* Overlays */}
      {phase !== 'playing' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/60 backdrop-blur-[2px]">
          <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">
            ORBIT DASH
          </h1>
          {phase === 'over' ? (
            <div className="text-center">
              <div className="text-xl font-bold text-white mb-1" data-testid="gameover">SIGNAL LOST</div>
              <div className="text-sm text-slate-400">Score {score} · Best {best}</div>
            </div>
          ) : (
            <p className="text-sm text-slate-300 max-w-xs text-center leading-relaxed">
              Tap / Space to <span className="text-cyan-300 font-bold">reverse your orbit</span>.<br />
              Dodge asteroids. Collect <span className="text-amber-300 font-bold">stars</span>.
            </p>
          )}
          <div className="px-6 py-2.5 rounded-xl bg-fuchsia-600 font-bold text-sm uppercase tracking-wider animate-pulse">
            {phase === 'over' ? 'Tap to retry' : 'Tap to start'}
          </div>
          <div className="flex gap-4 text-xs text-slate-500 uppercase font-bold mt-2">
            <a href="../" className="hover:text-cyan-300 transition-colors pointer-events-auto" onPointerDown={e => e.stopPropagation()}>▶ Chroma Cosmos</a>
            <a href="../astro-merge/" className="hover:text-fuchsia-300 transition-colors pointer-events-auto" onPointerDown={e => e.stopPropagation()}>▶ Astro Merge</a>
            <a href="../math-blast/" className="hover:text-amber-300 transition-colors pointer-events-auto" onPointerDown={e => e.stopPropagation()}>▶ Math Blast</a>
          </div>
        </div>
      )}
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element');
ReactDOM.createRoot(rootElement).render(<App />);
