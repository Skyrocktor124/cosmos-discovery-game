import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import { TASKS, TRACK_META, PROMPT_LIBRARY, type Task, type Track } from './data';

const SAVE_KEY = 'her-ai-plan-v1';
const PLAN_DAYS = 21;
const CARE_DAYS = [4, 11, 18]; // 0-indexed:每周安排一天自我关怀

// ── 测评问卷 ──────────────────────────────────────────────
type GoalTrack = Exclude<Track, 'care'>;

interface Answers {
  stage: string;
  goals: GoalTrack[];
  aiLevel: 'none' | 'some' | 'often';
  time: 15 | 30 | 60;
  blocker: string;
}

const QUIZ = [
  {
    key: 'stage' as const,
    title: '你现在处于哪个阶段?',
    single: true,
    options: [
      { value: 'student', label: '🎓 学生 / 即将毕业' },
      { value: 'newbie', label: '🌱 职场 1-3 年' },
      { value: 'pro', label: '🚀 职场 3 年以上' },
      { value: 'free', label: '🏡 自由职业 / 全职妈妈' },
      { value: 'explore', label: '🧭 正在转型或探索中' },
    ],
  },
  {
    key: 'goals' as const,
    title: '接下来 21 天,你最想突破什么?',
    subtitle: '最多选 2 个',
    single: false,
    options: [
      { value: 'career', label: '💼 职场进阶 · 升职加薪' },
      { value: 'side', label: '🌱 副业增收 · 多一份收入' },
      { value: 'ai', label: '🤖 学会用 AI · 效率翻倍' },
      { value: 'confidence', label: '✨ 自信表达 · 敢说敢要' },
      { value: 'money', label: '💰 理财规划 · 钱更有底气' },
    ],
  },
  {
    key: 'aiLevel' as const,
    title: '你对 AI 工具(ChatGPT、豆包等)的熟悉程度?',
    single: true,
    options: [
      { value: 'none', label: '🌑 几乎没用过' },
      { value: 'some', label: '🌓 偶尔用一用' },
      { value: 'often', label: '🌕 经常使用' },
    ],
  },
  {
    key: 'time' as const,
    title: '每天能为自己投入多少时间?',
    single: true,
    options: [
      { value: 15, label: '☕ 15 分钟左右' },
      { value: 30, label: '🕐 30 分钟左右' },
      { value: 60, label: '🔥 1 小时或更多' },
    ],
  },
  {
    key: 'blocker' as const,
    title: '过去让你停下来的,最常是什么?',
    single: true,
    options: [
      { value: 'time', label: '⏰ 时间总是不够' },
      { value: 'start', label: '🗺️ 不知道从哪开始' },
      { value: 'stick', label: '📉 开始了但坚持不住' },
      { value: 'doubt', label: '💭 怀疑自己做不到' },
    ],
  },
];

const BLOCKER_TIPS: Record<string, string> = {
  time: '你的计划已按「小步快走」定制:每天一件事,完成就算赢。忙碌的日子,做完 15 分钟版本也完全算数。',
  start: '不用再规划了——每天打开这里,只做当天这一件事。方向已经替你铺好,你只管走。',
  stick: '连续打卡会点亮你的火焰 🔥,中断了也没关系,回来继续就好。研究表明:错过一天不影响习惯养成,错过两天才是分界线。',
  doubt: '这份计划的每个任务都足够小、小到不可能失败。自信不是想出来的,是一次次「我做到了」积累出来的。',
};

// ── 计划生成(确定性伪随机,零 API 成本) ─────────────────
const hashStr = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

const mulberry32 = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function shuffled<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 某主题的任务池:优先能装进时间预算的,不够再补上更长的 */
function trackPool(track: Track, budget: number, rng: () => number): Task[] {
  const all = TASKS.filter(t => t.track === track);
  const fit = shuffled(all.filter(t => t.minutes <= budget), rng);
  const rest = shuffled(all.filter(t => t.minutes > budget), rng);
  return [...fit, ...rest];
}

