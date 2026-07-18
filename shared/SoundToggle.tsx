import React, { useState } from 'react';
import { sfx } from './sfx';

// Small speaker button that mutes/unmutes all game sound effects.
const SoundToggle: React.FC<{ className?: string }> = ({ className }) => {
  const [muted, setMuted] = useState(sfx.isMuted);
  return (
    <button
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
      data-testid="sound-toggle"
      onClick={() => setMuted(sfx.toggle())}
      onPointerDown={e => e.stopPropagation()}
      onPointerUp={e => e.stopPropagation()}
      className={`text-slate-500 hover:text-cyan-300 transition-colors text-base leading-none pointer-events-auto ${className ?? ''}`}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
};

export default SoundToggle;
