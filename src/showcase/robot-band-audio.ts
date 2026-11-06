// Sound engine for the Copycat Robot Band.
// Everything runs in the browser with the Web Audio API: no audio files, no server.

export type RoleId = "boom" | "snap" | "tick" | "bass" | "melo";
export type GenreId = "lofi" | "chip" | "bossa" | "boombap" | "house" | "trap" | "reggaeton" | "funk" | "dreamy";

/** One sound a robot has learned. data is mono PCM at `rate` Hz. */
export interface LearnedSound {
  data: Float32Array<ArrayBuffer>;
  rate: number;
  /** Detected pitch in Hz, or null for noisy sounds like a tap or a clap. */
  pitch: number | null;
  label: string;
}

export interface Genre {
  id: GenreId;
  name: string;
  bpm: number;
  swing: number; // 0..0.5 of a step
  /** 16-step patterns: x = hit, o = soft hit. */
  boom: string;
  snap: string;
  tick: string;
  /** Bass rhythm: r = root, f = fifth, o = octave. */
  bass: string;
  /** Four chords (one per bar): semitones above the key and chord tones. */
  chords: { root: number; tones: number[] }[];
  key: number; // MIDI note of the bass key
  leadDensity: number;
  leadSteps: number[]; // steps where the melody may start a note
  tone: number; // master low-pass in Hz
  crackle: number;
  crush: boolean;
  /** How much echo the melody gets, 0 to 1. Defaults to 0.3. */
  echo?: number;
  /** Bass note length in steps. Defaults to 3. */
  bassLen?: number;
}

const M7 = [0, 3, 7, 10];
const D7 = [0, 4, 7, 10];
const MAJ7 = [0, 4, 7, 11];

