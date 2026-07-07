import React, { useEffect, useMemo, useState } from 'react';
import {
  Eye, ArrowLeft, Sparkles, Brain, Quote, Telescope, Compass,
  History, ChevronRight, AlertTriangle, Star, Send,
} from 'lucide-react';
import { GodsEyeAnalysis, InsightSession, LimitingBelief } from '../../types';
import { GODSEYE_PROMPTS, GODSEYE_SCAN_PHASES, GODSEYE_STORAGE_KEY } from '../../constants';
import { analyzeMind } from '../../services/godsEyeService';
import Starfield from '../Starfield';
import Button from '../Button';
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
    <div className="relative min-h-screen flex flex-col font-sans">
      <Starfield speed={phase === 'SCANNING' ? 30 : 0.15} />

      {/* 顶部 HUD */}
      <header className="p-4 flex flex-col sm:flex-row justify-between items-center bg-slate-900/80 backdrop-blur-md border-b border-slate-700 z-10 sticky top-0 gap-3">
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button onClick={onExit} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="返回门户">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="p-2 bg-purple-700 rounded-lg shadow-lg shadow-purple-500/20">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-amber-300">上帝视角 · 内在宇宙</h1>
            <p className="text-xs text-slate-400">从高处俯瞰你的思想，找到盲点与暗星</p>
          </div>
        </div>

        <div className="flex gap-6 text-sm font-mono w-full sm:w-auto justify-between sm:justify-end px-2">
          <div className="flex flex-col items-end">
            <span className="text-slate-400 text-xs uppercase">暗星</span>
            <span className="text-purple-400 font-bold">{allBeliefs.length - clearedCount}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-slate-400 text-xs uppercase">已点亮</span>
            <span className="text-amber-300 font-bold">{clearedCount}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-slate-400 text-xs uppercase">觉察度</span>
            <span className={`font-bold ${awareness >= 60 ? 'text-emerald-400' : 'text-cyan-400'}`}>{awareness}%</span>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col lg:flex-row overflow-hidden relative z-0">
        {/* 主区域 */}
        <div className="flex-grow p-4 md:p-8 overflow-y-auto custom-scrollbar">

          {phase === 'SCANNING' && (
            <div className="h-full min-h-[60vh] flex flex-col items-center justify-center text-center">
              <div className="relative mb-10">
                <div className="w-20 h-20 rounded-full border-2 border-purple-500/40 animate-ping absolute inset-0" />
                <div className="w-20 h-20 rounded-full border border-purple-400/60 flex items-center justify-center bg-slate-950/60">
                  <Eye className="w-9 h-9 text-purple-300 animate-pulse" />
                </div>
              </div>
              <h2 className="text-3xl font-black text-white italic tracking-tight mb-3">正在升维</h2>
              <p className="text-purple-300/90 font-mono text-sm animate-pulse">{GODSEYE_SCAN_PHASES[scanPhaseIdx]}</p>
            </div>
          )}

          {phase === 'INPUT' && (
            <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
              <div className="text-center mb-8 mt-4">
                <Telescope className="w-10 h-10 text-purple-400 mx-auto mb-4" />
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">把心里的东西倒出来</h2>
                <p className="text-slate-400 text-sm leading-relaxed max-w-lg mx-auto">
                  写下一件最近困扰你的事、一个反复出现的模式、或一个纠结的决定。
                  写得越具体、越诚实，俯瞰者看到的就越清晰。这些内容只保存在你自己的浏览器里。
                </p>
              </div>

              <div className="flex flex-wrap gap-2 mb-4 justify-center">
                {GODSEYE_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setInput((cur) => (cur ? cur + '\n' + p : p))}
                    className="text-xs px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900/70 text-slate-400 hover:text-white hover:border-purple-500 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={9}
                placeholder="在这里倾诉……（例如：我总觉得自己不够好，明明想换工作却一直拖着，害怕换了更糟…）"
                className="w-full bg-slate-950/80 border border-slate-700 rounded-2xl px-5 py-4 text-base text-white leading-relaxed focus:border-purple-500 focus:outline-none placeholder:text-slate-600 resize-none shadow-inner"
              />

              {error && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-300 bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <Button
                onClick={handleScan}
                disabled={input.trim().length < 10}
                className="w-full mt-4 bg-purple-700 border-purple-500 hover:bg-purple-600 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
              >
                <Send className="w-4 h-4" /> 升维 · 开始俯瞰扫描
              </Button>
              {input.trim().length > 0 && input.trim().length < 10 && (
                <p className="text-center text-[11px] text-slate-600 mt-2">再多写一点，俯瞰者才能看清。</p>
              )}
            </div>
          )}

          {phase === 'REPORT' && activeSession && (
            <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500 pb-8">
              <div className="flex items-center justify-between">
                <button onClick={() => setPhase('INPUT')} className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors uppercase font-bold tracking-wider">
                  <ArrowLeft className="w-4 h-4" /> 新的倾诉
                </button>
                <span className="text-xs text-slate-500 font-mono">{new Date(activeSession.createdAt).toLocaleString('zh-CN')}</span>
              </div>

              {/* 核心议题 + 俯瞰观察 */}
              <div className="bg-slate-900/70 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-purple-400">俯瞰观察</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-4" style={{ textShadow: '0 0 24px rgba(168,85,247,0.4)' }}>
                  {activeSession.analysis.coreTheme}
                </h2>
                <p className="text-slate-300 leading-loose font-light">{activeSession.analysis.observation}</p>
              </div>

              {/* 思维盲点 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">思维盲点 · 你看不见的引力</span>
                </div>
                <div className="grid gap-3">
                  {activeSession.analysis.blindSpots.map((bs) => (
                    <div key={bs.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-cyan-800 transition-colors">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <h3 className="font-bold text-white">{bs.name}</h3>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-300">{bs.biasType}</span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed mb-3">{bs.explanation}</p>
                      <p className="text-xs text-slate-500 italic mb-3 flex gap-1.5"><Quote className="w-3 h-3 shrink-0 mt-0.5" />“{bs.evidence}”</p>
                      <div className="bg-slate-950/60 border-l-2 border-cyan-500 rounded-r-lg px-3 py-2">
                        <p className="text-sm text-cyan-200">{bs.question}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 限制性信念（暗星） */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-purple-400">限制性信念 · 新发现的暗星</span>
                </div>
                <div className="grid gap-3">
                  {activeSession.analysis.limitingBeliefs.map((b) => (
                    <div key={b.id} className={`rounded-xl p-5 border transition-colors ${b.cleared ? 'bg-amber-950/20 border-amber-800/40' : 'bg-purple-950/20 border-purple-800/40 hover:border-purple-600'}`}>
                      <p className={`text-lg font-bold mb-2 ${b.cleared ? 'text-amber-200 line-through decoration-amber-500/50' : 'text-white'}`}>「{b.statement}」</p>
                      <p className="text-sm text-slate-400 leading-relaxed mb-1"><span className="text-slate-500">代价：</span>{b.cost}</p>
                      {b.cleared ? (
                        <p className="text-sm text-amber-300 mt-3 flex items-center gap-2"><Sparkles className="w-4 h-4" /> 已点亮 → 「{b.userReframed || b.reframed}」</p>
                      ) : (
                        <Button onClick={() => setRitualBelief(b)} className="mt-3 py-2 px-4 text-xs bg-purple-800/80 border-purple-600 hover:bg-purple-700">
                          <Sparkles className="w-4 h-4" /> 开始清除仪式
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 多重视角 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">视角切换 · 借他人之眼</span>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {activeSession.analysis.perspectives.map((p, i) => (
                    <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                      <h4 className="text-sm font-bold text-emerald-300 mb-2">{p.persona}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">{p.insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 结语 */}
              <div className="bg-gradient-to-br from-slate-900/80 to-purple-950/40 border border-purple-900/50 rounded-2xl p-6 text-center">
                <p className="text-slate-200 leading-loose font-light">{activeSession.analysis.encouragement}</p>
              </div>
            </div>
          )}
        </div>

        {/* 侧栏：星图 + 档案 */}
        <aside className="w-full lg:w-96 bg-slate-900/90 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col shrink-0 z-10 max-h-[50vh] lg:max-h-none">
          <div className="p-3 border-b border-slate-800 bg-slate-950/50 font-mono text-xs font-bold text-slate-400 flex items-center gap-2">
            <Star size={14} className="text-amber-300" /> 信念星图
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

          <div className="p-3 border-y border-slate-800 bg-slate-950/50 font-mono text-xs font-bold text-slate-400 flex items-center gap-2">
            <History size={14} /> 俯瞰档案
          </div>
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar min-h-[80px]">
            {sessions.length === 0 && <p className="text-slate-600 text-xs italic p-3">还没有任何记录。</p>}
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => { setActiveSessionId(s.id); setPhase('REPORT'); }}
                className={`w-full text-left p-3 mb-2 rounded-lg border transition-colors group ${s.id === activeSessionId && phase === 'REPORT' ? 'bg-purple-950/40 border-purple-700' : 'bg-slate-800/40 border-transparent hover:bg-slate-800'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-200 text-xs truncate">{s.analysis.coreTheme}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 shrink-0" />
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                  <span>{new Date(s.createdAt).toLocaleDateString('zh-CN')}</span>
                  <span>暗星 {s.analysis.limitingBeliefs.filter((b) => !b.cleared).length} · 已点亮 {s.analysis.limitingBeliefs.filter((b) => b.cleared).length}</span>
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
