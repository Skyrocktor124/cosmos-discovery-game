import React, { useState } from 'react';
import { Rocket, Eye, ChevronRight } from 'lucide-react';
import Starfield from './components/Starfield';
import CosmosGame from './components/CosmosGame';
import GodsEyeApp from './components/godseye/GodsEyeApp';

type Realm = 'PORTAL' | 'OUTER' | 'INNER';

/**
 * 门户：选择探索方向。
 * 外在宇宙 = 原 Chroma Cosmos 探索游戏；
 * 内在宇宙 = 上帝视角系统（盲点 / 限制性信念 / 清除仪式）。
 */
const App: React.FC = () => {
  const [realm, setRealm] = useState<Realm>('PORTAL');

  if (realm === 'OUTER') return <CosmosGame onExit={() => setRealm('PORTAL')} />;
  if (realm === 'INNER') return <GodsEyeApp onExit={() => setRealm('PORTAL')} />;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 font-sans">
      <Starfield speed={0.2} />

      <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-4xl md:text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-purple-300 to-cyan-400 mb-4">
          CHROMA COSMOS
        </h1>
        <p className="text-slate-400 text-sm md:text-base">
          有两个宇宙等着你探索——一个在外，一个在内。
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl animate-in fade-in zoom-in-95 duration-700">
        {/* 内在宇宙 */}
        <button
          onClick={() => setRealm('INNER')}
          className="group text-left bg-slate-900/70 backdrop-blur border border-purple-800/60 rounded-2xl p-8 hover:border-purple-400 hover:shadow-[0_0_40px_rgba(168,85,247,0.25)] transition-all duration-300 hover:-translate-y-1"
        >
          <div className="w-14 h-14 rounded-xl bg-purple-700/80 border border-purple-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
            <Eye className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            内在宇宙 · 上帝视角
            <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            升维俯瞰你自己的思想：找到思维盲点，挖出限制性信念，
            通过清除仪式把每一颗「暗星」点亮。
          </p>
        </button>

        {/* 外在宇宙 */}
        <button
          onClick={() => setRealm('OUTER')}
          className="group text-left bg-slate-900/70 backdrop-blur border border-slate-700 rounded-2xl p-8 hover:border-cyan-400 hover:shadow-[0_0_40px_rgba(34,211,238,0.2)] transition-all duration-300 hover:-translate-y-1"
        >
          <div className="w-14 h-14 rounded-xl bg-fuchsia-600/80 border border-fuchsia-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
            <Rocket className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            外在宇宙 · 星际探索
            <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            驾驶探索舰 MK-IV 跃迁于程序生成的星区之间，
            发现由 AI 创造的行星、恒星与星云。
          </p>
        </button>
      </div>

      <p className="mt-12 text-[11px] text-slate-600 text-center max-w-md">
        内在宇宙的所有倾诉与分析仅保存在你自己的浏览器（localStorage）中，不会上传到任何服务器。
        它是自我觉察的工具，不能替代专业心理咨询。
      </p>
    </div>
  );
};

export default App;
