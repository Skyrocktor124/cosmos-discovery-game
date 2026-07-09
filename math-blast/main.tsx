import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';

type Difficulty = 'easy' | 'medium' | 'hard';
type Phase = 'menu' | 'playing' | 'over';

interface Question {
  text: string;
  answer: number;
  options: number[];
}

const BEST_KEY = 'math-blast-best-v1';
const LIVES = 3;
const QUESTIONS_PER_PLANET = 8;

const PLANETS = ['🌍', '🌕', '🔴', '🪐', '💫', '🌌'];

const DIFFICULTIES: Record<Difficulty, { label: string; sub: string; seconds: number }> = {
  easy: { label: 'Cadet', sub: '+ and − up to 20', seconds: 12 },
  medium: { label: 'Pilot', sub: '+ and − up to 100', seconds: 10 },
  hard: { label: 'Commander', sub: '× and ÷ times tables', seconds: 10 },
};

const loadBest = (): Record<Difficulty, number> => {
  try {
    const raw = JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
    return { easy: raw.easy || 0, medium: raw.medium || 0, hard: raw.hard || 0 };
  } catch {
    return { easy: 0, medium: 0, hard: 0 };
  }
};

const rand = (n: number) => Math.floor(Math.random() * n);

const makeQuestion = (diff: Difficulty): Question => {
  let a: number, b: number, answer: number, text: string;
  if (diff === 'hard') {
    a = 2 + rand(11);
    b = 2 + rand(11);
    if (Math.random() < 0.5) {
      answer = a * b;
      text = `${a} × ${b}`;
    } else {
      answer = a;
      text = `${a * b} ÷ ${b}`;
    }
  } else {
    const max = diff === 'easy' ? 20 : 100;
    if (Math.random() < 0.5) {
      a = 1 + rand(max - 1);
      b = 1 + rand(max - a);
      answer = a + b;
      text = `${a} + ${b}`;
    } else {
      a = 2 + rand(max - 1);
      b = 1 + rand(a - 1);
      answer = a - b;
      text = `${a} − ${b}`;
    }
  }
  // Three distractors near the answer, all distinct and non-negative
  const options = new Set<number>([answer]);
  while (options.size < 4) {
    const spread = Math.max(3, Math.round(answer * 0.25));
    const wrong = answer + (rand(spread * 2 + 1) - spread);
    if (wrong !== answer && wrong >= 0) options.add(wrong);
  }
  return { text, answer, options: [...options].sort(() => Math.random() - 0.5) };
};

