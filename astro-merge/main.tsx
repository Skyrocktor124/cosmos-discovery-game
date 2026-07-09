import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import { Grid, Direction, move, spawnTile, hasMoves, newGame, MAX_LEVEL, SIZE } from './game';

const SAVE_KEY = 'astro-merge-save-v1';
const BEST_KEY = 'astro-merge-best-v1';

// Level → celestial body
const TILES: { name: string; icon: string; color: string; glow: string }[] = [
  { name: '', icon: '', color: 'transparent', glow: 'transparent' }, // 0 empty
  { name: 'Stardust', icon: '✨', color: '#334155', glow: '#64748b' },
  { name: 'Comet', icon: '☄️', color: '#155e75', glow: '#06b6d4' },
  { name: 'Moon', icon: '🌑', color: '#3f3f46', glow: '#a1a1aa' },
  { name: 'Planet', icon: '🌍', color: '#14532d', glow: '#22c55e' },
  { name: 'Gas Giant', icon: '🪐', color: '#713f12', glow: '#eab308' },
  { name: 'Star', icon: '⭐', color: '#854d0e', glow: '#fbbf24' },
  { name: 'Giant Star', icon: '🌟', color: '#9a3412', glow: '#f97316' },
  { name: 'Supernova', icon: '💥', color: '#7f1d1d', glow: '#ef4444' },
  { name: 'Nebula', icon: '🌀', color: '#581c87', glow: '#a855f7' },
  { name: 'Black Hole', icon: '⚫', color: '#1e1b4b', glow: '#6366f1' },
  { name: 'Galaxy', icon: '🌌', color: '#701a75', glow: '#ec4899' },
];

interface SaveData { grid: Grid; score: number; }

const loadSave = (): SaveData | null => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SaveData;
    if (!Array.isArray(d.grid) || d.grid.length !== SIZE) return null;
    return d;
  } catch { return null; }
};

const loadBest = (): number => {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
};

const App: React.FC = () => {
  const [grid, setGrid] = useState<Grid>(() => loadSave()?.grid ?? newGame());
  const [score, setScore] = useState<number>(() => loadSave()?.score ?? 0);
  const [best, setBest] = useState<number>(loadBest);
  const [gameOver, setGameOver] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Persist state
  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ grid, score }));
      if (score > best) {
        setBest(score);
        localStorage.setItem(BEST_KEY, String(score));
      }
    } catch { /* storage unavailable */ }
  }, [grid, score, best]);

  const doMove = useCallback((dir: Direction) => {
    setGrid(prev => {
      const result = move(prev, dir);
      if (!result.moved) return prev;
      const next = spawnTile(result.grid);
      if (result.scoreGained) setScore(s => s + result.scoreGained);
      if (!hasMoves(next)) setGameOver(true);
      return next;
    });
  }, []);

  const restart = () => {
    setGrid(newGame());
    setScore(0);
    setGameOver(false);
  };

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
        a: 'left', d: 'right', w: 'up', s: 'down',
      };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); doMove(dir); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doMove]);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 'right' : 'left');
    else doMove(dy > 0 ? 'down' : 'up');
  };

  const highest = Math.max(...grid.flat());

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 select-none"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1e1b4b 0%, #020617 60%)', touchAction: 'none' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">
              ASTRO MERGE
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Merge matching bodies. Reach the {TILES[MAX_LEVEL].icon} {TILES[MAX_LEVEL].name}.
            </p>
          </div>
          <div className="flex gap-2 text-center font-mono">
            <div className="bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-1.5">
              <div className="text-[10px] uppercase text-slate-500">Score</div>
              <div className="text-sm font-bold text-cyan-300">{score}</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-1.5">
              <div className="text-[10px] uppercase text-slate-500">Best</div>
              <div className="text-sm font-bold text-fuchsia-300">{best}</div>
            </div>
          </div>
        </div>

        {/* Board */}
        <div className="relative bg-slate-900/70 border border-slate-700 rounded-2xl p-2 shadow-2xl backdrop-blur-sm">
          <div className="grid grid-cols-4 gap-2">
            {grid.flat().map((level, i) => {
              const tile = TILES[level];
              return (
                <div
                  key={i}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-150"
                  style={level === 0
                    ? { background: 'rgba(15,23,42,0.6)', border: '1px solid #1e293b' }
                    : {
                        background: `radial-gradient(circle at 35% 30%, ${tile.glow}33, ${tile.color})`,
                        border: `1px solid ${tile.glow}66`,
                        boxShadow: `0 0 ${8 + level * 2}px ${tile.glow}55`,
                      }}
                >
                  {level > 0 && (
                    <>
                      <span style={{ fontSize: `${Math.min(2.2, 1.2 + level * 0.1)}rem`, lineHeight: 1 }}>{tile.icon}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wide mt-1" style={{ color: tile.glow }}>
                        {tile.name}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {gameOver && (
            <div className="absolute inset-0 rounded-2xl bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10">
              <div className="text-2xl font-black text-white">UNIVERSE COLLAPSED</div>
              <div className="text-sm text-slate-400">
                Score {score} · Highest: {TILES[highest].icon} {TILES[highest].name}
              </div>
              <button
                onClick={restart}
                className="px-6 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 font-bold text-sm uppercase tracking-wider transition-colors"
              >
                New Universe
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
          <span className="hidden sm:inline">Arrow keys / WASD to move</span>
          <span className="sm:hidden">Swipe to move</span>
          <div className="flex items-center gap-3">
            <button onClick={restart} className="hover:text-slate-300 transition-colors uppercase font-bold">
              Restart
            </button>
            <a href="../" className="hover:text-cyan-300 transition-colors uppercase font-bold">
              ▶ Chroma Cosmos
            </a>
            <a href="../orbit-dash/" className="hover:text-fuchsia-300 transition-colors uppercase font-bold">
              ▶ Orbit Dash
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element');
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