function generatePlan(a: Answers): string[] {
  const rng = mulberry32(hashStr(JSON.stringify(a) + Date.now()));
  const primary: GoalTrack = a.goals[0] ?? 'confidence';
  const secondary: GoalTrack = a.goals[1] ?? (primary === 'ai' ? 'confidence' : 'ai');

  const pools: Record<string, Task[]> = {
    [primary]: trackPool(primary, a.time, rng),
    [secondary]: trackPool(secondary, a.time, rng),
    care: trackPool('care', a.time, rng),
    ai: trackPool('ai', a.time, rng),
  };
  const used = new Set<string>();
  const take = (track: string): Task | undefined => {
    const task = pools[track]?.find(t => !used.has(t.id));
    if (task) used.add(task.id);
    return task;
  };

  const plan: string[] = [];
  // AI 零基础且没选 AI 主题:前两天先安排入门,后面的提示词任务才用得顺
  const needIntro = a.aiLevel === 'none' && !a.goals.includes('ai');
  let mainCount = 0;
  for (let day = 0; day < PLAN_DAYS; day++) {
    let task: Task | undefined;
    if (CARE_DAYS.includes(day)) {
      task = take('care');
    } else if (needIntro && mainCount < 2) {
      task = take('ai');
      mainCount++;
    } else {
      // 主目标 : 次目标 ≈ 3 : 2 交替
      const track = mainCount % 5 < 3 ? primary : secondary;
      task = take(track) ?? take(track === primary ? secondary : primary);
      mainCount++;
    }
    task ??= TASKS.find(t => !used.has(t.id));
    if (task) { used.add(task.id); plan.push(task.id); }
  }
  return plan;
}

// ── 存档 ─────────────────────────────────────────────────
interface SaveState {
  v: 1;
  createdAt: string;
  answers: Answers;
  taskIds: string[];
  done: boolean[];
  checkIns: string[]; // 'YYYY-MM-DD',用于连续打卡统计
}

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const loadSave = (): SaveState | null => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s?.v === 1 && Array.isArray(s.taskIds) ? (s as SaveState) : null;
  } catch { return null; }
};

const persist = (s: SaveState) => {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* 隐私模式等场景下静默降级 */ }
};

