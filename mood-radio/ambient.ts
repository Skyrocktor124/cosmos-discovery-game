// Generative healing soundscape. Every voice is synthesised at play time from
// oscillators and noise buffers — no audio files, no streaming, no bandwidth.
//
// Three layers per station:
//   pad   — a detuned drone that swells and fades on a slow "breath" LFO
//   lead  — sparse random notes from the mood's scale, with a long echo tail
//   bed   — optional rain or ocean texture made from filtered white noise

export interface AudioProfile {
  /**
   * Tonic in Hz. Voices are stacked an octave or more above it: phone and
   * laptop speakers roll off steeply below ~500 Hz, so a station voiced at
   * its true root is inaudible on the devices most people listen on.
   */
  root: number;
  /** Semitone offsets the lead voice may pick from. */
  scale: number[];
  padWave: OscillatorType;
  leadWave: OscillatorType;
  /** Master lowpass cutoff in Hz — lower is warmer/darker. */
  cutoff: number;
  /** Random gap between lead notes, in seconds: [min, max]. */
  noteEvery: [number, number];
  /** Lead note duration in seconds. */
  noteLength: number;
  /** Breath/swell period in seconds — the UI ring uses this too. */
  breath: number;
  bed: 'none' | 'rain' | 'waves';
  /** Base loudness of the station, 0..1. */
  volume: number;
}

const FADE_IN = 1.4;
const FADE_OUT = 1.6;

const noteHz = (root: number, semitones: number): number => root * Math.pow(2, semitones / 12);

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Two seconds of white noise, reused as a looping source for the bed layer. */
const makeNoiseBuffer = (ctx: AudioContext): AudioBuffer => {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
};

