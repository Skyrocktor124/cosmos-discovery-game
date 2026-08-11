// Synthesised instruments.
//
// Chord quality and tempo alone do not make one station sound different from
// another — timbre does far more of that work. Each instrument here is a small
// stack of partials with its own envelope: the inharmonic ratios in `bell`
// are what make it read as a struck bell rather than a held note, and the
// slow attack on `glass` is what makes it float instead of strike.

export type InstrumentName =
  | 'glass' | 'felt' | 'harp' | 'kalimba' | 'bell' | 'reed' | 'air' | 'strings';

/**
 * Instruments that hold a note for as long as it is held. Only these may be
 * used as a pad: a percussive voice decays on its own and leaves a hole in the
 * harmony at every chord change, which is audible and awful.
 */
export type SustainedInstrument = Extract<InstrumentName, 'glass' | 'reed' | 'air' | 'strings'>;

interface Spec {
  /** [frequency ratio, relative gain] — non-integer ratios sound metallic. */
  partials: [number, number][];
  wave: OscillatorType;
  attack: number;
  /** Percussive voices decay on their own; sustained ones hold until note end. */
  sustain: boolean;
  /** Seconds to near-silence for a percussive voice. */
  decay: number;
  release: number;
  /** Breath noise mixed in at note start, 0..1. */
  noise: number;
  detune: number;
}

const SPECS: Record<InstrumentName, Spec> = {
  // Floating, unresolved — never quite lands.
  glass: {
    partials: [[1, 1], [2, 0.22], [3, 0.07]], wave: 'sine',
    attack: 0.35, sustain: true, decay: 0, release: 1.8, noise: 0, detune: 4,
  },
  // Felt piano: soft hammer, long tail.
  felt: {
    partials: [[1, 1], [2, 0.16], [4.1, 0.04]], wave: 'triangle',
    attack: 0.012, sustain: false, decay: 2.4, release: 0.4, noise: 0.05, detune: 2,
  },
  // Plucked string, warm and quick.
  harp: {
    partials: [[1, 1], [2, 0.28], [3, 0.1]], wave: 'triangle',
    attack: 0.006, sustain: false, decay: 1.5, release: 0.3, noise: 0.03, detune: 3,
  },
  // Bright and bouncy, the only cheerful voice here.
  kalimba: {
    partials: [[1, 1], [3.01, 0.3]], wave: 'sine',
    attack: 0.004, sustain: false, decay: 0.85, release: 0.2, noise: 0.04, detune: 0,
  },
  // Inharmonic partials = struck bell; the long tail reads as memory.
  bell: {
    partials: [[1, 1], [2.76, 0.34], [5.4, 0.1]], wave: 'sine',
    attack: 0.005, sustain: false, decay: 3.4, release: 0.5, noise: 0, detune: 0,
  },
  // Reedy and slightly harsh — the one voice allowed an edge.
  reed: {
    partials: [[1, 1], [2, 0.45], [3, 0.28], [5, 0.1]], wave: 'sawtooth',
    attack: 0.05, sustain: true, decay: 0, release: 0.3, noise: 0, detune: 6,
  },
  // Warm sustained bed — the default pad for anything that needs body.
  strings: {
    partials: [[1, 1], [2, 0.3], [3, 0.12], [4, 0.05]], wave: 'sawtooth',
    attack: 0.9, sustain: true, decay: 0, release: 1.5, noise: 0, detune: 8,
  },
  // Breathy and tired, more air than tone.
  air: {
    partials: [[1, 1], [2, 0.1]], wave: 'sine',
    attack: 0.45, sustain: true, decay: 0, release: 1.3, noise: 0.22, detune: 5,
  },
};

let noiseBuffer: AudioBuffer | null = null;
const getNoise = (ctx: AudioContext): AudioBuffer => {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
};

/**
 * Play one note. `dur` is how long the key is held; a percussive instrument
 * ignores it and rings for its own decay instead.
 */
export const playNote = (
  ctx: AudioContext,
  inst: InstrumentName,
  freq: number,
  time: number,
  dur: number,
  gain: number,
  dest: AudioNode,
): void => {
  const s = SPECS[inst];
  const end = s.sustain ? time + dur + s.release : time + Math.max(dur * 0.4, s.decay);
  // Normalise by the partial stack so a four-partial reed is not simply louder
  // than a two-partial kalimba at the same requested gain.
  const norm = 1 / s.partials.reduce((a, [, l]) => a + l, 0);

  for (let i = 0; i < s.partials.length; i++) {
    const [ratio, level] = s.partials[i];
    const f = freq * ratio;
    if (f > 14000) continue; // above hearing for most listeners; skip the work

    const osc = ctx.createOscillator();
    osc.type = s.wave;
    osc.frequency.value = f;
    osc.detune.value = i % 2 === 0 ? -s.detune : s.detune;

    const g = ctx.createGain();
    const peak = gain * level * norm * 1.35;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(peak, time + s.attack);
    if (s.sustain) {
      g.gain.setValueAtTime(peak, time + dur);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur + s.release);
    } else {
      // Higher partials fade first, the way a real struck note does.
      g.gain.exponentialRampToValueAtTime(0.0001, time + s.decay / (1 + i * 0.6));
    }
    osc.connect(g).connect(dest);
    osc.start(time);
    osc.stop(end + 0.05);
  }

  if (s.noise > 0) {
    const src = ctx.createBufferSource();
    src.buffer = getNoise(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq * 2;
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(gain * s.noise, time + Math.max(0.01, s.attack));
    g.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(0.9, s.sustain ? dur : s.decay));
    src.connect(bp).connect(g).connect(dest);
    src.start(time, Math.random() * 0.5);
    src.stop(end + 0.05);
  }
};