export const GENRES: Record<GenreId, Genre> = {
  lofi: {
    id: "lofi", name: "Lofi", bpm: 78, swing: 0.2,
    boom: "x......x..x.....", snap: "....x.......x...", tick: "x.o.x.o.x.o.x.oo",
    bass: "r......r..f.....",
    chords: [{ root: 2, tones: M7 }, { root: 7, tones: D7 }, { root: 0, tones: MAJ7 }, { root: 9, tones: M7 }],
    key: 36, leadDensity: 0.55, leadSteps: [0, 2, 3, 6, 8, 10, 11, 14], tone: 3200, crackle: 0.05, crush: false,
  },
  chip: {
    id: "chip", name: "Chiptune", bpm: 132, swing: 0,
    boom: "x...x...x...x...", snap: "....x.......x..x", tick: "x.xxx.xxx.xxx.xx",
    bass: "r.o.r.o.r.o.f.o.",
    chords: [{ root: 9, tones: [0, 3, 7] }, { root: 5, tones: [0, 4, 7] }, { root: 0, tones: [0, 4, 7] }, { root: 7, tones: [0, 4, 7] }],
    key: 36, leadDensity: 0.8, leadSteps: [0, 2, 4, 6, 8, 10, 12, 14], tone: 14000, crackle: 0, crush: true,
  },
  bossa: {
    id: "bossa", name: "Bossa", bpm: 104, swing: 0.08,
    boom: "x..x....x..x....", snap: "x..x..x...x..x..", tick: "oooooooooooooooo",
    bass: "r..f....r..f....",
    chords: [{ root: 9, tones: M7 }, { root: 2, tones: D7 }, { root: 7, tones: MAJ7 }, { root: 0, tones: MAJ7 }],
    key: 36, leadDensity: 0.4, leadSteps: [0, 3, 6, 8, 10, 12, 14], tone: 7000, crackle: 0.012, crush: false,
  },
  boombap: {
    id: "boombap", name: "Boom Bap", bpm: 90, swing: 0.14,
    boom: "x.....x.x.......", snap: "....x.......x...", tick: "x.x.x.x.x.x.x.x.",
    bass: "r.....r.r.....f.",
    chords: [{ root: 9, tones: M7 }, { root: 9, tones: M7 }, { root: 5, tones: MAJ7 }, { root: 7, tones: D7 }],
    key: 36, leadDensity: 0.45, leadSteps: [0, 3, 6, 8, 11, 14], tone: 4200, crackle: 0.03, crush: false, echo: 0.2,
  },
  house: {
    id: "house", name: "House", bpm: 122, swing: 0,
    boom: "x...x...x...x...", snap: "....x.......x...", tick: "..x...x...x...x.",
    bass: "..r...r...r...o.",
    chords: [{ root: 9, tones: M7 }, { root: 5, tones: MAJ7 }, { root: 0, tones: MAJ7 }, { root: 7, tones: [0, 4, 7] }],
    key: 36, leadDensity: 0.6, leadSteps: [0, 2, 4, 6, 8, 10, 12, 14], tone: 9000, crackle: 0, crush: false, echo: 0.35, bassLen: 1.5,
  },
  trap: {
    id: "trap", name: "Trap", bpm: 140, swing: 0,
    boom: "x......x..x.....", snap: "........x.......", tick: "xxxxxxxxxxxx.x.x",
    bass: "r.........r.....",
    chords: [{ root: 9, tones: [0, 3, 7] }, { root: 9, tones: [0, 3, 7] }, { root: 5, tones: [0, 4, 7] }, { root: 4, tones: [0, 4, 7] }],
    key: 33, leadDensity: 0.35, leadSteps: [0, 3, 6, 8, 11, 14], tone: 11000, crackle: 0, crush: false, echo: 0.4, bassLen: 8,
  },
  reggaeton: {
    id: "reggaeton", name: "Reggaeton", bpm: 96, swing: 0,
    boom: "x...x...x...x...", snap: "...x..x....x..x.", tick: "x.x.x.x.x.x.x.x.",
    bass: "r..r..r.r..r..f.",
    chords: [{ root: 9, tones: [0, 3, 7] }, { root: 5, tones: [0, 4, 7] }, { root: 0, tones: [0, 4, 7] }, { root: 7, tones: [0, 4, 7] }],
    key: 36, leadDensity: 0.55, leadSteps: [0, 3, 6, 8, 10, 11, 14], tone: 8000, crackle: 0, crush: false, echo: 0.25, bassLen: 2,
  },
  funk: {
    id: "funk", name: "Funk", bpm: 108, swing: 0.06,
    boom: "x.x....x..x.....", snap: "....x..o....x..o", tick: "xxxxxxxxxxxxxxxx",
    bass: "r.ro..f.r.o..rf.",
    chords: [{ root: 4, tones: [0, 4, 7, 10] }, { root: 4, tones: [0, 4, 7, 10] }, { root: 9, tones: M7 }, { root: 11, tones: D7 }],
    key: 36, leadDensity: 0.5, leadSteps: [0, 2, 3, 6, 8, 10, 11, 14], tone: 7500, crackle: 0, crush: false, echo: 0.15, bassLen: 1.2,
  },
  dreamy: {
    id: "dreamy", name: "Dreamy", bpm: 70, swing: 0.1,
    boom: "x...............", snap: "........x.......", tick: "....o.......o...",
    bass: "r.......f.......",
    chords: [{ root: 0, tones: MAJ7 }, { root: 9, tones: M7 }, { root: 5, tones: MAJ7 }, { root: 7, tones: [0, 2, 7, 10] }],
    key: 36, leadDensity: 0.35, leadSteps: [0, 4, 6, 8, 12], tone: 3600, crackle: 0.015, crush: false, echo: 0.65, bassLen: 7,
  },
};

export interface NoteEvent {
  role: RoleId;
  step: number; // 0..63 across four bars
  vel: number;
  midi?: number;
  len?: number; // in steps
}

export interface Song {
  genre: Genre;
  events: NoteEvent[];
}

export const STEPS = 64;

