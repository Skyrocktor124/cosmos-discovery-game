// Tiny WebAudio synth for UI/game sound effects.
// No audio assets: every sound is generated from oscillators at play time.

export type SfxName = 'blip' | 'pickup' | 'merge' | 'crash' | 'warp' | 'click';

const MUTE_KEY = 'cosmos-sfx-muted';

interface Recipe {
  type: OscillatorType;
  from: number;   // start frequency (Hz)
  to: number;     // end frequency (Hz)
  duration: number; // seconds
  volume: number;  // 0..1
}

const RECIPES: Record<SfxName, Recipe> = {
  blip:   { type: 'square',   from: 380, to: 540, duration: 0.07, volume: 0.12 },
  pickup: { type: 'sine',     from: 660, to: 1050, duration: 0.11, volume: 0.2 },
  merge:  { type: 'triangle', from: 240, to: 480, duration: 0.13, volume: 0.22 },
  crash:  { type: 'sawtooth', from: 200, to: 45, duration: 0.3, volume: 0.25 },
  warp:   { type: 'sine',     from: 130, to: 780, duration: 0.4, volume: 0.18 },
  click:  { type: 'square',   from: 240, to: 240, duration: 0.035, volume: 0.1 },
};

class Sfx {
  private ctx: AudioContext | null = null;
  private muted: boolean;

  constructor() {
    let m = false;
    try { m = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* ignore */ }
    this.muted = m;
  }

  get isMuted(): boolean { return this.muted; }

  toggle(): boolean {
    this.muted = !this.muted;
    try { localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0'); } catch { /* ignore */ }
    if (!this.muted) this.play('click');
    return this.muted;
  }

  play(name: SfxName): void {
    if (this.muted) return;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      const r = RECIPES[name];
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = r.type;
      osc.frequency.setValueAtTime(r.from, t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, r.to), t0 + r.duration);
      gain.gain.setValueAtTime(r.volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + r.duration);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + r.duration + 0.02);
    } catch { /* audio is best-effort; never break the game */ }
  }
}

export const sfx = new Sfx();
