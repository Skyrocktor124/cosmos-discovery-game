// Generative music engine for the healing radio.
//
// Every station is a real piece, not a drone: a chord progression carried by a
// pad and a bass, a melody improvised fresh each phrase, an arpeggio, and — on
// the fuller sections — a soft pulse. It is all synthesised from oscillators
// and noise at play time, so a station costs nothing to serve, works offline,
// and carries no licensing of anyone else's recording.
//
// Timing uses the standard lookahead pattern: a coarse JS interval wakes up
// often and schedules the next slice of notes against the audio clock, which
// is the only clock accurate enough to keep a rhythm steady.

/** Chord shapes as semitone offsets from the station's tonic. */
const CH = {
  I: [0, 4, 7],
  Imaj7: [0, 4, 7, 11],
  Isus2: [0, 2, 7, 14],
  Isus4: [0, 5, 7, 12],
  ii7: [2, 5, 9, 12],
  iii7: [4, 7, 11, 14],
  IVmaj7: [5, 9, 12, 16],
  IV: [5, 9, 12],
  V7sus: [7, 12, 14, 17],
  V: [7, 11, 14],
  vi7: [9, 12, 16, 19],
  i7: [0, 3, 7, 10],
  i: [0, 3, 7],
  iv7: [5, 8, 12, 15],
  iv: [5, 8, 12],
  bIII: [3, 7, 10, 14],
  bVI: [8, 12, 15, 19],
  bVII: [10, 14, 17, 21],
  v7: [7, 10, 14, 17],
} as const;

export const CHORDS = CH;

export interface MusicProfile {
  /** Tonic in Hz. Voices sit an octave or more above it — small speakers roll
   *  off steeply below ~500 Hz, so a piece voiced at its true root is silent
   *  on the devices most people listen on. */
  root: number;
  /** Semitone offsets the melody may use. */
  scale: number[];
  /** Chord loop, each entry a shape from CH. */
  progression: readonly (readonly number[])[];
  bpm: number;
  /** How many bars each chord is held. */
  barsPerChord: number;
  padWave: OscillatorType;
  leadWave: OscillatorType;
  /** Master lowpass cutoff in Hz. */
  brightness: number;
  /** 0..1 — how much of the phrase grid the melody fills. */
  melodyDensity: number;
  /** Arpeggio spacing in eighth-note steps; 0 disables it. */
  pluckEvery: number;
  /** Soft shaker + heartbeat on the fuller sections. */
  perc: boolean;
  bed: 'none' | 'rain' | 'waves';
  /** Swell period in seconds — the breathing ring uses this too. */
  breath: number;
  /** Base loudness of the station, 0..1. */
  volume: number;
}

const FADE_IN = 1.4;
const FADE_OUT = 1.8;
const LOOKAHEAD = 0.15;  // seconds of music scheduled ahead of the audio clock
const TICK = 25;         // ms between scheduler wakeups
const STEPS_PER_BAR = 8; // eighth notes
const BARS_PER_SECTION = 4; // ~15s per section at these tempos
const SECTIONS = 4;

/** Section names, in order — surfaced to the UI so the piece reads as composed. */
export const SECTION_NAMES = ['起', '承', '转', '合'] as const;

const noteHz = (root: number, semitones: number): number => root * Math.pow(2, semitones / 12);

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

const makeNoiseBuffer = (ctx: AudioContext): AudioBuffer => {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
};

/** Which voices play in each of the four sections — this is the arrangement. */
const arrangement = (section: number) => ({
  pad: true,
  bass: true,
  pluck: section >= 1,
  melody: section >= 1,
  perc: section === 2,
  // 起 states the harmony bare; 转 is the fullest; 合 thins out again.
  melodyScale: section === 1 ? 0.65 : section === 2 ? 1 : section === 3 ? 0.5 : 0,
});