// Small seeded random so "New tune" can be repeated.
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/** Writes a four-bar song for the genre. The same seed always gives the same tune. */
export function makeSong(genreId: GenreId, seed: number): Song {
  const g = GENRES[genreId];
  const r = rng(seed * 7919 + genreId.length);
  const events: NoteEvent[] = [];
  const pent = [0, 2, 4, 7, 9];
  let last = g.key + 24 + 4; // start the melody around E4
  for (let bar = 0; bar < 4; bar++) {
    const chord = g.chords[bar];
    for (let s = 0; s < 16; s++) {
      const step = bar * 16 + s;
      const drum = (pat: string, role: RoleId) => {
        const c = pat[s];
        if (c === "x" || c === "o") events.push({ role, step, vel: c === "x" ? 1 : 0.5 });
      };
      drum(g.boom, "boom");
      drum(g.snap, "snap");
      drum(g.tick, "tick");
      const b = g.bass[s];
      if (b !== ".") {
        const off = b === "f" ? 7 : b === "o" ? 12 : 0;
        events.push({ role: "bass", step, vel: 1, midi: g.key + chord.root + off, len: g.bassLen ?? (g.id === "chip" ? 1.6 : 3) });
      }
    }
    // Melody: chord tones on strong steps, pentatonic in between, moving in small jumps.
    const pool: number[] = [];
    for (let oct = 48; oct <= 84; oct += 12) {
      for (const t of chord.tones) pool.push(oct + chord.root + t);
      for (const p of pent) pool.push(oct + p);
    }
    const notes = [...new Set(pool)].filter((n) => n >= g.key + 22 && n <= g.key + 43).sort((a, b) => a - b);
    let busyUntil = -1;
    for (const s of g.leadSteps) {
      if (s < busyUntil) continue;
      const strong = s % 8 === 0;
      if (!strong && r() > g.leadDensity) continue;
      if (bar === 3 && s > 10) continue; // breathe at the end of the loop
      const near = notes.filter((n) => Math.abs(n - last) <= (strong ? 7 : 4));
      const chordish = near.filter((n) => chord.tones.includes((((n - g.key - chord.root) % 12) + 12) % 12));
      const choices = strong && chordish.length ? chordish : near.length ? near : notes;
      const midi = choices[Math.floor(r() * choices.length)];
      const len = g.id === "chip" ? 1 + Math.floor(r() * 2) : 1 + Math.floor(r() * 3);
      events.push({ role: "melo", step: bar * 16 + s, vel: strong ? 1 : 0.75, midi, len });
      last = midi;
      busyUntil = s + len;
    }
  }
  return { genre: g, events };
}

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** How each robot plays its sound, so even a table tap fits the job. */
const ROLE_FX: Record<RoleId, { rate: number; type: BiquadFilterType; freq: number; dur: number; gain: number }> = {
  boom: { rate: 0.7, type: "lowpass", freq: 1100, dur: 0.42, gain: 1.4 },
  snap: { rate: 1, type: "highpass", freq: 260, dur: 0.3, gain: 0.85 },
  tick: { rate: 1.5, type: "highpass", freq: 2200, dur: 0.11, gain: 0.55 },
  bass: { rate: 1, type: "lowpass", freq: 750, dur: 0, gain: 1.1 },
  melo: { rate: 1, type: "lowpass", freq: 5200, dur: 0, gain: 0.65 },
};

/** Builds the audio chain on any context (live or offline) and plays steps through it. */
export class BandEngine {
  readonly input: GainNode;
  private tone: BiquadFilterNode;
  private shaper: WaveShaperNode;
  private crackleGain: GainNode;
  private echoIn: GainNode;
  private delay: DelayNode;
  private fb: GainNode;
  private wet: GainNode;
  private buffers = new Map<LearnedSound, AudioBuffer>();
  readonly master: GainNode;

  constructor(readonly ctx: BaseAudioContext, dest: AudioNode, volume = 0.7) {
    this.master = ctx.createGain();
    this.master.gain.value = volume;
    this.input = ctx.createGain();
    this.tone = ctx.createBiquadFilter();
    this.tone.type = "lowpass";
    this.shaper = ctx.createWaveShaper();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.input.connect(this.shaper).connect(this.tone).connect(comp).connect(this.master).connect(dest);

    // A soft echo for the melody robot.
    this.echoIn = ctx.createGain();
    const delay = (this.delay = ctx.createDelay(1));
    const fb = (this.fb = ctx.createGain());
    const wet = (this.wet = ctx.createGain());
    delay.delayTime.value = 0.28;
    fb.gain.value = 0.32;
    wet.gain.value = 0.3;
    this.echoIn.connect(delay).connect(fb).connect(delay);
    delay.connect(wet).connect(this.input);

    // Vinyl dust.
    const n = ctx.sampleRate * 2;
    const dust = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = dust.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() < 0.0009 ? (Math.random() * 2 - 1) : (Math.random() * 2 - 1) * 0.015;
    const src = ctx.createBufferSource();
    src.buffer = dust;
    src.loop = true;
    this.crackleGain = ctx.createGain();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1200;
    src.connect(hp).connect(this.crackleGain).connect(this.master);
    src.start();
  }