const App: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('menu');
  const [diff, setDiff] = useState<Difficulty>('easy');
  const [question, setQuestion] = useState<Question | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [solved, setSolved] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [feedback, setFeedback] = useState<'right' | 'wrong' | null>(null);
  const [best, setBest] = useState(loadBest);
  const answered = useRef(0);
  const lockRef = useRef(false);

  const planet = Math.min(PLANETS.length - 1, Math.floor(solved / QUESTIONS_PER_PLANET));
  const planetProgress = (solved % QUESTIONS_PER_PLANET) / QUESTIONS_PER_PLANET;

  const start = (d: Difficulty) => {
    setDiff(d);
    setScore(0);
    setStreak(0);
    setLives(LIVES);
    setSolved(0);
    answered.current = 0;
    lockRef.current = false;
    setFeedback(null);
    setQuestion(makeQuestion(d));
    setTimeLeft(DIFFICULTIES[d].seconds);
    setPhase('playing');
  };

  const endGame = (finalScore: number) => {
    setBest(prev => {
      const next = { ...prev, [diff]: Math.max(prev[diff], finalScore) };
      try { localStorage.setItem(BEST_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setPhase('over');
  };

  const nextQuestion = () => {
    lockRef.current = false;
    setFeedback(null);
    setQuestion(makeQuestion(diff));
    setTimeLeft(DIFFICULTIES[diff].seconds);
  };

  const miss = () => {
    if (lockRef.current) return;
    lockRef.current = true;
    setFeedback('wrong');
    setStreak(0);
    setLives(prev => {
      const left = prev - 1;
      setTimeout(() => (left <= 0 ? endGame(score) : nextQuestion()), 900);
      return left;
    });
  };

  const pick = (value: number) => {
    if (lockRef.current || !question) return;
    answered.current += 1;
    if (value === question.answer) {
      lockRef.current = true;
      setFeedback('right');
      const bonus = 10 + Math.min(10, streak * 2);
      const newScore = score + bonus;
      setScore(newScore);
      setStreak(s => s + 1);
      setSolved(s => s + 1);
      setTimeout(nextQuestion, 600);
    } else {
      miss();
    }
  };

  // Countdown timer
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (lockRef.current) return t;
        if (t <= 0.1) {
          miss();
          return 0;
        }
        return t - 0.1;
      });
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, question, score]);

  const timerPct = Math.max(0, (timeLeft / DIFFICULTIES[diff].seconds) * 100);

  return (
    <div
      className="fixed inset-0 select-none flex flex-col items-center overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 20%, #1e1b4b 0%, #020617 65%)', touchAction: 'manipulation' }}
    >
      {/* background stars */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        {Array.from({ length: 40 }, (_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-slate-300 rounded-full"
            style={{ left: `${(i * 37 + 13) % 100}%`, top: `${(i * 53 + 29) % 100}%` }}
          />
        ))}
      </div>

      {phase === 'menu' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 z-10">
          <div className="text-6xl">🚀</div>
          <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-cyan-400 text-center">
            MATH BLAST
          </h1>
          <p className="text-sm text-slate-300 text-center max-w-xs leading-relaxed">
            Answer math questions to <span className="text-amber-300 font-bold">fuel your rocket</span> and
            reach new planets. Wrong answers cost a <span className="text-red-400 font-bold">shield</span>!
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            {(Object.keys(DIFFICULTIES) as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => start(d)}
                data-testid={`start-${d}`}
                className="px-6 py-3 rounded-xl bg-slate-800/80 border border-slate-600 hover:border-cyan-400 hover:bg-slate-700/80 transition-colors text-left flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white">{DIFFICULTIES[d].label}</div>
                  <div className="text-xs text-slate-400">{DIFFICULTIES[d].sub}</div>
                </div>
                <div className="text-xs text-amber-300 font-mono">Best {best[d]}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-4 text-xs text-slate-500 uppercase font-bold">
            <a href="../" className="hover:text-cyan-300 transition-colors">▶ Chroma Cosmos</a>
            <a href="../astro-merge/" className="hover:text-fuchsia-300 transition-colors">▶ Astro Merge</a>
            <a href="../orbit-dash/" className="hover:text-amber-300 transition-colors">▶ Orbit Dash</a>
          </div>
        </div>
      )}

      {phase === 'playing' && question && (
        <div className="flex-1 flex flex-col items-center w-full max-w-md px-4 py-6 z-10">
          {/* HUD */}
          <div className="w-full flex justify-between items-center font-mono mb-4">
            <div className="bg-slate-900/70 border border-slate-700 rounded-lg px-3 py-1.5 backdrop-blur-sm">
              <span className="text-[10px] uppercase text-slate-500 mr-2">Score</span>
              <span className="text-lg font-bold text-cyan-300" data-testid="score">{score}</span>
            </div>
            {streak >= 2 && (
              <div className="text-amber-300 font-bold text-sm animate-pulse">🔥 ×{streak}</div>
            )}
            <div className="text-lg" data-testid="lives">
              {Array.from({ length: LIVES }, (_, i) => (
                <span key={i} className={i < lives ? '' : 'opacity-20 grayscale'}>🛡️</span>
              ))}
            </div>
          </div>

          {/* Journey to next planet */}
          <div className="w-full flex items-center gap-2 mb-8">
            <span className="text-2xl">🚀</span>
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${planetProgress * 100}%` }}
              />
            </div>
            <span className="text-2xl" data-testid="planet">{PLANETS[planet]}</span>
          </div>

          {/* Question card */}
          <div
            className={`w-full rounded-2xl border-2 p-8 text-center backdrop-blur-sm transition-colors duration-200 ${
              feedback === 'right'
                ? 'border-emerald-400 bg-emerald-500/10'
                : feedback === 'wrong'
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-slate-700 bg-slate-900/70'
            }`}
          >
            <div className="text-5xl font-black text-white tracking-wider" data-testid="question">
              {question.text} = ?
            </div>
          </div>

          {/* Timer bar */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-3 mb-8">
            <div
              className={`h-full rounded-full ${timerPct < 30 ? 'bg-red-500' : 'bg-emerald-400'}`}
              style={{ width: `${timerPct}%`, transition: 'width 100ms linear' }}
            />
          </div>

          {/* Answer asteroids */}
          <div className="grid grid-cols-2 gap-4 w-full">
            {question.options.map(opt => (
              <button
                key={opt}
                onClick={() => pick(opt)}
                data-testid={`option-${opt}`}
                className={`py-6 rounded-2xl text-2xl font-black transition-all active:scale-95 border-2 ${
                  feedback && opt === question.answer
                    ? 'bg-emerald-600 border-emerald-400 text-white'
                    : 'bg-slate-800/90 border-slate-600 text-slate-100 hover:border-amber-400 hover:bg-slate-700/90'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'over' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 z-10">
          <div className="text-5xl">{solved >= QUESTIONS_PER_PLANET ? PLANETS[planet] : '💥'}</div>
          <div className="text-2xl font-black text-white" data-testid="gameover">MISSION COMPLETE</div>
          <div className="text-center font-mono">
            <div className="text-4xl font-bold text-cyan-300 mb-1">{score}</div>
            <div className="text-xs uppercase text-slate-500">
              Best {best[diff]} · {solved} solved
              {answered.current > 0 && ` · ${Math.round((solved / answered.current) * 100)}% accuracy`}
            </div>
          </div>
          <button
            onClick={() => start(diff)}
            data-testid="retry"
            className="px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm uppercase tracking-wider transition-colors"
          >
            Fly again
          </button>
          <button
            onClick={() => setPhase('menu')}
            className="text-xs text-slate-400 hover:text-white uppercase font-bold transition-colors"
          >
            Change difficulty
          </button>
          <div className="flex gap-4 text-xs text-slate-500 uppercase font-bold mt-2">
            <a href="../" className="hover:text-cyan-300 transition-colors">▶ Chroma Cosmos</a>
            <a href="../astro-merge/" className="hover:text-fuchsia-300 transition-colors">▶ Astro Merge</a>
            <a href="../orbit-dash/" className="hover:text-amber-300 transition-colors">▶ Orbit Dash</a>
          </div>
        </div>
      )}
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element');
ReactDOM.createRoot(rootElement).render(<App />);
