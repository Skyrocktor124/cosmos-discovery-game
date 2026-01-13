import React from 'react';
import { DiscoveryType } from '../types';

interface VisualizerProps {
  type: DiscoveryType;
  primaryColor: string;
  secondaryColor: string;
  imageUrl?: string;
}

const Visualizer: React.FC<VisualizerProps> = ({ type, primaryColor, secondaryColor, imageUrl }) => {
  
  // Dynamic styles for the generative art
  const containerStyle: React.CSSProperties = {
    background: type === DiscoveryType.STAR 
      ? `radial-gradient(circle at 30% 30%, #fff, ${primaryColor}, ${secondaryColor})`
      : `radial-gradient(circle at 30% 30%, ${primaryColor}, ${secondaryColor}, #000)`,
    boxShadow: `0 0 60px ${primaryColor}40, 0 0 100px ${secondaryColor}20`,
  };

  const atmosphereStyle: React.CSSProperties = {
    background: `linear-gradient(45deg, ${secondaryColor}20, transparent)`,
    boxShadow: `inset -10px -10px 40px rgba(0,0,0,0.8), 0 0 20px ${primaryColor}80`
  };

  // If imageUrl exists, render it
  if (imageUrl) {
    return (
      <div className="relative w-64 h-64 md:w-96 md:h-96 mx-auto animate-float transition-all duration-1000 group">
         <div className="absolute inset-0 rounded-full overflow-hidden shadow-2xl border-4 border-white/10" style={{ boxShadow: `0 0 60px ${primaryColor}40` }}>
            <img src={imageUrl} alt="Celestial Body" className="w-full h-full object-cover" />
         </div>
          {/* Atmosphere Glow Overlay */}
          <div 
            className="absolute -inset-4 rounded-full pointer-events-none mix-blend-screen"
            style={atmosphereStyle}
          />
      </div>
    );
  }

  return (
    <div className="relative w-64 h-64 md:w-96 md:h-96 mx-auto animate-float transition-all duration-1000">
      {/* Main Body */}
      <div 
        className="absolute inset-0 rounded-full transition-all duration-1000 overflow-hidden"
        style={containerStyle}
      >
        {/* Procedural Textures (simulated with CSS shapes) */}
        {type === DiscoveryType.PLANET && (
          <>
             <div className="absolute top-[20%] left-[10%] w-[140%] h-[40%] bg-black/10 -rotate-12 blur-xl rounded-full" />
             <div className="absolute bottom-[20%] right-[10%] w-[80%] h-[30%] bg-black/20 rotate-6 blur-lg rounded-full" />
             <div className="absolute top-[50%] left-[50%] w-[20%] h-[20%] bg-white/10 blur-md rounded-full" />
          </>
        )}
        
        {type === DiscoveryType.NEBULA && (
           <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-50 blur-2xl animate-pulse-glow" />
        )}

        {type === DiscoveryType.ANOMALY && (
           <div className="absolute inset-0 border-4 border-white/20 rounded-full animate-spin duration-[10s]" style={{ borderColor: secondaryColor }} />
        )}
      </div>

      {/* Atmosphere Glow / Ring */}
      <div 
        className="absolute -inset-4 rounded-full pointer-events-none"
        style={atmosphereStyle}
      />
      
      {/* Ring System (Conditional for Variety) */}
      {(type === DiscoveryType.PLANET && Math.random() > 0.5) && (
        <div 
           className="absolute top-[50%] left-[50%] w-[160%] h-[40%] border-[20px] rounded-[50%] -translate-x-1/2 -translate-y-1/2 rotate-12 blur-sm opacity-80"
           style={{ borderColor: `${secondaryColor}66`, borderTopColor: 'transparent', borderBottomColor: 'transparent', zIndex: -1 }}
        />
      )}
    </div>
  );
};

export default Visualizer;