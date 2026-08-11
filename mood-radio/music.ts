// Generative music engine for the healing radio.
//
// Every station is a real piece: a chord progression carried by a pad and a
// bass, a melody improvised fresh each phrase, an arpeggio, and — on the
// fuller sections — a soft pulse. It is all synthesised at play time, so a
// station costs nothing to serve, works offline, and carries no licensing of
// anyone else's recording.
//
// What makes one station feel unlike another is deliberately spread across
// four dimensions, not just the chords: the instruments (see instruments.ts),
// the register the melody sits in, the rhythmic grid it plays on, and the
// direction its line tends to move. A sad piece falls; a joyful one climbs.
//
// Timing uses the standard lookahead pattern: a coarse JS interval wakes up
// often and schedules the next slice of notes against the audio clock, which
// is the only clock accurate enough to keep a rhythm steady.

import { playNote, type InstrumentName, type SustainedInstrument } from './instruments';

/** Chord shapes as semitone offsets from the station's tonic. */
const CH = {
  I: [0, 4, 7],
  Imaj7: [0, 4, 7, 11],
  Iadd9: [0, 4, 7, 14],
  Isus2: [0, 2, 7, 14],
  ii7: [2, 5, 9, 12],
  iii7: [4, 7, 11, 14],
  IVmaj7: [5, 9, 12, 16],
  IV: [5, 9, 12],
  IVadd9: [5, 9, 12, 19],
  V7sus: [7, 12, 14, 17],
  V: [7, 11, 14],
  vi7: [9, 12, 16, 19],
  i: [0, 3, 7],
  i7: [0, 3, 7, 10],
  i9: [0, 3, 7, 14],
  iv: [5, 8, 12],
  iv7: [5, 8, 12, 15],
  bIII: [3, 7, 10, 14],
  bVI: [8, 12, 15, 19],
  bVII: [10, 14, 17, 21],
  v7: [7, 10, 14, 17],
} as const;

export const CHORDS = CH;

/** How the melodic line tends to move — the clearest mood cue after timbre. */
export type Contour = 'fall' | 'rise' | 'arc' | 'hover' | 'leap';

/** What the bass does under the harmony. */
export type BassPattern = 'pedal' | 'root13' | 'walk' | 'sparse';

export interface MusicProfile {
  /** Tonic in Hz. Voices sit an octave or more above it — small speakers roll
   *  off steeply below ~500 Hz, so a piece voiced at its true root is silent
   *  on the devices most people listen on. */
  root: number;
  /** Semitone offsets the melody may use. */
  scale: number[];
  progression: readonly (readonly number[])[];
  bpm: number;
  barsPerChord: number;

  /** Restricted to sustaining voices — see SustainedInstrument. */
  pad: SustainedInstrument;
  melody: InstrumentName;
  arp: InstrumentName;
  /** Lowest octave above the tonic the melody may occupy. */
  melodyLow: number;
  /** How many octaves of room the line has above that. */
  melodyRange: number;
  /** Eighth-note positions, within a two-bar phrase, the melody may land on. */
  melodySlots: number[];
  /** 0..1 — how much of that grid actually gets filled. */
  melodyDensity: number;
  contour: Contour;
  bass: BassPattern;
  /** Arpeggio spacing in eighth-note steps; 0 disables it. */
  arpEvery: number;
  /** Delay on off-beats, 0..0.3 of a step — a lilt rather than a straight grid. */
  swing: number;
  /** Soft shaker + heartbeat on the fullest section. */
  perc: boolean;

  /** Master lowpass cutoff in Hz. */
  brightness: number;
  bed: 'none' | 'rain' | 'waves';
  /** Swell period in seconds — the breathing ring uses this too. */
  breath: number;
  volume: number;
}

const FADE_IN = 1.4;
const FADE_OUT = 1.8;
const LOOKAHEAD = 0.15;  // seconds of music scheduled ahead of the audio clock
const TICK = 25;         // ms between scheduler wakeups
const STEPS_PER_BAR = 8; // eighth notes
const BARS_PER_SECTION = 4;
const SECTIONS = 4;

/** Section names, in order — surfaced to the UI so the piece reads as composed. */
export const SECTION_NAMES = ['起', '承', '转', '合'] as const;