  setGenre(g: Genre) {
    const t = this.ctx.currentTime;
    this.tone.frequency.setTargetAtTime(g.tone, t, 0.05);
    this.crackleGain.gain.setTargetAtTime(g.crackle * 4, t, 0.05);
    // Echo of a dotted eighth note, wetter for dreamy styles.
    const e = g.echo ?? 0.3;
    this.delay.delayTime.setTargetAtTime(Math.min(0.95, (60 / g.bpm / 4) * 3), t, 0.05);
    this.fb.gain.setTargetAtTime(0.2 + e * 0.45, t, 0.05);
    this.wet.gain.setTargetAtTime(e, t, 0.05);
    if (g.crush) {
      const c = new Float32Array(1024);
      for (let i = 0; i < c.length; i++) c[i] = Math.round(((i / 1023) * 2 - 1) * 7) / 7;
      this.shaper.curve = c;
    } else {
      this.shaper.curve = null;
    }
  }

  setVolume(v: number) {
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
  }

  private bufferFor(s: LearnedSound) {
    let b = this.buffers.get(s);
    if (!b) {
      b = this.ctx.createBuffer(1, s.data.length, s.rate);
      b.copyToChannel(s.data, 0);
      this.buffers.set(s, b);
    }
    return b;
  }

  /** Plays one robot's sound at `time`. midi sets the note for bass and melody. */
  play(role: RoleId, sound: LearnedSound, time: number, vel = 1, midi?: number, stepDur = 0.2, len = 1) {
    const fx = ROLE_FX[role];
    const src = this.ctx.createBufferSource();
    src.buffer = this.bufferFor(sound);
    let rate = fx.rate;
    if (midi !== undefined) rate = mtof(midi) / (sound.pitch ?? 261.63);
    src.playbackRate.value = Math.min(4, Math.max(0.2, rate));
    const filter = this.ctx.createBiquadFilter();
    filter.type = fx.type;
    filter.frequency.value = fx.freq;
    const amp = this.ctx.createGain();
    const dur = fx.dur || Math.max(0.15, stepDur * len * 0.95);
    const peak = fx.gain * vel;
    amp.gain.setValueAtTime(0, time);
    amp.gain.linearRampToValueAtTime(peak, time + 0.004);
    amp.gain.setValueAtTime(peak, time + dur * 0.7);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.08);
    src.connect(filter).connect(amp).connect(this.input);
    if (role === "melo") amp.connect(this.echoIn);
    src.start(time);
    src.stop(time + dur + 0.1);
  }

  /** Plays every event on one step. Returns the roles that played, for the robot animations. */
  playStep(song: Song, step: number, time: number, sounds: Partial<Record<RoleId, LearnedSound>>, muted: Partial<Record<RoleId, boolean>>) {
    const stepDur = 60 / song.genre.bpm / 4;
    const hits: RoleId[] = [];
    for (const e of song.events) {
      if (e.step !== step) continue;
      const s = sounds[e.role];
      if (!s || muted[e.role]) continue;
      this.play(e.role, s, time, e.vel, e.midi, stepDur, e.len);
      hits.push(e.role);
    }
    return hits;
  }
}

/** Time of a step from the loop start, with swing on the off-beats. */
export function stepTime(genre: Genre, step: number) {
  const d = 60 / genre.bpm / 4;
  return step * d + (step % 2 ? genre.swing * d : 0);
}

/**
 * Cleans a recording: finds the real sound by its loudness envelope (so a mic "pop" or hiss
 * doesn't fool it), trims the silence around it, turns down background hiss, and makes it loud enough.
 */
