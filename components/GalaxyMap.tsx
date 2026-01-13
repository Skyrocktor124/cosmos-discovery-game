import React from 'react';
import { SectorNode } from '../types';
import { MapPin, CheckCircle2 } from 'lucide-react';

interface GalaxyMapProps {
  nodes: SectorNode[];
  onNodeClick: (node: SectorNode) => void;
  currentNodeId: string | null;
}

const GalaxyMap: React.FC<GalaxyMapProps> = ({ nodes, onNodeClick, currentNodeId }) => {
  return (
    <div className="relative w-full h-full min-h-[50vh] bg-slate-900/20 rounded-2xl border border-slate-800 backdrop-blur-sm overflow-hidden shadow-inner">
      {/* Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{ 
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
        }} 
      />

      {/* Nodes */}
      {nodes.map((node) => (
        <button
          key={node.id}
          onClick={() => onNodeClick(node)}
          className={`absolute group transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 hover:scale-125 focus:outline-none`}
          style={{ 
            left: `${node.x}%`, 
            top: `${node.y}%`,
            zIndex: currentNodeId === node.id ? 20 : 10
          }}
        >
          {/* Node Visual */}
          <div className="relative">
            {/* Glow Effect */}
            <div 
              className={`absolute inset-0 rounded-full blur-md transition-opacity duration-500 ${node.visited ? 'opacity-30' : 'opacity-70 animate-pulse'}`}
              style={{ backgroundColor: node.color, transform: `scale(${node.size * 1.5})` }}
            />
            
            {/* Core */}
            <div 
              className={`relative rounded-full border-2 transition-all duration-300 ${currentNodeId === node.id ? 'border-white' : 'border-transparent'}`}
              style={{ 
                width: `${node.size * 20}px`, 
                height: `${node.size * 20}px`, 
                backgroundColor: node.visited ? '#1e293b' : node.color,
                boxShadow: `0 0 ${node.size * 10}px ${node.color}`
              }}
            >
              {node.visited && (
                <div className="absolute inset-0 flex items-center justify-center">
                   <CheckCircle2 className="w-full h-full p-[2px] text-slate-400 opacity-50" />
                </div>
              )}
            </div>

            {/* Label (Tooltip) */}
            <div className={`absolute left-1/2 -translate-x-1/2 mt-2 w-max max-w-[150px] px-2 py-1 bg-slate-900/90 border border-slate-700 text-xs rounded text-center pointer-events-none transition-all duration-200 opacity-0 group-hover:opacity-100 group-focus:opacity-100 z-30 transform translate-y-2 group-hover:translate-y-0`}>
               {node.visited && node.data ? (
                 <>
                   <span className="block font-bold text-white truncate">{node.data.name}</span>
                   <span className="text-[10px] text-slate-400 uppercase">{node.data.type}</span>
                 </>
               ) : (
                 <span className="text-slate-300 flex items-center gap-1">
                   <MapPin size={10} /> Unknown Signal
                 </span>
               )}
            </div>
          </div>
        </button>
      ))}

      {/* Center Label */}
      <div className="absolute bottom-4 right-4 text-right pointer-events-none">
         <h3 className="text-4xl font-black text-white/5 uppercase tracking-widest">Sector Map</h3>
      </div>
    </div>
  );
};

export default GalaxyMap;