import React, { useState, useEffect, useRef } from 'react';
import { Rocket, Zap, MapPin, Database, History, RefreshCw, Radio, LayoutGrid, ArrowLeft, LifeBuoy, Trash2 } from 'lucide-react';
import { DiscoveryType, CelestialBody, PlayerState, LogEntry, SectorNode } from './types';
import { generateDiscovery } from './services/proceduralService';
import { COLORS, INITIAL_FUEL, FUEL_COST_WARP, FUEL_COST_TRAVEL, SCIENCE_REWARD_BASE } from './constants';
import Starfield from './components/Starfield';
import Visualizer from './components/Visualizer';
import Button from './components/Button';
import GalaxyMap from './components/GalaxyMap';

// Icons mapping
const TypeIcon = ({ type }: { type: DiscoveryType }) => {
  switch (type) {
    case DiscoveryType.PLANET: return <MapPin className="w-5 h-5 text-cyan-400" />;
    case DiscoveryType.STAR: return <Zap className="w-5 h-5 text-yellow-400" />;
    case DiscoveryType.NEBULA: return <Radio className="w-5 h-5 text-fuchsia-400" />;
    default: return <Database className="w-5 h-5 text-red-400" />;
  }
};

type ViewMode = 'MAP' | 'SYSTEM';

const SAVE_KEY = 'chroma-cosmos-save-v1';

interface SaveData {
  player: PlayerState;
  sectorNodes: SectorNode[];
  history: CelestialBody[];
}

const loadSave = (): SaveData | null => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (!data.player || !Array.isArray(data.sectorNodes)) return null;
    return data;
  } catch {
    return null;
  }
};