export function cleanRecording(raw: Float32Array, rate: number): Float32Array<ArrayBuffer> | null {
  const win = Math.max(1, Math.floor(rate * 0.01)); // 10 ms windows
  const n = Math.floor(raw.length / win);
  if (n < 5) return null;
  const env = new Float32Array(n);
  for (let w = 0; w < n; w++) {
    let e = 0;
    for (let i = w * win; i < (w + 1) * win; i++) e += raw[i] * raw[i];
    env[w] = Math.sqrt(e / win);
  }
  const skip = Math.min(n - 1, 4); // ignore the first 40 ms, where mic clicks live
  const sorted = Array.from(env.subarray(skip)).sort((x, y) => x - y);
  const floor = sorted[Math.floor(sorted.length * 0.2)] || 0;
  const loud = sorted[sorted.length - 1];
  if (loud < 0.003 || loud < floor * 2.5) return null;
  const startTh = Math.max(floor * 3, loud * 0.12);
  const endTh = Math.max(floor * 2, loud * 0.05);
  let s = skip;
  while (s < n && env[s] < startTh) s++;
  let e = n - 1;
  while (e > s && env[e] < endTh) e--;
  let a = Math.max(0, s * win - Math.floor(rate * 0.025));
  let b = Math.min(raw.length, (e + 1) * win + Math.floor(rate * 0.15));
  b = Math.min(b, a + Math.floor(rate * 2.5));
  if (b - a < rate * 0.03) return null;

  // Gentle noise gate from the envelope, interpolated per sample.
  const gateAt = (w: number) => {
    const v = env[Math.min(n - 1, Math.max(0, w))];
    return Math.min(1, Math.max(0.12, (v - floor * 1.3) / (floor * 2 + 1e-6)));
  };
  const out = new Float32Array(b - a);
  for (let i = 0; i < out.length; i++) {
    const pos = (a + i) / win - 0.5;
    const w0 = Math.floor(pos);
    const f = pos - w0;
    out[i] = raw[a + i] * (gateAt(w0) * (1 - f) + gateAt(w0 + 1) * f);
  }

  // Normalise to a robust peak (ignores a few stray spikes), with a soft limiter on top.
  const abs: number[] = [];
  for (let i = 0; i < out.length; i += 4) abs.push(Math.abs(out[i]));
  abs.sort((x, y) => x - y);
  const peak = Math.max(abs[Math.floor(abs.length * 0.999)] || 0, 1e-4);
  const g = Math.min(0.85 / peak, 60);
  const fin = Math.floor(rate * 0.005);
  const fout = Math.min(out.length >> 1, Math.floor(rate * 0.05));
  for (let i = 0; i < out.length; i++) {
    let v = out[i] * g;
    if (Math.abs(v) > 0.8) v = Math.sign(v) * (0.8 + 0.2 * Math.tanh((Math.abs(v) - 0.8) / 0.2));
    if (i < fin) v *= i / fin;
    if (i > out.length - fout) v *= (out.length - i) / fout;
    out[i] = v;
  }
  return out;
}

/** Finds the main pitch of a sound with autocorrelation. Returns null when it is just noise. */
export function detectPitch(data: Float32Array, rate: number): number | null {
  const size = Math.min(4096, data.length);
  if (size < 1024) return null;
  // Use the loudest window.
  let best = 0;
  let bestE = 0;
  for (let i = 0; i + size <= data.length; i += size >> 2) {
    let e = 0;
    for (let j = i; j < i + size; j += 4) e += data[j] * data[j];
    if (e > bestE) { bestE = e; best = i; }
  }
  const w = data.subarray(best, best + size);
  const minLag = Math.floor(rate / 1000);
  const maxLag = Math.min(size >> 1, Math.floor(rate / 70));
  let e0 = 0;
  for (let i = 0; i < size - maxLag; i++) e0 += w[i] * w[i];
  if (e0 < 1e-6) return null;
  let bestLag = -1;
  let bestC = 0;
  const corr = new Float32Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    let c = 0;
    let e1 = 0;
    for (let i = 0; i < size - maxLag; i++) {
      c += w[i] * w[i + lag];
      e1 += w[i + lag] * w[i + lag];
    }
    corr[lag] = c / Math.sqrt(e0 * e1 + 1e-12);
  }
  // First strong peak avoids octave mistakes.
  const top = Math.max(...corr.subarray(minLag));
  for (let lag = minLag + 1; lag <= maxLag; lag++) {
    if (corr[lag] > top * 0.9 && corr[lag] >= corr[lag - 1] && corr[lag] >= corr[lag + 1]) { bestLag = lag; bestC = corr[lag]; break; }
  }
  if (bestLag < 0 || bestC < 0.6) return null;
  // Parabolic interpolation for a finer lag.
  const y0 = corr[bestLag - 1], y1 = corr[bestLag], y2 = corr[bestLag + 1];
  const shift = (y0 - y2) / (2 * (y0 - 2 * y1 + y2) || 1);
  return rate / (bestLag + (Number.isFinite(shift) ? shift : 0));
}

