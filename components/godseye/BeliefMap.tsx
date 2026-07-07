import React from 'react';
import { LimitingBelief } from '../../types';

interface BeliefMapProps {
  beliefs: LimitingBelief[];
  onSelect: (belief: LimitingBelief) => void;
  selectedId?: string | null;
}

/** 从字符串生成稳定的伪随机数（0~1），保证同一颗星每次都出现在同一位置 */
const hash01 = (str: string, seed: number): number => {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
    h = (h << 13) | (h >>> 19);
  }
  return ((h >>> 0) % 10000) / 10000;
};

/**
 * 信念星图：每条限制性信念是一颗星。
 * 未清除 = 暗星（暗紫色，缓慢脉动的阴影）；已清除 = 被点亮的恒星（金色光晕）。
 */
const BeliefMap: React.FC<BeliefMapProps> = ({ beliefs, onSelect, selectedId }) => {
  const stars = beliefs.map((b) => ({
    belief: b,
    x: 8 + hash01(b.id, 0x9e3779b9) * 84, // 8% ~ 92%
    y: 12 + hash01(b.id, 0x85ebca6b) * 76, // 12% ~ 88%
  }));

  return (
    <div className="relative w-full h-full min-h-[280px] rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden">
      {/* 背景微光 */}
      <div className="absolute inset-0 opacity-40 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(88,28,135,0.25), transparent 60%), radial-gradient(ellipse at 75% 80%, rgba(8,145,178,0.15), transparent 55%)' }}
      />

      {stars.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm px-8 text-center">
          这里还是一片虚空。<br />完成一次俯瞰扫描后，你的信念暗星将出现在这里。
        </div>
      )}

      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* 同批发现的星之间的星座连线 */}
        {stars.map((s, i) => {
          const next = stars[i + 1];
          if (!next) return null;
          return (
            <line
              key={`l-${s.belief.id}`}
              x1={s.x} y1={s.y} x2={next.x} y2={next.y}
              stroke="rgba(148,163,184,0.12)" strokeWidth="0.2" strokeDasharray="1 1.5"
            />
          );
        })}
      </svg>

      {stars.map(({ belief, x, y }) => {
        const lit = belief.cleared;
        const selected = belief.id === selectedId;
        return (
          <button
            key={belief.id}
            onClick={() => onSelect(belief)}
            className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
            style={{ left: `${x}%`, top: `${y}%` }}
            title={belief.statement}
          >
            {/* 光晕 */}
            <span
              className={`absolute inset-0 -m-3 rounded-full blur-md transition-all duration-700 ${
                lit ? 'bg-amber-400/50 animate-pulse-glow' : 'bg-purple-900/60 animate-pulse'
              } ${selected ? 'scale-150' : ''}`}
            />
            {/* 星体 */}
            <span
              className={`relative block w-3.5 h-3.5 rounded-full border transition-all duration-700 ${
                lit
                  ? 'bg-amber-300 border-amber-200 shadow-[0_0_14px_rgba(251,191,36,0.9)]'
                  : 'bg-slate-800 border-purple-800 shadow-[0_0_8px_rgba(88,28,135,0.8)]'
              } ${selected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950' : ''} group-hover:scale-125`}
            />
            {/* 悬停标签 */}
            <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap max-w-[220px] truncate px-2 py-1 rounded bg-slate-900/95 border border-slate-700 text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {lit ? '✦ ' : '● '}{belief.statement}
            </span>
          </button>
        );
      })}

      {/* 图例 */}
      <div className="absolute bottom-2 left-3 flex gap-4 text-[10px] text-slate-500 pointer-events-none">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-800 border border-purple-800" /> 暗星 · 待清除
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.9)]" /> 已点亮
        </span>
      </div>
    </div>
  );
};

export default BeliefMap;
