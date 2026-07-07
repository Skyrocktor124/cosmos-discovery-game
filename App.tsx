import React, { useState } from 'react';
import { Rocket, Eye, ArrowRight } from 'lucide-react';
import Starfield from './components/Starfield';
import CosmosGame from './components/CosmosGame';
import GodsEyeApp from './components/godseye/GodsEyeApp';

type Realm = 'PORTAL' | 'OUTER' | 'INNER';

/**
 * 门户：选择探索方向。
 * 设计约定（taste-skill 形状锁）：容器圆角 rounded-2xl，控件 rounded-lg；
 * 主色为琥珀色，紫色只用于「暗星」语义状态，不做装饰。
 */
const App: React.FC = () => {
  const [realm, setRealm] = useState<Realm>('PORTAL');

  if (realm === 'OUTER') return <CosmosGame onExit={() => setRealm('PORTAL')} />;
  if (realm === 'INNER') return <GodsEyeApp onExit={() => setRealm('PORTAL')} />;

  return (
    <div className="relative min-h-[100dvh] font-sans">
      <Starfield speed={0.2} />

      <div className="relative z-10 mx-auto max-w-6xl min-h-[100dvh] flex flex-col justify-center px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">

          {/* 左：宣言 */}
          <div className="lg:col-span-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <p className="text-sm text-slate-400 mb-6">Chroma Cosmos</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-[1.1] text-slate-50 mb-6">
              两个宇宙。
              <br />
              一个在外，
              <br />
              一个<em className="not-italic text-amber-300">在内</em>。
            </h1>
            <p className="text-base text-slate-400 leading-relaxed max-w-[40ch]">
              向外，是由 AI 生成的无尽星区。向内，是你自己的思想星图：盲点、信念，和把暗星点亮的过程。
            </p>
          </div>

          {/* 右：两个入口，主次分明 */}
          <div className="lg:col-span-5 lg:col-start-8 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <button
              onClick={() => setRealm('INNER')}
              className="group text-left rounded-2xl border border-amber-300/30 bg-slate-900/70 backdrop-blur p-7 transition-all duration-300 hover:border-amber-300/70 hover:-translate-y-0.5 active:translate-y-0"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <Eye className="w-5 h-5 text-amber-300" strokeWidth={1.5} />
                    <h2 className="text-lg font-semibold text-slate-50">内在宇宙</h2>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    以上帝视角俯瞰自己的思想，找到盲点与限制性信念，逐颗点亮。
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-amber-300 shrink-0 mt-1 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
              </div>
            </button>

            <button
              onClick={() => setRealm('OUTER')}
              className="group text-left rounded-2xl border border-slate-700/80 bg-slate-900/50 backdrop-blur p-5 transition-all duration-300 hover:border-slate-500 hover:-translate-y-0.5 active:translate-y-0"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <Rocket className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
                  <div>
                    <h2 className="text-base font-medium text-slate-200">外在宇宙</h2>
                    <p className="text-xs text-slate-500 mt-0.5">驾驶探索舰，跃迁于 AI 生成的星区之间</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
              </div>
            </button>

            <p className="text-xs text-slate-500 leading-relaxed px-1 mt-2">
              内在宇宙的倾诉与分析仅保存在你的浏览器本地。它是自我觉察工具，不能替代专业心理咨询。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
