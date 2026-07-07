import React, { useState } from 'react';
import { X, Eye, Scale, PenLine, Flame, Sparkles } from 'lucide-react';
import { LimitingBelief } from '../../types';

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
 * 关键设计：反驳证据和新信念必须由使用者亲手写下，
 * 认知重构只有出自本人之手才会生效，AI 的版本只是脚手架。
 */
const ClearingRitual: React.FC<ClearingRitualProps> = ({ belief, onClose, onCleared }) => {
  const [step, setStep] = useState(0);
  const [rebuttal, setRebuttal] = useState(belief.userRebuttal || '');
  const [reframed, setReframed] = useState(belief.userReframed || belief.reframed);
  const [igniting, setIgniting] = useState(false);

  const handleIgnite = () => {
    setIgniting(true);
    // 点亮动画结束后才真正标记清除
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

  const primaryBtn = 'w-full px-6 py-3 rounded-lg bg-amber-300 text-slate-950 font-semibold hover:bg-amber-200 active:translate-y-px transition-all disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-slate-900 border border-slate-700 rounded-2xl">

        {/* 点亮动画 */}
        {igniting && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/95 rounded-2xl overflow-hidden">
            <div className="relative">
              <div className="w-6 h-6 rounded-full bg-amber-300 animate-ping" />
              <div className="absolute inset-0 -m-8 rounded-full bg-amber-400/30 blur-xl animate-pulse" />
            </div>
            <p className="mt-10 text-amber-200 text-sm animate-pulse">暗星正在点亮</p>
            <p className="voice mt-3 text-slate-400 text-sm max-w-sm text-center px-6">
              「{reframed.trim() || belief.reframed}」
            </p>
          </div>
        )}

        {/* 头部 */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-slate-950/90 backdrop-blur border-b border-slate-800 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <StepIcon className="w-5 h-5 text-amber-300" strokeWidth={1.5} />
            <div>
              <h3 className="font-semibold text-slate-100">
                {STEPS[step].title}
                <span className="ml-2 text-xs text-slate-500 font-mono">{step + 1} / {STEPS.length}</span>
              </h3>
              <p className="text-xs text-slate-500">{STEPS[step].subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* 步骤进度：从暗到亮，对应清除的过程 */}
        <div className="flex gap-1.5 px-6 pt-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                i <= step ? 'bg-gradient-to-r from-violet-500 to-amber-300' : 'bg-slate-800'
              }`}
            />
          ))}
        </div>

        <div className="p-6 space-y-5">
          {step === 0 && (
            <>
              <div className="text-center py-4">
                <p className="text-sm text-slate-400 mb-4">这条信念一直在暗处影响你</p>
                <p className="voice text-2xl font-bold text-slate-50 leading-relaxed">「{belief.statement}」</p>
              </div>
              <div className="divide-y divide-slate-800 border-y border-slate-800">
                <div className="py-4">
                  <p className="text-xs text-slate-500 mb-1">它可能来自哪里</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{belief.origin}</p>
                </div>
                <div className="py-4">
                  <p className="text-xs text-slate-500 mb-1">它让你付出的代价</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{belief.cost}</p>
                </div>
                <div className="py-4">
                  <p className="text-xs text-slate-500 mb-1">它在你话语里留下的痕迹</p>
                  <p className="voice text-sm text-slate-400 italic leading-relaxed">"{belief.evidence}"</p>
                </div>
              </div>
              <button onClick={() => setStep(1)} className={primaryBtn}>
                我看见你了
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-sm text-slate-400 leading-relaxed">
                俯瞰者向这条信念发出质询。逐条读完，然后在下面写下<span className="text-slate-100 font-semibold">反驳它的真实证据</span>，哪怕很小的反例也算。
              </p>
              <div className="divide-y divide-slate-800 border-y border-slate-800">
                {belief.counterQuestions.map((q, i) => (
                  <p key={i} className="py-3.5 text-sm text-slate-200 leading-relaxed pl-4 border-l-2 border-amber-300/60 my-0">
                    {q}
                  </p>
                ))}
              </div>
              <textarea
                value={rebuttal}
                onChange={(e) => setRebuttal(e.target.value)}
                rows={4}
                placeholder="例如：去年那次我以为会搞砸，结果按时交付了；其实也有人认可过我。"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-100 focus:border-amber-300/70 focus:outline-none placeholder:text-slate-600 resize-none"
              />
              <button onClick={() => setStep(2)} disabled={rebuttal.trim().length < 5} className={primaryBtn}>
                呈上证据
              </button>
              {rebuttal.trim().length < 5 && (
                <p className="text-center text-xs text-slate-500">写下至少一条真实的反例，仪式才能继续。</p>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="py-2">
                <p className="text-xs text-slate-500 mb-2">俯瞰者建议的新信念，仅供参考</p>
                <p className="voice text-base text-slate-300 leading-relaxed border-l-2 border-slate-700 pl-4">
                  「{belief.reframed}」
                </p>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                现在，用<span className="text-slate-100 font-semibold">你自己的语言</span>写下要替代旧信念的新信念。它要让你读起来觉得「可信」，而不只是「好听」。
              </p>
              <textarea
                value={reframed}
                onChange={(e) => setReframed(e.target.value)}
                rows={3}
                className="voice w-full bg-slate-950 border border-amber-300/40 rounded-lg px-4 py-3 text-base text-amber-100 focus:border-amber-300/80 focus:outline-none resize-none"
              />
              <button onClick={() => setStep(3)} disabled={reframed.trim().length < 4} className={primaryBtn}>
                铭刻新信念
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <div className="text-center py-2">
                <p className="text-xs text-slate-500 mb-2">旧信念</p>
                <p className="voice text-base text-slate-500 line-through decoration-slate-600">「{belief.statement}」</p>
                <p className="text-xs text-amber-300 mt-6 mb-2">新信念</p>
                <p className="voice text-xl font-bold text-amber-100 leading-relaxed">「{reframed.trim()}」</p>
              </div>
              <div className="border-y border-slate-800 py-4">
                <p className="text-xs text-slate-500 mb-1.5">封印行动：24 小时内完成</p>
                <p className="text-sm text-slate-200 leading-relaxed">{belief.microAction}</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  信念不是被想通的，是被行动改写的。做完这件小事，这次清除才算真正落地。
                </p>
              </div>
              <button onClick={handleIgnite} disabled={igniting} className={primaryBtn}>
                点亮这颗星
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClearingRitual;