export class MusicEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private wet: GainNode | null = null;
  private meter: AnalyserNode | null = null;
  private noise: AudioBuffer | null = null;
  private held: AudioScheduledSourceNode[] = [];
  private ticker: ReturnType<typeof setInterval> | null = null;

  private profile: MusicProfile | null = null;
  private volume = 0.85;
  private playing = false;

  private step = 0;          // eighth notes since the piece began
  private nextStepTime = 0;  // audio-clock time of that step
  private phrase = new Map<number, number>(); // step-in-phrase → semitone
  private lastDegree = 0;

  get isPlaying(): boolean { return this.playing; }

  /**
   * Whether sound is really coming out. A station opened from a shared link
   * has no user gesture behind it, so the browser leaves the context
   * suspended — the UI must not claim to be playing in that case.
   */
  get isAudible(): boolean { return this.playing && this.ctx?.state === 'running'; }

  /** Bar the piece is on, and which of 起/承/转/合 is playing. */
  get position(): { bar: number; section: number } {
    const bar = Math.floor(this.step / STEPS_PER_BAR);
    return { bar, section: Math.floor(bar / BARS_PER_SECTION) % SECTIONS };
  }

  /** Current output loudness, 0..1 — drives the on-screen level meter. */
  getLevel(): number {
    const an = this.meter;
    if (!an || !this.playing) return 0;
    const buf = new Float32Array(an.fftSize);
    an.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    return Math.min(1, Math.sqrt(sum / buf.length) * 6);
  }

  /** Must be called from a user gesture — browsers block audio otherwise. */
  start(profile: MusicProfile): void {
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
      this.noise = makeNoiseBuffer(ctx);
      this.step = 0;
      this.phrase.clear();
      this.lastDegree = 0;

      const t0 = ctx.currentTime;

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, t0);
      master.gain.linearRampToValueAtTime(this.target(), t0 + FADE_IN);
      this.master = master;

      // Voices swell independently and occasionally line up; the compressor
      // keeps those moments from clipping so the piece can run loud enough to
      // be heard on a phone speaker.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 20;
      comp.ratio.value = 4;
      comp.attack.value = 0.02;
      comp.release.value = 0.5;
      master.connect(comp).connect(ctx.destination);

      const meter = ctx.createAnalyser();
      meter.fftSize = 1024;
      comp.connect(meter);
      this.meter = meter;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(profile.brightness, t0);
      filter.Q.value = 0.6;
      filter.connect(master);
      this.filter = filter;

      // Feedback delay, timed to a dotted eighth so echoes fall with the pulse.
      const delay = ctx.createDelay(4);
      delay.delayTime.value = (60 / profile.bpm) * 0.75;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.34;
      const wet = ctx.createGain();
      wet.gain.value = 0.4;
      wet.connect(delay);
      delay.connect(feedback).connect(delay);
      delay.connect(filter);
      this.wet = wet;

      this.buildPadSwell(ctx, profile, t0);
      if (profile.bed !== 'none') this.buildBed(ctx, filter, profile, t0);

      this.nextStepTime = t0 + 0.12;
      this.ticker = setInterval(() => this.schedule(), TICK);
    } catch {
      // Audio is a bonus, never a blocker: the playlist still works silently.
      this.playing = false;
    }
  }

  stop(): void {
    if (this.ticker) { clearInterval(this.ticker); this.ticker = null; }
    this.playing = false;
    const ctx = this.ctx;
    const master = this.master;
    const held = this.held;
    this.master = null;
    this.filter = null;
    this.wet = null;
    this.meter = null;
    this.padSwell = null;
    this.held = [];
    if (!ctx || !master) return;
    try {
      const t0 = ctx.currentTime;
      master.gain.cancelScheduledValues(t0);
      master.gain.setValueAtTime(master.gain.value, t0);
      master.gain.linearRampToValueAtTime(0.0001, t0 + FADE_OUT);
      for (const v of held) {
        try { v.stop(t0 + FADE_OUT + 0.05); } catch { /* already stopped */ }
      }
      setTimeout(() => { try { master.disconnect(); } catch { /* gone */ } }, (FADE_OUT + 0.3) * 1000);
    } catch { /* best effort */ }
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
    return (this.profile?.volume ?? 0.8) * this.volume;
  }

  // ── scheduling ─────────────────────────────────────────────────────────────

  /** Push every step that falls inside the lookahead window onto the audio clock. */
  private schedule(): void {
    const ctx = this.ctx;
    const p = this.profile;
    if (!ctx || !p || !this.playing) return;
    const stepDur = 60 / p.bpm / 2; // eighth notes
    while (this.nextStepTime < ctx.currentTime + LOOKAHEAD) {
      this.playStep(this.step, this.nextStepTime, p);
      this.nextStepTime += stepDur;
      this.step++;
    }
  }

  private playStep(step: number, time: number, p: MusicProfile): void {
    const stepDur = 60 / p.bpm / 2;
    const bar = Math.floor(step / STEPS_PER_BAR);
    const inBar = step % STEPS_PER_BAR;
    const section = Math.floor(bar / BARS_PER_SECTION) % SECTIONS;
    const voices = arrangement(section);
    const chord = p.progression[Math.floor(bar / p.barsPerChord) % p.progression.length];

    // New chord: restate the pad, held for the whole chord.
    if (inBar === 0 && bar % p.barsPerChord === 0) {
      this.playPad(chord, time, stepDur * STEPS_PER_BAR * p.barsPerChord, p);
    }

    // Bass on beats 1 and 3 — root, then the fifth for movement.
    if (voices.bass && (inBar === 0 || inBar === 4)) {
      const semi = chord[0] + (inBar === 4 && bar % 2 === 1 ? 7 : 0);
      this.playBass(semi, time, stepDur * 3.2, p);
    }

    // Arpeggio through the chord tones.
    if (voices.pluck && p.pluckEvery > 0 && step % p.pluckEvery === 0) {
      const idx = Math.floor(step / p.pluckEvery) % chord.length;
      this.playPluck(chord[idx] + 12, time, p);
    }

    // A fresh two-bar melodic phrase, generated as it is needed.
    const phraseStep = step % (STEPS_PER_BAR * 2);
    if (voices.melody && phraseStep === 0) {
      this.phrase = this.makePhrase(chord, p, p.melodyDensity * voices.melodyScale);
    }
    if (voices.melody) {
      const semi = this.phrase.get(phraseStep);
      if (semi !== undefined) this.playMelody(semi, time, stepDur * 2.6, p);
    }

    if (voices.perc && p.perc) {
      if (inBar === 0 || inBar === 4) this.playPulse(time, p);
      if (inBar % 2 === 1) this.playShaker(time);
    }
  }

  /**
   * A two-bar phrase: chord tones land on the strong beats, the rest steps
   * through the scale near where the last phrase left off, so consecutive
   * phrases sound like one line rather than unrelated fragments.
   */
  private makePhrase(chord: readonly number[], p: MusicProfile, density: number): Map<number, number> {
    const out = new Map<number, number>();
    if (density <= 0) return out;
    const scale = p.scale;
    const slots = [0, 3, 6, 8, 11, 14];

    for (const slot of slots) {
      const strong = slot === 0 || slot === 8;
      if (!strong && Math.random() > density) continue;
      if (strong && Math.random() > 0.15 + density) continue;

      let semi: number;
      if (strong) {
        // Land on a chord tone, folded into the scale's octave.
        semi = pick(chord) % 12;
        this.lastDegree = scale.reduce(
          (best, s, i) => (Math.abs(s - semi) < Math.abs(scale[best] - semi) ? i : best), 0);
      } else {
        // Step, mostly by one degree, from wherever the line currently sits.
        const move = pick([-2, -1, -1, 1, 1, 2]);
        this.lastDegree = Math.max(0, Math.min(scale.length - 1, this.lastDegree + move));
        semi = scale[this.lastDegree];
      }
      out.set(slot, semi + 12 * pick([2, 2, 3]));
    }
    return out;
  }

  // ── voices ─────────────────────────────────────────────────────────────────

  private padSwell: GainNode | null = null;

  /** The pad's shared output stage: one slow breath LFO over everything. */
  private buildPadSwell(ctx: AudioContext, p: MusicProfile, t0: number): void {
    if (!this.filter) return;
    const swell = ctx.createGain();
    swell.gain.value = 0.26;
    swell.connect(this.filter);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 1 / p.breath;
    const depth = ctx.createGain();
    depth.gain.value = 0.09;
    lfo.connect(depth).connect(swell.gain);
    lfo.start(t0);
    this.held.push(lfo);
    this.padSwell = swell;
  }

  private playPad(chord: readonly number[], time: number, dur: number, p: MusicProfile): void {
    const ctx = this.ctx;
    const out = this.padSwell;
    if (!ctx || !out) return;
    // Voiced an octave up, so the harmony carries on a phone speaker. Each
    // chord is held past its own length and released slowly, so it overlaps
    // the next one — without that tail the harmony leaves an audible hole at
    // every chord change.
    const tail = dur * 1.2;
    for (let i = 0; i < chord.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = p.padWave;
      osc.frequency.value = noteHz(p.root, chord[i] + 12);
      osc.detune.value = i % 2 === 0 ? -5 : 5;
      const g = ctx.createGain();
      const level = 0.62 / Math.sqrt(chord.length) * (i === 0 ? 1.2 : 0.85);
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(level, time + Math.min(1.2, dur * 0.3));
      g.gain.setValueAtTime(level, time + dur * 0.9);
      g.gain.exponentialRampToValueAtTime(0.0001, time + tail);
      osc.connect(g).connect(out);
      osc.start(time);
      osc.stop(time + tail + 0.1);
    }
  }

  private playBass(semi: number, time: number, dur: number, p: MusicProfile): void {
    const ctx = this.ctx;
    if (!ctx || !this.filter) return;
    const osc = ctx.createOscillator();
    osc.type = 'triangle'; // harmonics keep it present where sine would vanish
    osc.frequency.value = noteHz(p.root, semi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.26, time + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g).connect(this.filter);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  private playPluck(semi: number, time: number, p: MusicProfile): void {
    const ctx = this.ctx;
    if (!ctx || !this.filter) return;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = noteHz(p.root, semi + 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.12, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.7);
    osc.connect(g);
    g.connect(this.filter);
    if (this.wet) g.connect(this.wet);
    osc.start(time);
    osc.stop(time + 0.75);
  }

  private playMelody(semi: number, time: number, dur: number, p: MusicProfile): void {
    const ctx = this.ctx;
    if (!ctx || !this.filter) return;
    const osc = ctx.createOscillator();
    osc.type = p.leadWave;
    osc.frequency.value = noteHz(p.root, semi);

    // A slow, shallow vibrato — enough to sound played rather than triggered.
    const vib = ctx.createOscillator();
    vib.frequency.value = 4.5;
    const vibDepth = ctx.createGain();
    vibDepth.gain.value = 3.5;
    vib.connect(vibDepth).connect(osc.detune);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.26, time + 0.09);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g);
    g.connect(this.filter);
    if (this.wet) g.connect(this.wet);
    osc.start(time);
    vib.start(time);
    osc.stop(time + dur + 0.05);
    vib.stop(time + dur + 0.05);
  }

  /** A soft heartbeat rather than a drum — felt more than heard. */
  private playPulse(time: number, p: MusicProfile): void {
    const ctx = this.ctx;
    if (!ctx || !this.filter) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(noteHz(p.root, 0) * 1.6, time);
    osc.frequency.exponentialRampToValueAtTime(noteHz(p.root, 0) * 0.9, time + 0.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.16, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
    osc.connect(g).connect(this.filter);
    osc.start(time);
    osc.stop(time + 0.25);
  }

  private playShaker(time: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise || !this.filter) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 5000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
    src.connect(hp).connect(g).connect(this.filter);
    src.start(time, Math.random());
    src.stop(time + 0.08);
  }

  /** Filtered noise: fast shimmer for rain, slow sweeping swells for waves. */
  private buildBed(ctx: AudioContext, out: AudioNode, p: MusicProfile, t0: number): void {
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx);
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    const isRain = p.bed === 'rain';
    bp.type = isRain ? 'highpass' : 'bandpass';
    bp.frequency.value = isRain ? 1800 : 420;
    bp.Q.value = isRain ? 0.7 : 1.2;

    const g = ctx.createGain();
    g.gain.value = isRain ? 0.05 : 0.07;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = isRain ? 0.08 : 1 / (p.breath * 0.75);
    const depth = ctx.createGain();
    depth.gain.value = isRain ? 0.012 : 0.03;
    lfo.connect(depth).connect(g.gain);
    lfo.start(t0);

    src.connect(bp).connect(g).connect(out);
    src.start(t0);
    this.held.push(src, lfo);
  }
}

export const radio = new MusicEngine();