/** How each contour prefers to move, in scale degrees. */
const MOVES: Record<Contour, number[]> = {
  fall: [-3, -2, -1, -1, -1, 1],      // the sigh: down more often than up
  rise: [-1, 1, 1, 2, 2, 3],
  arc: [1, 1, 2, -1, -1, -2],         // shaped by position, see makePhrase
  hover: [-1, -1, 1, 1],              // circling, going nowhere
  leap: [-4, -2, 2, 3, 5, -5],
};

const noteHz = (root: number, semitones: number): number => root * Math.pow(2, semitones / 12);

const mod = (a: number, n: number): number => ((a % n) + n) % n;

/**
 * Pitch for a position on the melodic axis. The axis is continuous across
 * octaves, which is the whole point: stepping one degree has to be a step, not
 * a leap into another register, or the contour never becomes audible.
 */
const semitoneAt = (deg: number, p: MusicProfile): number =>
  p.scale[mod(deg, p.scale.length)] + 12 * (p.melodyLow + Math.floor(deg / p.scale.length));

/**
 * Improvise one two-bar phrase, and report where the line ended up so the next
 * phrase can continue from there.
 *
 * Kept pure and exported so the melodic behaviour can be verified directly —
 * measuring contour from rendered audio is confounded by the pad and arpeggio.
 */
export const improvise = (
  chord: readonly number[],
  p: MusicProfile,
  startDegree: number,
  density: number,
): { notes: Map<number, number>; degree: number } => {
  const notes = new Map<number, number>();
  const n = p.scale.length;
  const top = n * p.melodyRange - 1;
  let deg = Math.max(0, Math.min(top, startDegree));
  if (density <= 0) return { notes, degree: deg };

  const chordPCs = new Set(chord.map(c => mod(c, 12)));

  // A line that has run out of room re-enters an octave away, the way a singer
  // takes a breath and starts the phrase again.
  if (p.contour === 'fall' && deg <= 1) deg = Math.min(top, deg + n);
  if (p.contour === 'rise' && deg >= top - 1) deg = Math.max(0, deg - n);

  for (let i = 0; i < p.melodySlots.length; i++) {
    const slot = p.melodySlots[i];
    const strong = slot === 0;
    if (!strong && Math.random() > density) continue;

    if (strong) {
      // Land on a chord tone, but the nearest one — voice-leading, not a jump
      // back to a fixed home position that would cancel the contour.
      let best = deg;
      let bestDist = Infinity;
      for (let d = Math.max(0, deg - n); d <= Math.min(top, deg + n); d++) {
        if (!chordPCs.has(mod(semitoneAt(d, p), 12))) continue;
        const dist = Math.abs(d - deg);
        if (dist < bestDist) { bestDist = dist; best = d; }
      }
      deg = best;
    } else {
      let move = pick(MOVES[p.contour]);
      // An arc climbs through the first half of the phrase and falls back.
      if (p.contour === 'arc') {
        move = i < p.melodySlots.length / 2 ? Math.abs(move) : -Math.abs(move);
      }
      deg = Math.max(0, Math.min(top, deg + move));
    }
    notes.set(slot, semitoneAt(deg, p));
  }
  return { notes, degree: deg };
};

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

const makeNoiseBuffer = (ctx: AudioContext): AudioBuffer => {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
};