/** Built-in sounds, so you can hear the band before using the microphone. */
export function demoSounds(): Record<RoleId, LearnedSound> {
  const rate = 44100;
  const make = (secs: number, f: (t: number, i: number) => number) => {
    const n = Math.floor(rate * secs);
    const d = new Float32Array(n);
    for (let i = 0; i < n; i++) d[i] = f(i / rate, i);
    return d;
  };
  let lp = 0;
  const tap = make(0.3, (t) => {
    lp += ((Math.random() * 2 - 1) - lp) * 0.08;
    return (Math.sin(2 * Math.PI * 170 * t) * 0.8 + lp * 2) * Math.exp(-t * 22);
  });
  let prev = 0;
  const clap = make(0.25, (t) => {
    const n = Math.random() * 2 - 1;
    const hp = n - prev;
    prev = n;
    const bursts = [0, 0.011, 0.023].reduce((a, s) => a + (t >= s ? Math.exp(-(t - s) * (s === 0.023 ? 28 : 140)) : 0), 0);
    return hp * 0.45 * bursts;
  });
  const click = make(0.05, (t) => (Math.random() * 2 - 1) * Math.exp(-t * 160));
  const hum = make(0.7, (t) => {
    const f = 196 * (1 + 0.006 * Math.sin(2 * Math.PI * 5 * t));
    let v = 0;
    for (let h = 1; h <= 8; h++) v += (Math.sin(2 * Math.PI * f * h * t) / h) * (h === 3 || h === 4 ? 1.6 : 1);
    return v * 0.3 * Math.min(1, t * 30) * Math.min(1, (0.7 - t) * 8);
  });
  const ting = make(1.1, (t) => (Math.sin(2 * Math.PI * 880 * t) + 0.3 * Math.sin(2 * Math.PI * 2376 * t) * Math.exp(-t * 6)) * 0.6 * Math.exp(-t * 3.5));
  return {
    boom: { data: tap, rate, pitch: null, label: "table tap" },
    snap: { data: clap, rate, pitch: null, label: "clap" },
    tick: { data: click, rate, pitch: null, label: "pen click" },
    bass: { data: hum, rate, pitch: 196, label: "hum" },
    melo: { data: ting, rate, pitch: 880, label: "glass ting" },
  };
}

/** Renders two loops of the song to a WAV file. */
export async function renderWav(song: Song, sounds: Partial<Record<RoleId, LearnedSound>>, muted: Partial<Record<RoleId, boolean>>): Promise<Blob> {
  const rate = 44100;
  const loop = STEPS * (60 / song.genre.bpm / 4);
  const length = Math.ceil((loop * 2 + 1.5) * rate);
  const ctx = new OfflineAudioContext(2, length, rate);
  const eng = new BandEngine(ctx, ctx.destination, 0.8);
  eng.setGenre(song.genre);
  for (let rep = 0; rep < 2; rep++) {
    for (let s = 0; s < STEPS; s++) eng.playStep(song, s, 0.05 + rep * loop + stepTime(song.genre, s), sounds, muted);
  }
  const buf = await ctx.startRendering();
  const chans = [buf.getChannelData(0), buf.getChannelData(1)];
  const n = buf.length;
  const view = new DataView(new ArrayBuffer(44 + n * 4));
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); view.setUint32(4, 36 + n * 4, true); str(8, "WAVE"); str(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 4, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true);
  str(36, "data"); view.setUint32(40, n * 4, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (const c of chans) {
      const v = Math.max(-1, Math.min(1, c[i]));
      view.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      o += 2;
    }
  }
  return new Blob([view.buffer], { type: "audio/wav" });
}

/** How bright (noisy) a sound is: zero crossings per second. */
function brightness(s: LearnedSound) {
  let z = 0;
  for (let i = 1; i < s.data.length; i++) if ((s.data[i - 1] < 0) !== (s.data[i] < 0)) z++;
  return z / (s.data.length / s.rate);
}

/**
 * Gives each of the recorded clips a job. Sounds with a clear pitch (a voice, a hum, a glass)
 * become the melody and the bass; of the rest, the darkest is the kick, the brightest the hi-hat.
 * Returns the clip index for each role.
 */
export function assignRoles(clips: LearnedSound[]): Record<RoleId, number> {
  const idx = clips.map((_, i) => i);
  const tonal = [...idx].sort((a, b) => {
    const pa = clips[a].pitch ? 1 : 0, pb = clips[b].pitch ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return clips[b].data.length / clips[b].rate - clips[a].data.length / clips[a].rate;
  });
  const [t1, t2] = tonal;
  const hi = (clips[t1].pitch ?? 0) >= (clips[t2].pitch ?? 0) ? t1 : t2;
  const lo = hi === t1 ? t2 : t1;
  const rest = idx.filter((i) => i !== t1 && i !== t2).sort((a, b) => brightness(clips[a]) - brightness(clips[b]));
  return { melo: hi, bass: lo, boom: rest[0], snap: rest[1], tick: rest[2] };
}
