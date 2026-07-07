import React, { useState } from 'react';
import { X, Eye, Scale, PenLine, Flame, Sparkles, Quote } from 'lucide-react';
import { LimitingBelief } from '../../types';
import Button from '../Button';

interface ClearingRitualProps {
  belief: LimitingBelief;
  onClose: () => void;
  onCleared: (belief: LimitingBelief) => void;
}

const STEPS = [
  { icon: Eye, title: '直视它', subtitle: '看清这颗暗星的形状与来历' },
  { icon: Scale, title: '审判它', subtitle: '让证据说话，而不是让恐惧说话' },
  { icon: PenLine, title: '改写它', subtitle: '用你自己的手，写下替代它的新信念' },
  { icon: Flame, title: '释放它', subtitle: '用一个真实的行动，点亮这颗星' },
] as const;

/**
 * 清除仪式：四步流程把一条限制性信念从「暗星」变成「亮星」。
 * 关键设计：反驳证据和新信念必须由使用者亲手写下——
 * 认知重构只有出自本人之手才会生效，AI 的版本只是脚手架。
 */
const ClearingRitual: React.FC<ClearingRitualProps> = ({ belief, onClose, onCleared }) => {
  const [step, setStep] = useState(0);
  const [rebuttal, setRebuttal] = useState(belief.userRebuttal || '');
  const [reframed, setReframed] = useState(belief.userReframed || belief.reframed);
  const [igniting, setIgniting] = useState(false);

  const handleIgnite = () => {
    setIgniting(true);
    // 超新星动画结束后才真正标记清除
    setTimeout(() => {
      onCleared({
        ...belief,
        cleared: true,
        clearedAt: new Date().toISOString(),
        userRebuttal: rebuttal.trim(),
        userReframed: reframed.trim(),
      });
    }, 1800);
  };

  const StepIcon = STEPS[step].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-slate-900/95 border border-slate-700 rounded-2xl shadow-[0_0_60px_rgba(88,28,135,0.35)]">

        {/* 超新星点亮动画 */}
        {igniting && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/95 rounded-2xl overflow-hidden">
            <div className="relative">
              <div className="w-6 h-6 rounded-full bg-amber-300 animate-ping" />
              <div className="absolute inset-0 -m-8 rounded-full bg-amber-400/40 blur-xl animate-pulse" />
              <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-amber-200 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <p className="mt-10 text-amber-200 tracking-widest text-sm animate-pulse">暗星正在点亮……</p>
            <p className="mt-2 text-slate-400 text-xs max-w-sm text-center px-6">「{reframed.trim() || belief.reframed}」</p>
          </div>
        )}

        {/* 头部 */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-slate-950/90 backdrop-blur border-b border-slate-800 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-900/60 border border-purple-700">
              <StepIcon className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h3 className="font-bold text-white tracking-wider">
                清除仪式 · {STEPS[step].title}
                <span className="ml-2 text-xs text-slate-500 font-mono">{step + 1} / {STEPS.length}</span>
              </h3>
              <p className="text-xs text-slate-400">{STEPS[step].subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 步骤进度条 */}
        <div className="flex gap-1.5 px-6 pt-4">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= step ? 'bg-gradient-to-r from-purple-500 to-amber-400' : 'bg-slate-800'}`} />
          ))}
        </div>

        <div className="p-6 space-y-5">
          {step === 0 && (
            <>
              <div className="text-center py-4">
                <p className="text-xs uppercase tracking-widest text-purple-400 mb-3">这条信念一直在暗处影响你</p>
                <p className="text-2xl font-bold text-white leading-relaxed">「{belief.statement}」</p>
              </div>
              <div className="grid gap-3">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <span className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">它可能来自哪里</span>
                  <p className="text-sm text-slate-300 leading-relaxed">{belief.origin}</p>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <span className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">它让你付出的代价</span>
                  <p className="text-sm text-red-300/90 leading-relaxed">{belief.cost}</p>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-slate-500 mb-1"><Quote className="w-3 h-3" /> 它在你话语里留下的痕迹</span>
                  <p className="text-sm text-cyan-200/90 italic leading-relaxed">“{belief.evidence}”</p>
                </div>
              </div>
              <Button onClick={() => setStep(1)} className="w-full">
                <Eye className="w-4 h-4" /> 我看见你了
              </Button>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-sm text-slate-400">俯瞰者向这条信念发出质询——逐条读，然后在下面写下<span className="text-white font-bold">反驳它的真实证据</span>（哪怕很小的反例也算）：</p>
              <div className="space-y-2">
                {belief.counterQuestions.map((q, i) => (
                  <div key={i} className="flex gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                    <span className="text-purple-400 font-mono text-sm shrink-0">Q{i + 1}</span>
                    <p className="text-sm text-slate-200 leading-relaxed">{q}</p>
                  </div>
                ))}
              </div>
              <textarea
                value={rebuttal}
                onChange={(e) => setRebuttal(e.target.value)}
                rows={4}
                placeholder="例如：去年那次我以为会搞砸，结果……；其实也有人对我说过……"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-purple-500 focus:outline-none placeholder:text-slate-600 resize-none"
              />
              <Button onClick={() => setStep(2)} disabled={rebuttal.trim().length < 5} className="w-full">
                <Scale className="w-4 h-4" /> 呈上证据
              </Button>
              {rebuttal.trim().length < 5 && <p className="text-center text-[11px] text-slate-600">写下至少一条真实的反例，仪式才能继续。</p>}
            </>
          )}

          {step === 2 && (
            <>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <span className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">俯瞰者建议的新信念（仅供参考，改成你自己的话）</span>
                <p className="text-sm text-amber-200/90 leading-relaxed">「{belief.reframed}」</p>
              </div>
              <p className="text-sm text-slate-400">现在，用<span className="text-white font-bold">你自己的语言</span>写下要替代旧信念的新信念。它要让你读起来觉得「可信」，而不只是「好听」：</p>
              <textarea
                value={reframed}
                onChange={(e) => setReframed(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-amber-700/50 rounded-xl px-4 py-3 text-base text-amber-100 focus:border-amber-500 focus:outline-none resize-none"
              />
              <Button onClick={() => setStep(3)} disabled={reframed.trim().length < 4} className="w-full">
                <PenLine className="w-4 h-4" /> 铭刻新信念
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <div className="text-center py-2">
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">旧信念</p>
                <p className="text-base text-slate-500 line-through decoration-red-500/60">「{belief.statement}」</p>
                <p className="text-xs uppercase tracking-widest text-amber-400 mt-5 mb-2">新信念</p>
                <p className="text-xl font-bold text-amber-100">「{reframed.trim()}」</p>
              </div>
              <div className="bg-gradient-to-br from-purple-950/60 to-slate-950 border border-purple-800/50 rounded-xl p-4">
                <span className="block text-[10px] uppercase tracking-widest text-purple-300 mb-1">封印行动 · 24 小时内完成</span>
                <p className="text-sm text-slate-200 leading-relaxed">{belief.microAction}</p>
                <p className="text-[11px] text-slate-500 mt-2">信念不是被想通的，是被行动改写的。做完这件小事，这次清除才算真正落地。</p>
              </div>
              <Button onClick={handleIgnite} isLoading={igniting} className="w-full bg-gradient-to-r from-purple-600 to-amber-500 border-amber-400/50 hover:from-purple-500 hover:to-amber-400">
                <Flame className="w-4 h-4" /> 点亮这颗星
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClearingRitual;