export class AmbientRadio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private wet: GainNode | null = null;
  private meter: AnalyserNode | null = null;
  private voices: AudioScheduledSourceNode[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private profile: AudioProfile | null = null;
  private volume = 0.7;
  private playing = false;

  get isPlaying(): boolean { return this.playing; }

  /**
   * Whether sound is really coming out. A station opened from a shared link
   * has no user gesture behind it, so the browser leaves the context
   * suspended — the UI must not claim to be playing in that case.
   */
  get isAudible(): boolean { return this.playing && this.ctx?.state === 'running'; }

  /** Must be called from a user gesture — browsers block audio otherwise. */
  start(profile: AudioProfile): void {
    this.stop();
    try {
      const AC = window.AudioContext
        ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;

      const ctx = this.ctx ?? new AC();
      this.ctx = ctx;
      if (ctx.state === 'suspended') void ctx.resume();
      this.profile = profile;
      this.playing = true;

      const t0 = ctx.currentTime;

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, t0);
      master.gain.linearRampToValueAtTime(this.target(), t0 + FADE_IN);
      this.master = master;

      // Voices swell independently and occasionally line up; the compressor
      // keeps those moments from clipping so the station can run loud enough
      // to be heard on a phone speaker.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 20;
      comp.ratio.value = 4;
      comp.attack.value = 0.02;
      comp.release.value = 0.5;
      master.connect(comp).connect(ctx.destination);

      // Tapped for the on-screen level meter — the honest answer to "is this
      // thing even playing?" when a device is muted or the volume is down.
      const meter = ctx.createAnalyser();
      meter.fftSize = 1024;
      comp.connect(meter);
      this.meter = meter;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(profile.cutoff, t0);
      filter.Q.value = 0.6;
      filter.connect(master);
      this.filter = filter;

      // Feedback delay gives the sparse notes a cathedral-ish tail.
      const delay = ctx.createDelay(4);
      delay.delayTime.value = 0.55;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.42;
      const wet = ctx.createGain();
      wet.gain.value = 0.5;
      wet.connect(delay);
      delay.connect(feedback).connect(delay);
      delay.connect(filter);
      this.wet = wet;

      this.buildPad(ctx, filter, profile, t0);
      if (profile.bed !== 'none') this.buildBed(ctx, filter, profile, t0);
      this.scheduleNote(0.8);
    } catch {
      // Audio is a bonus, never a blocker: the playlist still works silently.
      this.playing = false;
    }
  }

  stop(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.playing = false;
    const ctx = this.ctx;
    const master = this.master;
    const voices = this.voices;
    this.master = null;
    this.filter = null;
    this.wet = null;
    this.meter = null;
    this.voices = [];
    if (!ctx || !master) return;
    try {
      const t0 = ctx.currentTime;
      master.gain.cancelScheduledValues(t0);
      master.gain.setValueAtTime(master.gain.value, t0);
      master.gain.linearRampToValueAtTime(0.0001, t0 + FADE_OUT);
      for (const v of voices) {
        try { v.stop(t0 + FADE_OUT + 0.05); } catch { /* already stopped */ }
      }
      setTimeout(() => { try { master.disconnect(); } catch { /* gone */ } }, (FADE_OUT + 0.3) * 1000);
    } catch { /* best effort */ }
  }

  /** Current output loudness, 0..1 — drives the on-screen level meter. */
  getLevel(): number {
    const an = this.meter;
    if (!an || !this.playing) return 0;
    const buf = new Float32Array(an.fftSize);
    an.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    const rms = Math.sqrt(sum / buf.length);
    return Math.min(1, rms * 6);
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.ctx && this.master) {
      const t0 = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t0);
      this.master.gain.setValueAtTime(this.master.gain.value, t0);
      this.master.gain.linearRampToValueAtTime(Math.max(0.0001, this.target()), t0 + 0.3);
    }
  }

  private target(): number {
    return (this.profile?.volume ?? 0.5) * this.volume;
  }

  /** Detuned drone stack, swelling on the breath LFO. */
  private buildPad(ctx: AudioContext, out: AudioNode, p: AudioProfile, t0: number): void {
    const swell = ctx.createGain();
    swell.gain.value = 0.22;
    swell.connect(out);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 1 / p.breath;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.12;
    lfo.connect(lfoDepth).connect(swell.gain);
    lfo.start(t0);
    this.voices.push(lfo);

    // Voiced from an octave above the root up: octave, two octaves, the fifth
    // between them, and a quiet third octave for air. Detuned a few cents each
    // so the stack breathes instead of sitting still.
    for (const [semi, detune, gain] of [[12, -6, 1], [24, 5, 0.42], [19, 3, 0.3], [36, -3, 0.14]] as const) {
      const osc = ctx.createOscillator();
      osc.type = p.padWave;
      osc.frequency.value = noteHz(p.root, semi);
      osc.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(g).connect(swell);
      osc.start(t0);
      this.voices.push(osc);
    }
  }

  /** Filtered noise: fast shimmer for rain, slow sweeping swells for waves. */
  private buildBed(ctx: AudioContext, out: AudioNode, p: AudioProfile, t0: number): void {
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx);
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    const isRain = p.bed === 'rain';
    bp.type = isRain ? 'highpass' : 'bandpass';
    bp.frequency.value = isRain ? 1800 : 420;
    bp.Q.value = isRain ? 0.7 : 1.2;

    const g = ctx.createGain();
    g.gain.value = isRain ? 0.06 : 0.085;

    // Waves breathe in and out; rain just varies slightly in density.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = isRain ? 0.08 : 1 / (p.breath * 0.75);
    const depth = ctx.createGain();
    depth.gain.value = isRain ? 0.012 : 0.035;
    lfo.connect(depth).connect(g.gain);
    lfo.start(t0);

    src.connect(bp).connect(g).connect(out);
    src.start(t0);
    this.voices.push(src, lfo);
  }

  /** One sparse note, then re-arms itself after a random gap. */
  private scheduleNote(delaySeconds: number): void {
    this.timer = setTimeout(() => {
      const ctx = this.ctx;
      const p = this.profile;
      if (!ctx || !p || !this.playing || !this.filter) return;

      try {
        const t0 = ctx.currentTime;
        // Two to three octaves up — roughly 400–1600 Hz, where small speakers
        // are actually loudest, and where a soft note still reads as gentle.
        const semi = pick(p.scale) + 12 * pick([2, 2, 3]);
        const osc = ctx.createOscillator();
        osc.type = p.leadWave;
        osc.frequency.value = noteHz(p.root, semi);

        const g = ctx.createGain();
        const len = p.noteLength;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.3, t0 + len * 0.35);    // slow bloom
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);   // long tail

        osc.connect(g);
        g.connect(this.filter);
        if (this.wet) g.connect(this.wet);
        osc.start(t0);
        osc.stop(t0 + len + 0.1);
      } catch { /* skip this note */ }

      const [min, max] = p.noteEvery;
      this.scheduleNote(min + Math.random() * (max - min));
    }, delaySeconds * 1000);
  }
}

export const radio = new AmbientRadio();