const App: React.FC = () => {
  // Game State
  const [player, setPlayer] = useState<PlayerState>({
    science: 0,
    fuel: INITIAL_FUEL,
    visitedCount: 0,
    currentSector: 'Alpha-01'
  });

  const [viewMode, setViewMode] = useState<ViewMode>('MAP');
  const [sectorNodes, setSectorNodes] = useState<SectorNode[]>([]);
  const [currentBody, setCurrentBody] = useState<CelestialBody | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false); // Warping or Scanning
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<CelestialBody[]>([]);
  const [booted, setBooted] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Helper to add logs
  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message,
      type
    }].slice(-50));
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Generate a new sector
  const generateSector = (sectorName: string) => {
    const numNodes = Math.floor(Math.random() * 4) + 5; // 5-8 nodes
    const newNodes: SectorNode[] = [];
    
    for (let i = 0; i < numNodes; i++) {
      newNodes.push({
        id: crypto.randomUUID(),
        x: Math.floor(Math.random() * 80) + 10, // 10-90%
        y: Math.floor(Math.random() * 80) + 10,
        size: Math.random() * 0.8 + 0.8, // 0.8 - 1.6
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        visited: false
      });
    }
    
    setSectorNodes(newNodes);
    setPlayer(p => ({ ...p, currentSector: sectorName }));
    addLog(`Arrived in ${sectorName}. Scanners detect ${numNodes} signatures.`, 'info');
  };

  // Initial Boot: restore save if present, otherwise start fresh
  useEffect(() => {
    const save = loadSave();
    if (save) {
      setPlayer(save.player);
      setSectorNodes(save.sectorNodes);
      setHistory(save.history || []);
      addLog("System initialized. Save data restored.", 'success');
    } else {
      addLog("System initialized. Holographic Map online.", 'info');
      generateSector('Alpha-01');
    }
    setBooted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save
  useEffect(() => {
    if (!booted) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ player, sectorNodes, history } satisfies SaveData));
    } catch {
      // Storage full or unavailable — play continues without persistence
    }
  }, [booted, player, sectorNodes, history]);

  const handleNewGame = () => {
    if (!window.confirm('Start a new expedition? Current progress will be erased.')) return;
    localStorage.removeItem(SAVE_KEY);
    setPlayer({ science: 0, fuel: INITIAL_FUEL, visitedCount: 0, currentSector: 'Alpha-01' });
    setHistory([]);
    setCurrentBody(null);
    setViewMode('MAP');
    addLog("New expedition launched. All systems nominal.", 'info');
    generateSector('Alpha-01');
  };

  const handleSectorWarp = () => {
    if (player.fuel < FUEL_COST_WARP) {
      addLog("INSUFFICIENT FUEL for Sector Jump.", 'warning');
      return;
    }

    setIsProcessing(true);
    setPlayer(p => ({ ...p, fuel: p.fuel - FUEL_COST_WARP }));
    addLog("Charging Hyperdrive... Jumping to new sector.", 'info');
    setCurrentBody(null);
    setViewMode('MAP');

    setTimeout(() => {
      const newSectorName = `Sector ${Math.floor(Math.random() * 999)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
      generateSector(newSectorName);
      setIsProcessing(false);
    }, 2000);
  };

  const handleNodeClick = async (node: SectorNode) => {
    if (node.visited && node.data) {
      // Re-visit already known node
      setCurrentBody(node.data);
      setViewMode('SYSTEM');
      return;
    }

    // New exploration
    if (player.fuel < FUEL_COST_TRAVEL) {
      addLog("INSUFFICIENT FUEL for intra-system travel.", 'warning');
      return;
    }

    setIsProcessing(true);
    setPlayer(p => ({ ...p, fuel: p.fuel - FUEL_COST_TRAVEL }));
    addLog(`Traveling to unknown signal (${node.color})...`, 'info');

    try {
      // Small delay for travel simulation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const discovery = await generateDiscovery(node.color);
      
      // Update Node with data
      setSectorNodes(prev => prev.map(n => 
        n.id === node.id ? { ...n, visited: true, data: discovery } : n
      ));

      setCurrentBody(discovery);
      setHistory(prev => [discovery, ...prev]);
      setPlayer(p => ({
        ...p,
        visitedCount: p.visitedCount + 1,
        science: p.science + SCIENCE_REWARD_BASE,
      }));

      addLog(`Discovered ${discovery.name}.`, 'success');
      setViewMode('SYSTEM');

    } catch (error) {
      addLog("Navigation error. Signal lost.", 'warning');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefuel = () => {
    if (player.science >= 100) {
      setPlayer(p => ({ ...p, science: p.science - 100, fuel: p.fuel + 50 }));
      addLog("Synthesized fuel from science data.", 'success');
    } else {
      addLog("Insufficient Science Data (Need 100).", 'warning');
    }
  };

  // Escape hatch so the game can never soft-lock: when the player can neither
  // travel nor synthesize fuel, let them deploy solar sails for a small refill.
  const isStranded = player.fuel < FUEL_COST_TRAVEL && player.science < 100;

  const handleEmergencySails = () => {
    setPlayer(p => ({ ...p, fuel: p.fuel + 15 }));
    addLog("Emergency solar sails deployed. Trickle-charging fuel reserves.", 'warning');
  };

  return (
    <div className="relative min-h-screen flex flex-col font-sans">
      <Starfield speed={isProcessing ? 40 : 0.2} />

      {/* Header HUD */}
      <header className="p-4 flex flex-col sm:flex-row justify-between items-center bg-slate-900/80 backdrop-blur-md border-b border-slate-700 z-10 sticky top-0 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-fuchsia-600 rounded-lg shadow-lg shadow-fuchsia-500/20">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">CHROMA COSMOS</h1>
            <p className="text-xs text-slate-400">EXPLORATION VESSEL MK-IV</p>
          </div>
        </div>

        <div className="flex gap-6 text-sm font-mono w-full sm:w-auto justify-between sm:justify-end px-2">
           <div className="flex flex-col items-end">
             <span className="text-slate-400 text-xs uppercase">Sector</span>
             <span className="text-cyan-400 font-bold">{player.currentSector}</span>
           </div>
           <div className="flex flex-col items-end">
             <span className="text-slate-400 text-xs uppercase">Fuel</span>
             <span className={`${player.fuel < 20 ? 'text-red-500 animate-pulse' : 'text-emerald-400'} font-bold`}>
               {player.fuel}%
             </span>
           </div>
           <div className="flex flex-col items-end">
             <span className="text-slate-400 text-xs uppercase">Data</span>
             <span className="text-purple-400 font-bold">{player.science} Units</span>
           </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-grow flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Center Visuals */}
        <div className="flex-grow relative flex flex-col p-4 md:p-8 overflow-y-auto">
          
          {isProcessing ? (
            <div className="absolute inset-0 flex items-center justify-center z-50 bg-slate-950/50 backdrop-blur-sm">
               <div className="text-center animate-pulse">
                <h2 className="text-4xl font-black text-white italic tracking-tighter mb-4">TRAVELLING</h2>
                <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden mx-auto">
                  <div className="h-full bg-cyan-400 animate-[width_1.5s_ease-in-out_infinite]" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          ) : null}

          {viewMode === 'MAP' && (
            <div className="w-full h-full flex flex-col animate-in fade-in zoom-in duration-500">
               <div className="flex justify-between items-center mb-4">
                 <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                   <LayoutGrid className="w-5 h-5 text-cyan-400" /> SECTOR MAP
                 </h2>
                 <span className="text-xs text-slate-500 uppercase tracking-wider">Select a signal to investigate</span>
               </div>
               <div className="flex-grow relative">
                 <GalaxyMap 
                   nodes={sectorNodes} 
                   onNodeClick={handleNodeClick} 
                   currentNodeId={currentBody?.id || null}
                 />
               </div>
            </div>
          )}

          {viewMode === 'SYSTEM' && currentBody && (
            <div className="w-full h-full flex flex-col animate-in slide-in-from-right duration-500">
               <div className="mb-4">
                 <button 
                   onClick={() => setViewMode('MAP')}
                   className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors uppercase font-bold tracking-wider"
                 >
                   <ArrowLeft className="w-4 h-4" /> Return to Map
                 </button>
               </div>

               <div className="flex-grow flex flex-col items-center justify-center">
                  <div className="mb-8 scale-75 md:scale-100 transition-transform relative">
                    <Visualizer 
                        type={currentBody.type} 
                        primaryColor={currentBody.colorPrimary} 
                        secondaryColor={currentBody.colorSecondary}
                        imageUrl={currentBody.imageUrl} 
                      />
                  </div>
                  
                  <div className="bg-slate-900/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 max-w-3xl w-full shadow-2xl">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <TypeIcon type={currentBody.type} />
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{currentBody.type}</span>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white text-center" style={{ textShadow: `0 0 20px ${currentBody.colorPrimary}` }}>
                        {currentBody.name}
                      </h2>
                      <p className="text-slate-300 leading-relaxed mb-6 font-light text-lg text-center">
                        {currentBody.description}
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left bg-slate-950/50 p-4 rounded-xl">
                        <div>
                          <span className="block text-[10px] uppercase text-slate-500 mb-1">Atmosphere</span>
                          <span className="text-sm text-cyan-200">{currentBody.atmosphere}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-slate-500 mb-1">Habitability</span>
                          <span className="text-sm text-green-200">{currentBody.habitability}%</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-slate-500 mb-1">Distance</span>
                          <span className="text-sm text-yellow-200">{currentBody.distanceLightYears} Ly</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-slate-500 mb-1">Resources</span>
                          <span className="text-sm text-fuchsia-200 truncate">{currentBody.resources[0]}</span>
                        </div>
                      </div>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Side Panel: Logs & History */}
        <aside className="w-full md:w-80 bg-slate-900/90 border-l border-slate-800 flex flex-col h-64 md:h-auto overflow-hidden shrink-0 z-20">
          
          {/* Tabs/Section Header */}
          <div className="p-3 border-b border-slate-800 bg-slate-950/50 font-mono text-xs font-bold text-slate-400 flex gap-4">
             <span className="flex items-center gap-2 text-fuchsia-400"><Database size={14} /> SHIP LOG</span>
          </div>

          {/* Console Log */}
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-3 custom-scrollbar">
            {logs.length === 0 && <span className="text-slate-600 italic">No activity recorded.</span>}
            {logs.map((log) => (
              <div key={log.id} className="border-l-2 pl-3 py-1" style={{
                borderColor: log.type === 'warning' ? '#ef4444' : log.type === 'success' ? '#22c55e' : log.type === 'discovery' ? '#d946ef' : '#64748b'
              }}>
                <div className="text-slate-500 mb-0.5">{log.timestamp}</div>
                <div className={
                  log.type === 'warning' ? 'text-red-300' : 
                  log.type === 'success' ? 'text-emerald-300' : 
                  log.type === 'discovery' ? 'text-fuchsia-300' : 'text-slate-300'
                }>{log.message}</div>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>

          {/* Discovery History */}
           <div className="p-3 border-t border-b border-slate-800 bg-slate-950/50 font-mono text-xs font-bold text-slate-400">
             <span className="flex items-center gap-2"><History size={14} /> DATABASE</span>
          </div>
          <div className="h-1/3 min-h-[100px] overflow-y-auto p-2 bg-slate-900">
            {history.map(item => (
              <div key={item.id} className="p-2 mb-2 bg-slate-800/50 rounded flex items-center gap-2 hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => { setCurrentBody(item); setViewMode('SYSTEM'); }}>
                <div className="w-2 h-2 rounded-full" style={{ background: item.colorPrimary }}></div>
                <div className="overflow-hidden">
                  <div className="font-bold text-slate-200 truncate text-xs">{item.name}</div>
                  <div className="text-[10px] text-slate-500 uppercase">{item.type}</div>
                </div>
              </div>
            ))}
          </div>

        </aside>
      </main>

      {/* Footer Controls */}
      <footer className="p-4 bg-slate-900 border-t border-slate-800 z-10 sticky bottom-0">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            onClick={handleSectorWarp} 
            isLoading={isProcessing} 
            disabled={player.fuel < FUEL_COST_WARP}
            className="w-full sm:flex-1 max-w-xs shadow-[0_0_15px_rgba(217,70,239,0.2)]"
          >
            <Rocket className="w-5 h-5" />
            Jump to New Sector (-{FUEL_COST_WARP} Fuel)
          </Button>
          
          <Button
             variant="secondary"
             onClick={handleRefuel}
             disabled={player.science < 100}
             className="w-full sm:flex-1 max-w-xs"
          >
             <RefreshCw className="w-5 h-5" />
             Synthesize Fuel (-100 Data)
          </Button>

          {isStranded && (
            <Button
               variant="secondary"
               onClick={handleEmergencySails}
               className="w-full sm:flex-1 max-w-xs border-amber-500 text-amber-300 animate-pulse"
            >
               <LifeBuoy className="w-5 h-5" />
               Deploy Solar Sails (+15 Fuel)
            </Button>
          )}

          <a
            href="./astro-merge/"
            className="text-xs text-slate-500 hover:text-cyan-300 transition-colors uppercase font-bold whitespace-nowrap"
          >
            ▶ Astro Merge
          </a>

          <a
            href="./orbit-dash/"
            className="text-xs text-slate-500 hover:text-fuchsia-300 transition-colors uppercase font-bold whitespace-nowrap"
          >
            ▶ Orbit Dash
          </a>

          <button
            onClick={handleNewGame}
            title="Start a new expedition"
            className="text-slate-600 hover:text-red-400 transition-colors p-2"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;