const calcStreak = (checkIns: string[]): number => {
  const days = new Set(checkIns);
  let streak = 0;
  const cursor = new Date();
  // 今天没打卡不清零,从昨天起算
  if (!days.has(todayStr())) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    if (!days.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

// ── 通用小组件 ────────────────────────────────────────────
const CopyButton: React.FC<{ text: string; label?: string }> = ({ text, label = '复制提示词' }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button
      onClick={copy}
      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
        copied ? 'bg-emerald-500/20 text-emerald-300' : 'bg-violet-500/20 text-violet-200 hover:bg-violet-500/35'
      }`}
    >
      {copied ? '✓ 已复制' : `📋 ${label}`}
    </button>
  );
};

const taskById = (id: string): Task =>
  TASKS.find(t => t.id === id) ?? TASKS[0];

const TrackChip: React.FC<{ track: Track }> = ({ track }) => {
  const m = TRACK_META[track];
  return (
    <span className={`text-xs font-bold uppercase tracking-wide ${m.color}`}>
      {m.emoji} {m.label}
    </span>
  );
};

// ── 页面 ─────────────────────────────────────────────────
const Welcome: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <div className="max-w-xl mx-auto px-6 py-14 text-center flex flex-col items-center gap-6">
    <div className="text-6xl animate-float">🦋</div>
    <h1 className="text-4xl sm:text-5xl font-black leading-tight bg-gradient-to-r from-rose-300 via-fuchsia-300 to-violet-300 bg-clip-text text-transparent">
      女性 AI 成长加速器
    </h1>
    <p className="text-slate-300 leading-relaxed">
      回答 5 个问题,为你生成一份 <b className="text-rose-200">21 天专属成长计划</b>:
      每天一个 15-60 分钟的小任务,配上写好的 AI 提示词,
      让 AI 成为你的职业教练、表达陪练和理财顾问。
    </p>
    <ul className="text-sm text-slate-400 space-y-2 text-left">
      <li>🎯 五大方向:职场进阶 · 副业增收 · AI 技能 · 自信表达 · 理财规划</li>
      <li>📋 每个任务配好可直接复制的提示词,粘贴到你常用的 AI 就能用</li>
      <li>🔥 每日打卡 + 连续记录,进度自动保存在你的浏览器里</li>
      <li>🔒 完全免费,无需注册,数据不离开你的设备</li>
    </ul>
    <button
      onClick={onStart}
      className="mt-2 px-10 py-4 rounded-full bg-gradient-to-r from-rose-500 to-violet-500 text-white text-lg font-black shadow-lg shadow-rose-500/30 hover:scale-105 transition-transform"
    >
      开始 3 分钟测评 →
    </button>
    <p className="text-xs text-slate-500">测评结果仅用于本地生成计划,不会上传任何数据</p>
  </div>
);

const Quiz: React.FC<{ onDone: (a: Answers) => void }> = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [multi, setMulti] = useState<GoalTrack[]>([]);
  const q = QUIZ[step];

  const advance = (next: Partial<Answers>) => {
    const merged = { ...answers, ...next };
    if (step + 1 < QUIZ.length) {
      setAnswers(merged);
      setStep(step + 1);
    } else {
      onDone(merged as Answers);
    }
  };

  const toggleGoal = (v: GoalTrack) => {
    setMulti(m => (m.includes(v) ? m.filter(x => x !== v) : m.length < 2 ? [...m, v] : m));
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <div className="flex gap-2 mb-8">
        {QUIZ.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-rose-400' : 'bg-slate-800'}`} />
        ))}
      </div>
      <p className="text-xs text-rose-300 font-bold mb-2">第 {step + 1} / {QUIZ.length} 题</p>
      <h2 className="text-2xl font-black mb-1">{q.title}</h2>
      {'subtitle' in q && q.subtitle && <p className="text-sm text-slate-400 mb-4">{q.subtitle}</p>}
      <div className="mt-5 space-y-3">
        {q.options.map(opt => {
          const selected = !q.single && multi.includes(opt.value as GoalTrack);
          return (
            <button
              key={String(opt.value)}
              onClick={() => (q.single ? advance({ [q.key]: opt.value } as Partial<Answers>) : toggleGoal(opt.value as GoalTrack))}
              className={`w-full text-left px-5 py-4 rounded-2xl border transition-all font-semibold ${
                selected
                  ? 'border-rose-400 bg-rose-500/15 text-rose-100'
                  : 'border-slate-700 bg-slate-900/60 hover:border-rose-400/60 hover:bg-slate-800/80'
              }`}
            >
              {opt.label} {selected && '✓'}
            </button>
          );
        })}
      </div>
      {!q.single && (
        <button
          disabled={multi.length === 0}
          onClick={() => advance({ goals: multi })}
          className="mt-6 w-full py-4 rounded-full bg-gradient-to-r from-rose-500 to-violet-500 font-black text-white disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform"
        >
          {multi.length === 0 ? '至少选择 1 个' : `确定(已选 ${multi.length} 个)→`}
        </button>
      )}
    </div>
  );
};

