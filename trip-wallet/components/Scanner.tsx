import React, { useEffect, useRef, useState } from 'react';
import { cameraReader } from '../lib/barcode';
import type { Key } from '../i18n';

interface Props {
  t: (k: Key) => string;
  onCapture: (frame: HTMLCanvasElement) => void;
  onClose: () => void;
}

/** Live camera capture. On a hit we freeze the current video frame and hand it
 *  over as an image — the wallet stores what the camera saw rather than trying
 *  to re-encode a payload whose symbology it may not be able to draw. */
const Scanner: React.FC<Props> = ({ t, onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    let controls: { stop: () => void } | null = null;
    let cancelled = false;

    (async () => {
      try {
        const reader = await cameraReader();
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } } },
          videoRef.current!,
          result => {
            if (!result || done.current) return;
            const video = videoRef.current;
            if (!video) return;
            done.current = true;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')!.drawImage(video, 0, 0);
            controls?.stop();
            onCapture(canvas);
          },
        );
        if (cancelled) controls.stop();
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [onCapture]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      <header className="pad-top flex items-center justify-between px-3 py-2 text-white">
        <button onClick={onClose} className="rounded-full px-3 py-2 text-sm font-medium active:bg-white/10">
          {t('common.close')}
        </button>
        <span className="text-sm font-semibold">{t('scanner.title')}</span>
        <span className="w-16" />
      </header>

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="size-full object-cover"
          playsInline
          muted
          autoPlay
        />
        {!error && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="viewfinder size-64 rounded-3xl border-2 border-white/80" />
          </div>
        )}
        {error && (
          <p className="absolute inset-0 grid place-items-center px-8 text-center text-sm text-white/80">
            {t('scanner.denied')}
          </p>
        )}
      </div>

      <p className="pad-bottom bg-black px-6 py-4 text-center text-sm text-white/70">
        {t('scanner.hint')}
      </p>
    </div>
  );
};

export default Scanner;
