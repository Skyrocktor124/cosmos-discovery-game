import React, { useRef, useState } from 'react';
import { shareText, ShareResult } from './share';

// Share button with inline confirmation feedback.
const ShareButton: React.FC<{ text: string; url?: string; className?: string }> = ({ text, url, className }) => {
  const [status, setStatus] = useState<'idle' | ShareResult>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onShare = async () => {
    const result = await shareText(text, url ?? window.location.href);
    setStatus(result);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus('idle'), 2000);
  };

  const label = status === 'copied' ? '✓ Link copied!'
    : status === 'shared' ? '✓ Shared!'
    : status === 'failed' ? 'Copy failed'
    : '📤 Share';

  return (
    <button
      data-testid="share-button"
      onClick={onShare}
      onPointerDown={e => e.stopPropagation()}
      onPointerUp={e => e.stopPropagation()}
      className={`px-4 py-2 rounded-lg border border-slate-600 bg-slate-800/80 hover:bg-slate-700 text-xs font-bold uppercase tracking-wider transition-colors pointer-events-auto ${className ?? ''}`}
    >
      {label}
    </button>
  );
};

export default ShareButton;