const Dashboard: React.FC<{ save: SaveState; onUpdate: (s: SaveState) => void; onReset: () => void }> = ({ save, onUpdate, onReset }) => {
  const [tab, setTab] = useState<'today' | 'plan' | 'prompts'>('today');
  const doneCount = save.done.filter(Boolean).length;
  const currentDay = Math.min(doneCount, PLAN_DAYS - 1); // 第一个未完成的天
  const allDone = doneCount >= PLAN_DAYS;
  const checkedToday = save.checkIns.includes(todayStr());
  const streak = useMemo(() => calcStreak(save.checkIns), [save.checkIns]);
  const task = taskById(save.taskIds[currentDay]);
  const tip = BLOCKER_TIPS[save.answers.blocker];

  const checkIn = () => {
    if (checkedToday || allDone) return;
    const done = [...save.done];
    done[currentDay] = true;
    onUpdate({ ...save, done, checkIns: [...save.checkIns, todayStr()] });
  };

  const shareText = `我正在用「女性AI成长加速器」进行 21 天成长计划,已完成 ${doneCount}/${PLAN_DAYS} 天${streak > 1 ? `,连续打卡 ${streak} 天 🔥` : ''}!每天一个小任务 + 一条 AI 提示词,免费无广告:https://skyrocktor124.github.io/cosmos-discovery-game/her-ai/`;

  const confirmReset = () => {
    if (window.confirm('确定要重新测评吗?当前计划和打卡记录将被清空。')) onReset();
  };

  return (
    <div className="max-w-xl mx-auto px-5 py-8">
      {/* 头部进度 */}
      <header className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-black bg-gradient-to-r from-rose-300 to-violet-300 bg-clip-text text-transparent">🦋 女性 AI 成长加速器</h1>
          <span className="text-sm font-bold text-amber-300">{streak > 0 ? `🔥 连续 ${streak} 天` : '🕯️ 今天点火'}</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-400 to-violet-400 transition-all duration-700"
            style={{ width: `${(doneCount / PLAN_DAYS) * 100}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-1.5">已完成 {doneCount} / {PLAN_DAYS} 天</p>
      </header>

      {/* 标签页 */}
      <nav className="flex gap-2 mb-6">
        {([['today', '📌 今日任务'], ['plan', '🗓️ 我的计划'], ['prompts', '📚 提示词库']] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-colors ${
              tab === k ? 'bg-rose-500/25 text-rose-100' : 'bg-slate-900/70 text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'today' && (
        allDone ? (
          <div className="text-center py-10 space-y-5 animate-in fade-in zoom-in">
            <div className="text-6xl">🎉</div>
            <h2 className="text-3xl font-black text-rose-200">21 天,你做到了!</h2>
            <p className="text-slate-300 leading-relaxed">
              21 个行动、{save.checkIns.length} 次打卡——这些不是任务清单,<br />是你亲手攒下的证据:<b className="text-rose-200">你说到做到。</b>
            </p>
            <div className="flex justify-center"><CopyButton text={shareText} label="复制成绩,分享给朋友" /></div>
            <button onClick={confirmReset} className="block mx-auto text-sm text-violet-300 hover:text-violet-200 underline underline-offset-4">
              开启下一轮 21 天 →
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in zoom-in">
            <div className="rounded-3xl border border-slate-700/70 bg-slate-900/60 p-6 backdrop-blur">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">DAY {currentDay + 1} / {PLAN_DAYS}</span>
                <TrackChip track={task.track} />
              </div>
              <h2 className="text-2xl font-black mb-2">{task.title}</h2>
              <p className="text-slate-300 leading-relaxed text-sm">{task.desc}</p>
              <p className="text-xs text-slate-500 mt-3">⏱️ 约 {task.minutes} 分钟</p>
              {task.prompt && (
                <div className="mt-4 rounded-2xl bg-violet-950/50 border border-violet-500/25 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-violet-300">🤖 配套 AI 提示词(粘贴给任意 AI 助手)</span>
                    <CopyButton text={task.prompt} label="复制" />
                  </div>
                  <p className="text-xs text-violet-100/85 leading-relaxed whitespace-pre-wrap">{task.prompt}</p>
                </div>
              )}
            </div>

            <button
              onClick={checkIn}
              disabled={checkedToday}
              className={`w-full py-4 rounded-full font-black text-lg transition-all ${
                checkedToday
                  ? 'bg-emerald-500/15 text-emerald-300 cursor-default'
                  : 'bg-gradient-to-r from-rose-500 to-violet-500 text-white shadow-lg shadow-rose-500/25 hover:scale-[1.02]'
              }`}
            >
              {checkedToday ? '✓ 今日已打卡,明天见 🌙' : '完成了,打卡 ✓'}
            </button>
            <p className="text-xs text-slate-500 leading-relaxed px-2">💌 {tip}</p>
          </div>
        )
      )}

      {tab === 'plan' && (
        <ol className="space-y-2.5">
          {save.taskIds.map((id, i) => {
            const t = taskById(id);
            const isCurrent = i === currentDay && !allDone;
            const isDone = save.done[i];
            const locked = !isDone && !isCurrent;
            return (
              <li
                key={i}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${
                  isCurrent
                    ? 'border-rose-400/60 bg-rose-500/10'
                    : isDone
                      ? 'border-emerald-500/25 bg-emerald-500/5'
                      : 'border-slate-800 bg-slate-900/40'
                }`}
              >
                <span className={`w-8 text-center font-black text-sm ${isDone ? 'text-emerald-300' : isCurrent ? 'text-rose-300' : 'text-slate-600'}`}>
                  {isDone ? '✓' : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold truncate ${locked ? 'text-slate-500' : ''}`}>
                    {locked ? '🔒 ' : `${TRACK_META[t.track].emoji} `}{locked ? '完成前面的任务后解锁' : t.title}
                  </p>
                  {!locked && <p className="text-xs text-slate-500 truncate">{TRACK_META[t.track].label} · 约 {t.minutes} 分钟</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {tab === 'prompts' && (
        <div className="space-y-6">
          <p className="text-xs text-slate-400 leading-relaxed">
            精选提示词模板,把 <b>[方括号]</b> 换成你的信息,粘贴到 ChatGPT / 豆包 / Kimi / 文心一言等任意 AI 助手即可使用。
          </p>
          {Array.from(new Set(PROMPT_LIBRARY.map(p => p.category))).map(cat => (
            <section key={cat}>
              <h3 className="font-black text-sm text-rose-200 mb-3">{cat}</h3>
              <div className="space-y-3">
                {PROMPT_LIBRARY.filter(p => p.category === cat).map(p => (
                  <details key={p.title} className="rounded-2xl border border-slate-700/60 bg-slate-900/50 overflow-hidden">
                    <summary className="px-4 py-3 cursor-pointer font-bold text-sm hover:bg-slate-800/50 list-none flex justify-between items-center">
                      {p.title} <span className="text-slate-500 text-xs">展开 ▾</span>
                    </summary>
                    <div className="px-4 pb-4">
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap mb-3">{p.prompt}</p>
                      <CopyButton text={p.prompt} />
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <footer className="mt-10 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex gap-2 items-center">
          <CopyButton text={shareText} label="分享进度" />
          <button onClick={confirmReset} className="hover:text-rose-300 transition-colors">↺ 重新测评</button>
        </div>
        <span>
          休息一下:
          <a href="../" className="hover:text-cyan-300 transition-colors font-bold"> 🌌 宇宙探索</a>
          <a href="../astro-merge/" className="hover:text-fuchsia-300 transition-colors font-bold"> 🪐 星球合成</a>
        </span>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  const [save, setSave] = useState<SaveState | null>(loadSave);
  const [phase, setPhase] = useState<'welcome' | 'quiz' | 'plan'>(save ? 'plan' : 'welcome');

  const update = (s: SaveState) => { setSave(s); persist(s); };

  const handleQuizDone = (answers: Answers) => {
    const taskIds = generatePlan(answers);
    update({
      v: 1,
      createdAt: new Date().toISOString(),
      answers,
      taskIds,
      done: Array(PLAN_DAYS).fill(false),
      checkIns: [],
    });
    setPhase('plan');
  };

  const reset = () => {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* noop */ }
    setSave(null);
    setPhase('quiz');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#1a1025] to-slate-950 text-slate-100">
      {phase === 'welcome' && <Welcome onStart={() => setPhase('quiz')} />}
      {phase === 'quiz' && <Quiz onDone={handleQuizDone} />}
      {phase === 'plan' && save && <Dashboard save={save} onUpdate={update} onReset={reset} />}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