/** Which voices play in each of the four sections — this is the arrangement. */
const arrangement = (section: number) => ({
  arp: section >= 1,
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
  private padSwell: GainNode | null = null;
  private lead: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private held: AudioScheduledSourceNode[] = [];
  private ticker: ReturnType<typeof setInterval> | null = null;

  private profile: MusicProfile | null = null;
  private volume = 0.85;
  private playing = false;

  private step = 0;          // eighth notes since the piece began
  private nextStepTime = 0;  // audio-clock time of that step
  private phrase = new Map<number, number>(); // step-in-phrase → semitone
  private degree = 0;        // where the melodic line currently sits

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
      this.degree = Math.floor(profile.scale.length / 2);

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

      // Melody and arpeggio share the delay send; pad and bass stay dry, so
      // the harmony underneath never turns to mush.
      const lead = ctx.createGain();
      lead.connect(filter);
      lead.connect(wet);
      this.lead = lead;

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
    this.lead = null;
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
      this.playStep(this.step, this.nextStepTime, p, stepDur);
      this.nextStepTime += stepDur;
      this.step++;
    }
  }

  private playStep(step: number, time: number, p: MusicProfile, stepDur: number): void {
    const bar = Math.floor(step / STEPS_PER_BAR);
    const inBar = step % STEPS_PER_BAR;
    const section = Math.floor(bar / BARS_PER_SECTION) % SECTIONS;
    const voices = arrangement(section);
    const chord = p.progression[Math.floor(bar / p.barsPerChord) % p.progression.length];
    // Off-beats land fractionally late, which is what a lilt actually is.
    const swung = time + (inBar % 2 === 1 ? p.swing * stepDur : 0);

    if (inBar === 0 && bar % p.barsPerChord === 0) {
      this.playPad(chord, time, stepDur * STEPS_PER_BAR * p.barsPerChord, p);
    }

    this.playBass(chord, bar, inBar, time, stepDur, p);

    if (voices.arp && p.arpEvery > 0 && step % p.arpEvery === 0) {
      const seq = Math.floor(step / p.arpEvery) % chord.length;
      const descending = p.contour === 'fall' || p.contour === 'hover';
      const idx = descending ? chord.length - 1 - seq : seq;
      playNote(this.ctx!, p.arp, noteHz(p.root, chord[idx] + 24), swung,
        stepDur * 1.5, 0.1, this.arpDest());
    }

    const phraseStep = step % (STEPS_PER_BAR * 2);
    if (voices.melody && phraseStep === 0) {
      this.phrase = this.makePhrase(chord, p, p.melodyDensity * voices.melodyScale);
    }
    if (voices.melody) {
      const semi = this.phrase.get(phraseStep);
      if (semi !== undefined) {
        playNote(this.ctx!, p.melody, noteHz(p.root, semi), swung,
          stepDur * 2.4, 0.26, this.arpDest());
      }
    }

    if (voices.perc && p.perc) {
      if (inBar === 0 || inBar === 4) this.playPulse(time, p);
      if (inBar % 2 === 1) this.playShaker(swung);
    }
  }

  private makePhrase(chord: readonly number[], p: MusicProfile, density: number): Map<number, number> {
    const result = improvise(chord, p, this.degree, density);
    this.degree = result.degree;
    return result.notes;
  }

  // ── voices ─────────────────────────────────────────────────────────────────

  private arpDest(): AudioNode {
    return this.lead ?? this.filter!;
  }

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

  /**
   * The pad holds the harmony. Each chord is released past its own length so
   * it overlaps the next — without that tail the harmony leaves an audible
   * hole at every chord change.
   */
  private playPad(chord: readonly number[], time: number, dur: number, p: MusicProfile): void {
    const ctx = this.ctx;
    const out = this.padSwell;
    if (!ctx || !out) return;
    for (let i = 0; i < chord.length; i++) {
      playNote(ctx, p.pad, noteHz(p.root, chord[i] + 12), time, dur * 0.95,
        0.62 / Math.sqrt(chord.length) * (i === 0 ? 1.2 : 0.85), out);
    }
  }

  private playBass(
    chord: readonly number[], bar: number, inBar: number,
    time: number, stepDur: number, p: MusicProfile,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.filter) return;
    const root = chord[0];

    let semi: number | null = null;
    let dur = stepDur * 3.2;
    switch (p.bass) {
      case 'pedal': // one long tone under the whole bar, barely moving
        if (inBar === 0) { semi = root; dur = stepDur * 7.5; }
        break;
      case 'sparse': // downbeat only, left to ring
        if (inBar === 0) { semi = root; dur = stepDur * 5; }
        break;
      case 'root13': // beats 1 and 3
        if (inBar === 0) semi = root;
        else if (inBar === 4) semi = root + (bar % 2 === 1 ? 7 : 0);
        break;
      case 'walk': // moving line, the only bass with momentum
        if (inBar === 0) semi = root;
        else if (inBar === 3) semi = root + 7;
        else if (inBar === 4) semi = root + 12;
        else if (inBar === 6) semi = root + 7;
        if (semi !== null) dur = stepDur * 1.6;
        break;
    }
    if (semi === null) return;

    const osc = ctx.createOscillator();
    osc.type = 'triangle'; // harmonics keep it present where a sine would vanish
    osc.frequency.value = noteHz(p.root, semi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.26, time + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g).connect(this.filter);
    osc.start(time);
    osc.stop(time + dur + 0.05);
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
