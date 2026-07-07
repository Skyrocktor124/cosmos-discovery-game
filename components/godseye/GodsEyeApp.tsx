import React, { useEffect, useMemo, useState } from 'react';
import { Eye, ArrowLeft, Sparkles, History, ChevronRight, AlertTriangle } from 'lucide-react';
import { GodsEyeAnalysis, InsightSession, LimitingBelief } from '../../types';
import { GODSEYE_PROMPTS, GODSEYE_SCAN_PHASES, GODSEYE_STORAGE_KEY } from '../../constants';
import { analyzeMind } from '../../services/godsEyeService';
import Starfield from '../Starfield';
import BeliefMap from './BeliefMap';
import ClearingRitual from './ClearingRitual';

interface GodsEyeAppProps {
  onExit: () => void;
}

type Phase = 'INPUT' | 'SCANNING' | 'REPORT';

const loadSessions = (): InsightSession[] => {
  try {
    const raw = localStorage.getItem(GODSEYE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as InsightSession[]) : [];
  } catch {
    return [];
  }
};

const saveSessions = (sessions: InsightSession[]) => {
  try {
    localStorage.setItem(GODSEYE_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // 存储失败（如隐私模式）时静默降级为仅内存
  }
};

const GodsEyeApp: React.FC<GodsEyeAppProps> = ({ onExit }) => {
  const [sessions, setSessions] = useState<InsightSession[]>(loadSessions);
  const [phase, setPhase] = useState<Phase>('INPUT');
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [ritualBelief, setRitualBelief] = useState<LimitingBelief | null>(null);
  const [scanPhaseIdx, setScanPhaseIdx] = useState(0);

  useEffect(() => saveSessions(sessions), [sessions]);

  // 扫描文案轮播
  useEffect(() => {
    if (phase !== 'SCANNING') return;
    const t = setInterval(() => setScanPhaseIdx((i) => (i + 1) % GODSEYE_SCAN_PHASES.length), 1600);
    return () => clearInterval(t);
  }, [phase]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const allBeliefs = useMemo(
    () => sessions.flatMap((s) => s.analysis.limitingBeliefs),
    [sessions]
  );
  const clearedCount = allBeliefs.filter((b) => b.cleared).length;
  const awareness = allBeliefs.length ? Math.round((clearedCount / allBeliefs.length) * 100) : 0;

  const handleScan = async () => {
    if (input.trim().length < 10) return;
    setError(null);
    setPhase('SCANNING');
    setScanPhaseIdx(0);
    try {
      const analysis: GodsEyeAnalysis = await analyzeMind(input.trim(), allBeliefs);
      const session: InsightSession = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        userText: input.trim(),
        analysis,
      };
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setInput('');
      setPhase('REPORT');
    } catch (e) {
      console.error('God\'s eye analysis failed:', e);
      setError('升维失败：无法连接俯瞰者。请检查 GEMINI_API_KEY 配置后重试。');
      setPhase('INPUT');
    }
  };

  const handleBeliefCleared = (updated: LimitingBelief) => {
    setSessions((prev) =>
      prev.map((s) => ({
        ...s,
        analysis: {
          ...s.analysis,
          limitingBeliefs: s.analysis.limitingBeliefs.map((b) => (b.id === updated.id ? updated : b)),
        },
      }))
    );
    setRitualBelief(null);
  };

  return (
    <div className="relative min-h-[100dvh] flex flex-col font-sans">
      <Starfield speed={phase === 'SCANNING' ? 30 : 0.15} />

      {/* 顶栏 */}
      <header className="px-4 md:px-6 h-16 flex justify-between items-center bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
            title="返回门户"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <Eye className="w-5 h-5 text-amber-300" strokeWidth={1.5} />
          <h1 className="text-base font-semibold text-slate-100">内在宇宙</h1>
        </div>

        <div className="flex gap-5 md:gap-8 text-sm font-mono">
          <div className="flex items-baseline gap-1.5">
            <span className="text-slate-500 text-xs">暗星</span>
            <span className="text-violet-300 font-bold">{allBeliefs.length - clearedCount}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-slate-500 text-xs">已点亮</span>
            <span className="text-amber-300 font-bold">{clearedCount}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-slate-500 text-xs">觉察度</span>
            <span className="text-slate-100 font-bold">{awareness}%</span>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col lg:flex-row overflow-hidden relative z-0">
        {/* 主区域 */}
        <div className="flex-grow px-4 py-8 md:px-10 md:py-12 overflow-y-auto custom-scrollbar">

          {phase === 'SCANNING' && (
            <div className="h-full min-h-[60vh] flex flex-col items-center justify-center text-center">
              <div className="relative mb-10">
                <div className="w-20 h-20 rounded-full border border-amber-300/30 animate-ping absolute inset-0" />
                <div className="w-20 h-20 rounded-full border border-amber-300/50 flex items-center justify-center bg-slate-950/60">
                  <Eye className="w-8 h-8 text-amber-200 animate-pulse" strokeWidth={1.5} />
                </div>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-50 mb-3">正在升维</h2>
              <p className="text-slate-400 text-sm animate-pulse">{GODSEYE_SCAN_PHASES[scanPhaseIdx]}</p>
            </div>
          )}

          {phase === 'INPUT' && (
            <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-50 mb-3 mt-2">
                把心里的东西倒出来
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed max-w-[46ch] mb-8">
                写下一件最近困扰你的事、一个反复出现的模式、或一个纠结的决定。写得越具体、越诚实，俯瞰者看到的就越清晰。
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {GODSEYE_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setInput((cur) => (cur ? cur + '\n' + p : p))}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/70 text-slate-400 hover:text-slate-100 hover:border-amber-300/60 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={9}
                placeholder="在这里倾诉。例如：我总觉得自己不够好，明明想换工作却一直拖着，害怕换了更糟。"
                className="w-full bg-slate-950/80 border border-slate-700 rounded-2xl px-5 py-4 text-base text-slate-100 leading-relaxed focus:border-amber-300/70 focus:outline-none placeholder:text-slate-600 resize-none"
              />

              {error && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-300 bg-red-950/40 border border-red-900/50 rounded-lg px-4 py-3">
                  <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.5} /> {error}
                </div>
              )}

              <button
                onClick={handleScan}
                disabled={input.trim().length < 10}
                className="mt-4 w-full sm:w-auto px-8 py-3 rounded-lg bg-amber-300 text-slate-950 font-semibold hover:bg-amber-200 active:translate-y-px transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                开始俯瞰扫描
              </button>
              {input.trim().length > 0 && input.trim().length < 10 && (
                <p className="text-xs text-slate-500 mt-2">再多写一点，俯瞰者才能看清。</p>
              )}
            </div>
          )}

          {phase === 'REPORT' && activeSession && (
            <article className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
              <div className="flex items-center justify-between mb-10">
                <button
                  onClick={() => setPhase('INPUT')}
                  className="flex items-center gap-1.5 text-sm text-amber-300 hover:text-amber-200 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> 新的倾诉
                </button>
                <time className="text-xs text-slate-500 font-mono">
                  {new Date(activeSession.createdAt).toLocaleString('zh-CN')}
                </time>
              </div>

              {/* 俯瞰观察：整份报告唯一的眉标 */}
              <p className="text-xs tracking-[0.2em] text-amber-300/90 mb-4">俯瞰观察</p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-snug text-slate-50 mb-6">
                {activeSession.analysis.coreTheme}
              </h2>
              <p className="voice text-lg text-slate-300 leading-loose mb-14">
                {activeSession.analysis.observation}
              </p>

              {/* 思维盲点：hairline 分隔的编辑排版，不做卡片 */}
              <h3 className="text-xl font-bold text-slate-50 mb-1">思维盲点</h3>
              <p className="text-sm text-slate-500 mb-2">你看不见、但从高处能看见的引力。</p>
              <div className="divide-y divide-slate-800">
                {activeSession.analysis.blindSpots.map((bs) => (
                  <div key={bs.id} className="py-6">
                    <div className="flex items-baseline gap-3 mb-2">
                      <h4 className="font-semibold text-slate-100">{bs.name}</h4>
                      <span className="text-xs text-slate-500">{bs.biasType}</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed mb-3">{bs.explanation}</p>
                    <p className="voice text-sm text-slate-500 italic mb-4">"{bs.evidence}"</p>
                    <p className="text-sm text-amber-200 border-l-2 border-amber-300/60 pl-4 leading-relaxed">
                      {bs.question}
                    </p>
                  </div>
                ))}
              </div>

              {/* 限制性信念：暗星是可交互对象，卡片有真实层级理由 */}
              <h3 className="text-xl font-bold text-slate-50 mt-12 mb-1">限制性信念</h3>
              <p className="text-sm text-slate-500 mb-5">新发现的暗星。清除它，把它点亮。</p>
              <div className="flex flex-col gap-4">
                {activeSession.analysis.limitingBeliefs.map((b) => (
                  <div
                    key={b.id}
                    className={`rounded-2xl p-6 border transition-colors ${
                      b.cleared
                        ? 'bg-slate-900/50 border-amber-300/30'
                        : 'bg-violet-950/25 border-violet-800/50'
                    }`}
                  >
                    <p className={`voice text-lg font-bold mb-2 ${b.cleared ? 'text-slate-500 line-through decoration-amber-300/50' : 'text-slate-50'}`}>
                      「{b.statement}」
                    </p>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      <span className="text-slate-500">代价：</span>{b.cost}
                    </p>
                    {b.cleared ? (
                      <p className="voice text-base text-amber-200 mt-4 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 mt-1 shrink-0" strokeWidth={1.5} />
                        「{b.userReframed || b.reframed}」
                      </p>
                    ) : (
                      <button
                        onClick={() => setRitualBelief(b)}
                        className="mt-4 px-5 py-2 rounded-lg bg-amber-300 text-slate-950 text-sm font-semibold hover:bg-amber-200 active:translate-y-px transition-all"
                      >
                        开始清除仪式
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* 视角切换：三个声音的纵向对话，不做三等宽卡片 */}
              <h3 className="text-xl font-bold text-slate-50 mt-12 mb-1">借他人之眼</h3>
              <p className="text-sm text-slate-500 mb-2">同一处境，三个视角。</p>
              <div className="divide-y divide-slate-800">
                {activeSession.analysis.perspectives.map((p, i) => (
                  <div key={i} className="py-5">
                    <p className="text-sm font-semibold text-slate-400 mb-1.5">{p.persona}</p>
                    <p className="voice text-base text-slate-200 leading-relaxed">{p.insight}</p>
                  </div>
                ))}
              </div>

              {/* 结语 */}
              <div className="mt-14 pt-8 border-t border-slate-800">
                <p className="voice text-lg text-slate-300 leading-loose text-center max-w-[36ch] mx-auto">
                  {activeSession.analysis.encouragement}
                </p>
              </div>
            </article>
          )}
        </div>

        {/* 侧栏：星图 + 档案 */}
        <aside className="w-full lg:w-96 bg-slate-950/85 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col shrink-0 z-10 max-h-[50vh] lg:max-h-none">
          <div className="px-4 py-3 border-b border-slate-800 text-xs font-semibold text-slate-400">
            信念星图
          </div>
          <div className="p-3 h-64 lg:h-80 shrink-0">
            <BeliefMap
              beliefs={allBeliefs}
              selectedId={ritualBelief?.id}
              onSelect={(b) => {
                if (!b.cleared) setRitualBelief(b);
              }}
            />
          </div>

          <div className="px-4 py-3 border-y border-slate-800 text-xs font-semibold text-slate-400 flex items-center gap-2">
            <History size={13} strokeWidth={1.5} /> 俯瞰档案
          </div>
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar min-h-[80px]">
            {sessions.length === 0 && (
              <p className="text-slate-600 text-xs p-3 leading-relaxed">
                还没有任何记录。完成第一次俯瞰扫描后，档案会出现在这里。
              </p>
            )}
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => { setActiveSessionId(s.id); setPhase('REPORT'); }}
                className={`w-full text-left p-3 mb-1.5 rounded-lg border transition-colors group ${
                  s.id === activeSessionId && phase === 'REPORT'
                    ? 'bg-slate-900 border-amber-300/40'
                    : 'bg-transparent border-transparent hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-200 text-xs truncate">{s.analysis.coreTheme}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 shrink-0" strokeWidth={1.5} />
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 font-mono">
                  <span>{new Date(s.createdAt).toLocaleDateString('zh-CN')}</span>
                  <span>
                    暗星 {s.analysis.limitingBeliefs.filter((b) => !b.cleared).length} · 已点亮 {s.analysis.limitingBeliefs.filter((b) => b.cleared).length}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>
      </main>

      {/* 清除仪式弹层 */}
      {ritualBelief && (
        <ClearingRitual
          belief={ritualBelief}
          onClose={() => setRitualBelief(null)}
          onCleared={handleBeliefCleared}
        />
      )}
    </div>
  );
};

export default GodsEyeApp;
