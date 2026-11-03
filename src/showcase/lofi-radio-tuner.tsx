"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type RadioScene = "rain" | "night" | "sun" | "waves" | "fire" | "notes" | "pixels" | "keys" | "space";
export type RadioSound = "lofi" | "musicbox" | "chip" | "piano" | "space";

export interface RadioStation {
  /** Frequency in MHz, between 88 and 108. */
  freq: number;
  name: string;
  /** Short line shown under the name, like a genre or vibe. */
  vibe: string;
  /** Main colour of the station. The radio glow and display use it. */
  color: string;
  /** Little animated scene in the window above the dial. */
  scene: RadioScene;
  /** Beats per minute of the generated lofi loop. */
  bpm: number;
  /** Root note of the loop as a MIDI number (57 = A3). */
  root: number;
  /** Which instrument set plays. Defaults to "lofi". */
  sound?: RadioSound;
  /** Hidden stations show a "?" on the dial until you find them, and have a narrower signal. */
  hidden?: boolean;
}

export interface LofiRadioTunerProps {
  /** Frequency the needle starts on (88 to 108). */
  defaultFrequency?: number;
  /** Your own stations. Defaults to the five LofiStack stations. */
  stations?: RadioStation[];
  /** Secret stations hidden in the static. Pass [] to turn them off. */
  hiddenStations?: RadioStation[];
  /** Start volume, 0 to 1. */
  defaultVolume?: number;
  /** Called when the tuned station changes. station is null while you are on static. */
  onTune?: (station: RadioStation | null, frequency: number) => void;
  /** Called the first time each hidden station is found. */
  onFind?: (station: RadioStation, found: number, total: number) => void;
  className?: string;
}

export const DEFAULT_STATIONS: RadioStation[] = [
  { freq: 89.5, name: "Rain Café", vibe: "jazzy beats + rain on the window", color: "#7ec8ff", scene: "rain", bpm: 72, root: 57 },
  { freq: 93.1, name: "Night Drive", vibe: "slow synths under the stars", color: "#b49cff", scene: "night", bpm: 68, root: 53 },
  { freq: 97.7, name: "Sunday Study", vibe: "warm keys for focus", color: "#ffd27a", scene: "sun", bpm: 80, root: 60 },
  { freq: 101.3, name: "Ocean Tapes", vibe: "dusty tape + waves", color: "#5fe0c0", scene: "waves", bpm: 64, root: 55 },
  { freq: 105.9, name: "Fireplace FM", vibe: "crackling fire, sleepy chords", color: "#ff9b6a", scene: "fire", bpm: 60, root: 52 },
];

export const DEFAULT_HIDDEN_STATIONS: RadioStation[] = [
  { freq: 91.3, name: "Music Box", vibe: "a tiny tune from a wind-up box", color: "#ff9ec0", scene: "notes", bpm: 92, root: 64, sound: "musicbox", hidden: true },
  { freq: 95.4, name: "8-bit Arcade", vibe: "chiptune from an old game cabinet", color: "#7cf27c", scene: "pixels", bpm: 112, root: 57, sound: "chip", hidden: true },
  { freq: 99.5, name: "Old Piano Bar", vibe: "late-night keys and soft brushes", color: "#f0c987", scene: "keys", bpm: 76, root: 55, sound: "piano", hidden: true },
  { freq: 103.6, name: "Space Echo", vibe: "floating pads from far away", color: "#8fb8ff", scene: "space", bpm: 56, root: 50, sound: "space", hidden: true },
];

const MIN = 88;
const MAX = 108;
const SWEEP = 300; // degrees the knob turns across the whole band
const LOCK = 0.9; // MHz away from a station where the signal fades out
const HIDDEN_LOCK = 0.45; // hidden stations are harder to catch
const BLEED = 2.6; // MHz: how far a station's music still leaks faintly through the static

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * What the radio hears at a frequency: the station it is tuned to (or the closest one),
 * its signal strength 0..1, and how loud that station's music leaks through the static (bleed).
 */
export function tuneTo(freq: number, stations: RadioStation[]) {
  let closest: RadioStation | null = null;
  let dist = Infinity;
  let best: RadioStation | null = null;
  let strength = 0;
  for (const s of stations) {
    const d = Math.abs(s.freq - freq);
    if (d < dist) { dist = d; closest = s; }
    const raw = clamp(1 - d / (s.hidden ? HIDDEN_LOCK : LOCK), 0, 1);
    const smooth = raw * raw * (3 - 2 * raw);
    if (smooth > strength) { strength = smooth; best = s; }
  }
  const reach = closest?.hidden ? BLEED * 0.6 : BLEED;
  const bleed = closest ? 0.3 * clamp(1 - dist / reach, 0, 1) : 0;
  return { nearest: best ?? closest, strength, bleed };
}

/* ------------------------------------------------------------------ */
/* Sound: everything is generated with the Web Audio API, no files.    */
/* ------------------------------------------------------------------ */

const CHORDS = [
  [0, 4, 7, 11], // maj7
  [-3, 0, 4, 7], // vi7
  [2, 5, 9, 12], // ii7
  [-5, -1, 2, 5], // V7
];
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class RadioEngine {
  ctx: AudioContext;
  master: GainNode;
  music: GainNode;
  tone: BiquadFilterNode;
  stat: GainNode;
  amb: GainNode;
  ambFilter: BiquadFilterNode;
  noise: AudioBuffer;
  station: RadioStation | null = null;
  nextBeat = 0;
  beat = 0;
  timer: ReturnType<typeof setInterval> | undefined;
  lfo: OscillatorNode;
  lfoGain: GainNode;

  constructor() {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = (this.ctx = new Ctx());
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    // White noise used by the static, the ambience and the drums.
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // Music bus: warm low-pass like an old speaker.
    const tone = (this.tone = ctx.createBiquadFilter());
    tone.type = "lowpass";
    tone.frequency.value = 2200;
    this.music = ctx.createGain();
    this.music.gain.value = 0;
    this.music.connect(tone).connect(this.master);

    // Static between stations.
    const stSrc = this.loop();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 0.6;
    this.stat = ctx.createGain();
    this.stat.gain.value = 0;
    stSrc.connect(bp).connect(this.stat).connect(this.master);

    // Ambience (rain, waves, fire hiss) follows the music level.
    const amSrc = this.loop();
    this.ambFilter = ctx.createBiquadFilter();
    this.ambFilter.type = "lowpass";
    this.amb = ctx.createGain();
    this.amb.gain.value = 0;
    amSrc.connect(this.ambFilter).connect(this.amb).connect(this.music);
    // Slow swell for the ocean waves.
    this.lfo = ctx.createOscillator();
    this.lfo.frequency.value = 0.12;
    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.value = 0;
    this.lfo.connect(this.lfoGain).connect(this.amb.gain);
    this.lfo.start();

    this.nextBeat = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 50);
  }

  loop() {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.start();
    return s;
  }

  set(volume: number, strength: number, bleed: number, station: RadioStation | null) {
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(volume, t, 0.05);
    // Far from a station the music is quiet and muffled, like it is coming from another room.
    this.music.gain.setTargetAtTime(Math.max(strength, bleed), t, 0.05);
    this.tone.frequency.setTargetAtTime(380 + strength * 1900, t, 0.05);
    this.stat.gain.setTargetAtTime(Math.pow(1 - strength, 1.4) * 0.22, t, 0.05);
    if (station !== this.station) {
      this.station = station;
      const scene = station?.scene;
      const amb = {
        rain: [1400, 0.22, 0], waves: [520, 0.25, 0.2], fire: [3200, 0.035, 0], night: [600, 0.02, 0], sun: [800, 0.015, 0],
        notes: [900, 0.01, 0], pixels: [800, 0, 0], keys: [700, 0.02, 0], space: [300, 0.06, 0.05],
      } as const;
      const [f, g, l] = scene ? amb[scene] : [800, 0, 0];
      this.ambFilter.frequency.setTargetAtTime(f, t, 0.1);
      this.amb.gain.setTargetAtTime(g, t, 0.1);
      this.lfoGain.gain.setTargetAtTime(l, t, 0.1);
    }
  }

  schedule() {
    const s = this.station;
    const ctx = this.ctx;
    if (!s) { this.nextBeat = Math.max(this.nextBeat, ctx.currentTime + 0.05); return; }
    const eighth = 60 / s.bpm / 2;
    while (this.nextBeat < ctx.currentTime + 0.25) {
      const step = this.beat % 32; // 4 bars of 8 eighth notes
      const swing = step % 2 ? eighth * 0.18 : 0;
      const t = this.nextBeat + swing;
      const chord = CHORDS[Math.floor(step / 8)];
      const note = () => PENTA[Math.floor(Math.random() * PENTA.length)];
      switch (s.sound ?? "lofi") {
        case "musicbox": // no drums, high twinkly notes
          if (step % 8 === 0) chord.forEach((n) => this.pad(hz(s.root - 12 + n), t, eighth * 8, "sine", 0.02));
          if (Math.random() < 0.75) this.pluck(hz(s.root + 12 + note()), t, "sine", 0.06, 0.9);
          break;
        case "chip": // square-wave arpeggios and a punchy beat
          this.pluck(hz(s.root + 12 + chord[step % 4]), t, "square", 0.025, 0.12);
          if (step % 8 === 0) this.pluck(hz(s.root - 12 + chord[0]), t, "square", 0.03, eighth * 7);
          if (step % 4 === 0) this.kick(t);
          if (step % 8 === 4) this.snare(t);
          if (step % 2 === 1) this.hat(t);
          break;
        case "piano": // chord stabs, wandering melody, soft brushes
          if (step % 4 === 0) chord.forEach((n) => this.pluck(hz(s.root + n), t, "triangle", 0.05, 1.4));
          if (Math.random() < 0.4) this.pluck(hz(s.root + 12 + note()), t, "triangle", 0.07, 1);
          if (step % 2 === 1) this.hat(t);
          break;
        case "space": // long floating pads and rare echoing notes
          if (step % 16 === 0) chord.forEach((n) => this.pad(hz(s.root + n), t, eighth * 16, "sine", 0.05));
          if (Math.random() < 0.12) this.pluck(hz(s.root + 24 + note()), t, "sine", 0.04, 2.5);
          break;
        default:
          if (step % 8 === 0) chord.forEach((n) => this.pad(hz(s.root + n), t, eighth * 8));
          if (step % 8 === 0 || step % 8 === 5) this.kick(t);
          if (step % 8 === 4) this.snare(t);
          if (step % 2 === 1) this.hat(t);
          if (Math.random() < 0.3) this.pluck(hz(s.root + 12 + note()), t);
      }
      if (s.scene === "fire" && Math.random() < 0.5) this.pop(t + Math.random() * eighth, 0.25);
      if (s.scene === "night" && step % 4 === 2 && Math.random() < 0.6) this.cricket(t);
      if (Math.random() < 0.12) this.pop(t + Math.random() * eighth, 0.06); // vinyl dust
      this.nextBeat += eighth;
      this.beat++;
    }
  }

  env(t: number, a: number, peak: number, dur: number) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.music);
    return g;
  }

  pad(f: number, t: number, dur: number, type: OscillatorType = "triangle", peak = 0.045) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = (Math.random() - 0.5) * 14; // tape wobble
    o.connect(this.env(t, Math.min(0.4, dur / 3), peak, dur));
    o.start(t);
    o.stop(t + dur + 0.1);
  }

  pluck(f: number, t: number, type: OscillatorType = "sine", peak = 0.07, dur = 0.6) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.connect(this.env(t, 0.01, peak, dur));
    o.start(t);
    o.stop(t + dur + 0.1);
  }

  kick(t: number) {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.15);
    o.connect(this.env(t, 0.005, 0.5, 0.3));
    o.start(t);
    o.stop(t + 0.35);
  }

  burst(t: number, type: BiquadFilterType, f: number, peak: number, dur: number) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const fl = this.ctx.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = f;
    s.connect(fl).connect(this.env(t, 0.003, peak, dur));
    s.start(t, Math.random());
    s.stop(t + dur + 0.05);
  }

  snare(t: number) { this.burst(t, "bandpass", 1800, 0.12, 0.18); }
  hat(t: number) { this.burst(t, "highpass", 7000, 0.035, 0.05); }
  pop(t: number, peak: number) { this.burst(t, "highpass", 2500, peak, 0.012); }

  cricket(t: number) {
    for (let i = 0; i < 3; i++) {
      const o = this.ctx.createOscillator();
      o.frequency.value = 4400;
      o.connect(this.env(t + i * 0.06, 0.005, 0.02, 0.04));
      o.start(t + i * 0.06);
      o.stop(t + i * 0.06 + 0.06);
    }
  }

  close() {
    clearInterval(this.timer);
    this.ctx.close();
  }
}

/* ------------------------------------------------------------------ */

const SCRAMBLE = "▓▒░#*~?/";
function scramble(text: string, strength: number, seed: number) {
  if (strength > 0.85) return text;
  return text
    .split("")
    .map((c, i) => (c === " " ? " " : ((i * 7 + seed) % 10) / 10 > strength ? SCRAMBLE[(i + seed) % SCRAMBLE.length] : c))
    .join("");
}

export default function LofiRadioTuner({
  defaultFrequency = 97.7,
  stations = DEFAULT_STATIONS,
  hiddenStations = DEFAULT_HIDDEN_STATIONS,
  defaultVolume = 0.6,
  onTune,
  onFind,
  className = "",
}: LofiRadioTunerProps) {
  const [freq, setFreqState] = useState(round1(clamp(defaultFrequency, MIN, MAX)));
  const [power, setPower] = useState(false);
  const [volume, setVolume] = useState(clamp(defaultVolume, 0, 1));
  const [dragging, setDragging] = useState(false);
  const engine = useRef<RadioEngine | null>(null);
  const knob = useRef<HTMLDivElement>(null);
  const lastAngle = useRef(0);
  const lastTuned = useRef<RadioStation | null | undefined>(undefined);

  const [found, setFound] = useState<number[]>([]);
  const [party, setParty] = useState(false);
  const all = useMemo(
    () => [...stations, ...hiddenStations.map((h) => ({ ...h, hidden: true }))].sort((a, b) => a.freq - b.freq),
    [stations, hiddenStations],
  );
  const sorted = useMemo(() => all.filter((s) => !s.hidden || found.includes(s.freq)), [all, found]);
  const totalHidden = hiddenStations.length;
  const { nearest, strength, bleed } = tuneTo(freq, all);
  const locked = strength > 0.6 ? nearest : null;
  const color = nearest?.color ?? "#ffd27a";

  const setFreq = useCallback((f: number) => setFreqState(round1(clamp(f, MIN, MAX))), []);

  // Tell the parent when the station changes.
  useEffect(() => {
    if (lastTuned.current !== locked) {
      lastTuned.current = locked;
      onTune?.(locked, freq);
    }
  }, [locked, freq, onTune]);

  // Count hidden stations the first time each one locks in, and celebrate when all are found.
  useEffect(() => {
    if (!power || !locked?.hidden || found.includes(locked.freq)) return;
    // Only counts once you stay on it for a moment, not when the needle just sweeps past.
    const st = locked;
    const t = setTimeout(() => {
      const next = [...found, st.freq];
      setFound(next);
      onFind?.(st, next.length, totalHidden);
      if (next.length === totalHidden) setParty(true);
    }, 700);
    return () => clearTimeout(t);
  }, [power, locked, found, totalHidden, onFind]);

  useEffect(() => {
    if (!party) return;
    const t = setTimeout(() => setParty(false), 3200);
    return () => clearTimeout(t);
  }, [party]);

  // Keep the sound in step with the dial.
  useEffect(() => {
    engine.current?.set(power ? volume * 0.8 : 0, strength, bleed, strength > 0.05 || bleed > 0.01 ? nearest : null);
  }, [power, volume, strength, bleed, nearest]);

  useEffect(() => () => engine.current?.close(), []);

  const togglePower = () => {
    if (!engine.current) {
      try { engine.current = new RadioEngine(); } catch { /* no Web Audio: the radio still works silently */ }
    }
    engine.current?.ctx.resume();
    setPower((p) => !p);
  };

  // Knob: drag around it, scroll on it, or use the keyboard.
  const angleOf = (e: { clientX: number; clientY: number }) => {
    const r = knob.current!.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    knob.current?.setPointerCapture(e.pointerId);
    knob.current?.focus();
    lastAngle.current = angleOf(e);
    setDragging(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const a = angleOf(e);
    let delta = a - lastAngle.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    lastAngle.current = a;
    setFreqState((f) => clamp(f + (delta / SWEEP) * (MAX - MIN), MIN, MAX));
  };
  const onUp = () => {
    setDragging(false);
    setFreqState((f) => round1(f));
  };
  const seek = (dir: 1 | -1) => {
    const list = dir > 0 ? sorted : [...sorted].reverse();
    const hit = list.find((s) => (dir > 0 ? s.freq > freq + 0.05 : s.freq < freq - 0.05));
    setFreq(hit ? hit.freq : (dir > 0 ? sorted[0] : sorted[sorted.length - 1]).freq);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const map: Record<string, () => void> = {
      ArrowRight: () => setFreq(freq + 0.1),
      ArrowUp: () => setFreq(freq + 0.1),
      ArrowLeft: () => setFreq(freq - 0.1),
      ArrowDown: () => setFreq(freq - 0.1),
      PageUp: () => seek(1),
      PageDown: () => seek(-1),
      Home: () => setFreq(MIN),
      End: () => setFreq(MAX),
    };
    if (map[e.key]) { e.preventDefault(); map[e.key](); }
  };

  // Wheel needs a non-passive listener so the page does not scroll.
  useEffect(() => {
    const el = knob.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      setFreqState((f) => round1(clamp(f + (e.deltaY > 0 ? -0.1 : 0.1), MIN, MAX)));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);

  const pct = ((freq - MIN) / (MAX - MIN)) * 100;
  const knobDeg = ((freq - MIN) / (MAX - MIN)) * SWEEP - SWEEP / 2;
  const seed = Math.round(freq * 10);
  const bars = Math.round(strength * 5);
  const live = power && strength > 0.05;
  const scene = nearest?.scene ?? "night";

  return (
    <div
      className={`lrt ${power ? "is-on" : "is-off"} ${className}`}
      style={{ ["--c" as string]: color, ["--s" as string]: String(power ? strength : 0) }}
    >
      <style>{CSS}</style>
      <div className="lrt-glow" aria-hidden />
      <div className="lrt-handle" aria-hidden />
      <div className="lrt-body">
        {/* Scene window */}
        <div className={`lrt-scene sc-${scene}`} aria-hidden style={{ opacity: 0.25 + strength * 0.75 }}>
          <div className="lrt-static" style={{ opacity: power ? (1 - strength) * 0.7 : 0.15 }} />
          {scene === "rain" && Array.from({ length: 18 }, (_, i) => <i key={i} className="drop" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.17) % 1}s` }} />)}
          {scene === "night" && Array.from({ length: 16 }, (_, i) => <i key={i} className="star" style={{ left: `${(i * 41) % 100}%`, top: `${(i * 23) % 70}%`, animationDelay: `${(i * 0.3) % 2}s` }} />)}
          {scene === "night" && <i className="moon" />}
          {scene === "sun" && <><i className="sun" /><i className="cloud" /><i className="cloud c2" /></>}
          {scene === "waves" && <><i className="wave" /><i className="wave w2" /><i className="gull" /></>}
          {scene === "fire" && Array.from({ length: 7 }, (_, i) => <i key={i} className="flame" style={{ left: `${36 + i * 4.5}%`, animationDelay: `${i * 0.13}s`, height: `${40 + ((i * 17) % 30)}%` }} />)}
          {scene === "fire" && <i className="logs" />}
          {scene === "notes" && Array.from({ length: 9 }, (_, i) => <i key={i} className="note" style={{ left: `${8 + i * 10.5}%`, animationDelay: `${(i * 0.37) % 2.4}s` }}>{i % 2 ? "♪" : "♫"}</i>)}
          {scene === "pixels" && <><i className="ground" /><i className="hero" /><i className="coin" /><i className="coin c2" /><i className="block" /></>}
          {scene === "keys" && <><i className="spot" /><i className="piano" /></>}
          {scene === "space" && <>{Array.from({ length: 22 }, (_, i) => <i key={i} className="star" style={{ left: `${(i * 29) % 100}%`, top: `${(i * 37) % 95}%`, animationDelay: `${(i * 0.23) % 2}s` }} />)}<i className="planet" /></>}
        </div>

        {party && (
          <div className="lrt-confetti" aria-hidden>
            {Array.from({ length: 36 }, (_, i) => (
              <i key={i} style={{ left: `${(i * 53) % 100}%`, background: ["#ff9ec0", "#7cf27c", "#f0c987", "#8fb8ff", "#ffd27a"][i % 5], animationDelay: `${(i % 9) * 0.08}s` }} />
            ))}
            <b>All {totalHidden} hidden stations found! ★</b>
          </div>
        )}

        {/* Dial */}
        <div className="lrt-dial" onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setFreq(MIN + ((e.clientX - r.left - 14) / (r.width - 28)) * (MAX - MIN));
        }}>
          <div className="lrt-track">
            {Array.from({ length: 21 }, (_, i) => (
              <span key={i} className={`tick ${i % 4 === 0 ? "big" : ""}`} style={{ left: `${(i / 20) * 100}%` }}>
                {i % 4 === 0 && <b>{MIN + i}</b>}
              </span>
            ))}
            {all.map((s) => {
              const left = `${((s.freq - MIN) / (MAX - MIN)) * 100}%`;
              if (!s.hidden) return <span key={s.freq} className="mark" title={s.name} style={{ left, background: s.color }} />;
              const got = found.includes(s.freq);
              return (
                <span key={s.freq} className={`hmark ${got ? "got" : ""}`} title={got ? s.name : "Hidden station"} style={{ left, color: got ? s.color : undefined }}>
                  {got ? "★" : "?"}
                </span>
              );
            })}
            <span className="needle" style={{ left: `${pct}%` }} />
          </div>
        </div>

        <div className="lrt-row">
          {/* Speaker + display */}
          <div className="lrt-left">
            <div className="lrt-display" aria-live="polite">
              <span className="freq">{freq.toFixed(1)}<small>FM</small></span>
              <span className="name">{power ? (strength > 0.05 && nearest ? scramble(nearest.name, strength, seed) : "~ static ~") : "power off"}</span>
              <span className="vibe">
                {!power
                  ? "press the power button"
                  : locked?.hidden
                    ? `★ ${locked.vibe}`
                    : locked
                      ? locked.vibe
                      : bleed > 0.02 && nearest
                        ? `faint: ${nearest.hidden && !found.includes(nearest.freq) ? "something hidden…" : nearest.name}`
                        : "keep turning the knob…"}
              </span>
              {totalHidden > 0 && (
                <span className={`found ${found.length === totalHidden ? "all" : ""}`} aria-label={`${found.length} of ${totalHidden} hidden stations found`}>
                  ★ {found.length}/{totalHidden}
                </span>
              )}
              <span className="bars" aria-label={`Signal ${bars} of 5`}>
                {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= bars && power ? "on" : ""} style={{ height: 4 + n * 3 }} />)}
              </span>
            </div>
            <div className={`lrt-grille ${live ? "is-live" : ""}`} aria-hidden style={{ animationDuration: `${60 / (nearest?.bpm ?? 70)}s` }} />
          </div>

          {/* Controls */}
          <div className="lrt-controls">
            <div className="lrt-knobwrap">
              <div
                ref={knob}
                className={`lrt-knob ${dragging ? "is-drag" : ""}`}
                role="slider"
                tabIndex={0}
                aria-label="Tuning knob"
                aria-valuemin={MIN}
                aria-valuemax={MAX}
                aria-valuenow={round1(freq)}
                aria-valuetext={`${freq.toFixed(1)} FM${locked ? `, ${locked.name}` : ", static"}`}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                onKeyDown={onKey}
              >
                <span className="cap" style={{ transform: `rotate(${knobDeg}deg)` }}><i /></span>
              </div>
              <span className="lrt-lbl">Tune</span>
            </div>
            <div className="lrt-btns">
              <button type="button" onClick={() => seek(-1)} aria-label="Previous station">◀</button>
              <button type="button" className={`pwr ${power ? "on" : ""}`} onClick={togglePower} aria-pressed={power} aria-label="Power">⏻</button>
              <button type="button" onClick={() => seek(1)} aria-label="Next station">▶</button>
            </div>
            <label className="lrt-vol">
              <span>Vol</span>
              <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Volume" />
            </label>
          </div>
        </div>
      </div>
      <div className="lrt-feet" aria-hidden><i /><i /></div>
    </div>
  );
}

const CSS = `
.lrt{--wood:#b9774a;--wood2:#7a4526;--cream:#f6e7c8;--ink:#2a1a10;position:relative;width:min(560px,92vw);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--ink);user-select:none;-webkit-user-select:none;padding-top:26px}
.lrt-glow{position:absolute;inset:10% -10% -6%;border-radius:50%;background:radial-gradient(closest-side,var(--c),transparent);opacity:calc(.15 + var(--s)*.45);filter:blur(30px);transition:background .6s,opacity .4s;pointer-events:none}
.lrt-handle{position:absolute;top:0;left:50%;width:42%;height:44px;transform:translateX(-50%);border:9px solid var(--wood2);border-bottom:none;border-radius:24px 24px 0 0}
.lrt-body{position:relative;background:linear-gradient(160deg,#cf8b5a,var(--wood) 45%,#9a5c36);border:5px solid var(--wood2);border-radius:26px;padding:16px;box-shadow:inset 0 2px 0 #ffffff40,inset 0 -6px 0 #00000030,0 18px 40px #0007}
.lrt-body:before{content:"";position:absolute;inset:0;border-radius:22px;background:repeating-linear-gradient(100deg,transparent 0 14px,#00000010 14px 16px,transparent 16px 34px);pointer-events:none}
.lrt-scene{position:relative;height:84px;border-radius:12px;overflow:hidden;border:4px solid var(--wood2);background:#151225;transition:opacity .4s}
.lrt-static{position:absolute;inset:-50%;z-index:3;background:repeating-radial-gradient(circle at 30% 40%,#fff3 0 1px,transparent 1px 3px),repeating-linear-gradient(0deg,#ffffff18 0 1px,transparent 1px 3px);animation:lrt-snow .2s steps(3) infinite;transition:opacity .3s}
@keyframes lrt-snow{0%{transform:translate(0,0)}33%{transform:translate(-7%,4%)}66%{transform:translate(5%,-6%)}}
.sc-rain{background:linear-gradient(#24324f,#3d4f74)}
.sc-night{background:linear-gradient(#0d0b2a,#2c2160)}
.sc-sun{background:linear-gradient(#ffcf8a,#ffe9c4)}
.sc-waves{background:linear-gradient(#ffb59a,#9ad7d6 70%)}
.sc-fire{background:radial-gradient(ellipse at 50% 100%,#5a2412,#1a0d0a 70%)}
.lrt-scene i{position:absolute;display:block}
.drop{top:-20%;width:2px;height:14px;background:#a8d8ff;border-radius:2px;animation:lrt-rain .8s linear infinite}
@keyframes lrt-rain{to{transform:translate(-10px,110px)}}
.star{width:3px;height:3px;background:#fff;border-radius:50%;animation:lrt-twinkle 2s ease-in-out infinite}
@keyframes lrt-twinkle{50%{opacity:.2}}
.moon{right:12%;top:14%;width:30px;height:30px;border-radius:50%;box-shadow:-8px 4px 0 0 #fff3c4}
.sun{left:16%;top:18%;width:40px;height:40px;border-radius:50%;background:#ffb347;box-shadow:0 0 30px #ffb347;animation:lrt-pulse 3s ease-in-out infinite}
@keyframes lrt-pulse{50%{box-shadow:0 0 50px #ffcf6a}}
.cloud{left:50%;top:30%;width:70px;height:20px;border-radius:20px;background:#fff;box-shadow:20px -10px 0 -2px #fff;animation:lrt-drift 14s linear infinite}
.cloud.c2{left:10%;top:60%;transform:scale(.7);animation-duration:20s;animation-delay:-8s}
@keyframes lrt-drift{from{translate:-140px}to{translate:260px}}
.wave{left:-50%;bottom:-6px;width:200%;height:34px;background:radial-gradient(ellipse 30px 14px at 30px 0,transparent 98%,#2a8fa0 100%) 0 0/60px 34px repeat-x;animation:lrt-wave 4s linear infinite}
.wave.w2{bottom:-14px;opacity:.7;animation-duration:6s;animation-direction:reverse}
@keyframes lrt-wave{to{transform:translateX(60px)}}
.gull{left:60%;top:22%;width:14px;height:6px;border:2px solid #333;border-bottom:none;border-radius:50% 50% 0 0;animation:lrt-gull 3s ease-in-out infinite}
@keyframes lrt-gull{50%{transform:translate(-20px,6px)}}
.flame{bottom:14px;width:16px;border-radius:50% 50% 30% 30%/70% 70% 30% 30%;background:linear-gradient(#ffe27a,#ff7a3a 60%,#d0361e);transform-origin:bottom;animation:lrt-flick .5s ease-in-out infinite alternate;filter:blur(.4px)}
@keyframes lrt-flick{to{transform:scaleY(.75) scaleX(1.1) skewX(4deg)}}
.logs{left:34%;bottom:6px;width:32%;height:12px;border-radius:6px;background:#5a3420}
.sc-notes{background:linear-gradient(#ffd6e6,#ffeef5)}
.note{bottom:-20px;font-size:20px;color:#d94f86;animation:lrt-float 2.4s ease-in infinite}
@keyframes lrt-float{to{transform:translateY(-110px) rotate(20deg);opacity:0}}
.sc-pixels{background:#140c2e;image-rendering:pixelated}
.ground{left:0;right:0;bottom:0;height:14px;background:repeating-linear-gradient(90deg,#3b8f3b 0 10px,#2d6e2d 10px 20px);animation:lrt-scroll 1s steps(5) infinite}
@keyframes lrt-scroll{to{background-position:-20px 0}}
.hero{left:22%;bottom:14px;width:16px;height:20px;background:#ff5a5a;box-shadow:inset 0 6px 0 #ffd27a;animation:lrt-jump 1s steps(4) infinite}
@keyframes lrt-jump{50%{transform:translateY(-26px)}}
.coin{left:60%;top:24%;width:10px;height:14px;background:#ffd27a;border-radius:3px;animation:lrt-coin 1.2s steps(4) infinite}
.coin.c2{left:75%;top:40%;animation-delay:-.6s}
@keyframes lrt-coin{50%{transform:scaleX(.2)}}
.block{left:45%;top:18%;width:18px;height:18px;background:#c9762b;box-shadow:inset 0 0 0 3px #7a4526}
.sc-keys{background:radial-gradient(ellipse at 50% 0,#4a3520,#120c08 75%)}
.spot{left:30%;top:0;width:40%;height:100%;background:linear-gradient(#fff3c455,transparent);clip-path:polygon(40% 0,60% 0,100% 100%,0 100%)}
.piano{left:8%;right:8%;bottom:0;height:30px;background:repeating-linear-gradient(90deg,#fffaf0 0 13px,#2a1a10 13px 14px);border-top:4px solid #2a1a10}
.piano:after{content:"";position:absolute;inset:0 0 45% 0;background:repeating-linear-gradient(90deg,transparent 0 9px,#1a1008 9px 17px,transparent 17px 28px)}
.sc-space{background:radial-gradient(circle at 30% 30%,#1c2350,#05060f 70%)}
.planet{right:16%;top:22%;width:34px;height:34px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#c9d8ff,#5a6fd0);box-shadow:0 0 18px #8fb8ff88;animation:lrt-pulse 4s ease-in-out infinite}
.planet:after{content:"";position:absolute;left:-12px;top:13px;width:58px;height:8px;border:2px solid #c9d8ffaa;border-radius:50%;transform:rotate(-15deg)}
.hmark{position:absolute;bottom:-3px;transform:translateX(-50%);font-size:12px;font-weight:700;color:#7a4526aa;line-height:1}
.hmark.got{font-size:13px;text-shadow:0 0 6px currentColor,0 0 1px #2a1a10}
.lrt-confetti{position:absolute;inset:0;z-index:20;pointer-events:none;overflow:hidden;border-radius:22px}
.lrt-confetti i{position:absolute;top:-10px;width:8px;height:12px;border-radius:2px;animation:lrt-fall 2.6s ease-in forwards}
@keyframes lrt-fall{to{transform:translateY(520px) rotate(540deg)}}
.lrt-confetti b{position:absolute;left:50%;top:38%;transform:translateX(-50%);white-space:nowrap;background:#1b1426;color:#ffd27a;border:3px solid #ffd27a;border-radius:10px;padding:8px 14px;font-size:14px;animation:lrt-pop .4s ease-out}
@keyframes lrt-pop{from{transform:translateX(-50%) scale(.5);opacity:0}}
.lrt-dial{position:relative;margin-top:12px;padding:10px 14px 8px;background:linear-gradient(#fbf0d6,var(--cream));border:4px solid var(--wood2);border-radius:12px;cursor:pointer;box-shadow:inset 0 0 calc(var(--s)*24px) color-mix(in srgb,var(--c) 70%,transparent)}
.lrt-track{position:relative;height:42px}
.tick{position:absolute;top:0;width:2px;height:10px;background:#7a4526aa;transform:translateX(-1px)}
.tick.big{height:16px;background:var(--ink)}
.tick b{position:absolute;top:18px;left:50%;transform:translateX(-50%);font-size:11px}
.mark{position:absolute;bottom:0;width:10px;height:6px;border-radius:3px;transform:translateX(-5px);box-shadow:0 0 0 1px #0004}
.needle{position:absolute;top:-6px;bottom:-4px;width:3px;margin-left:-1.5px;background:#e23b2e;border-radius:2px;box-shadow:0 0 8px #e23b2e88;transition:left .08s}
.lrt-row{display:grid;grid-template-columns:1fr auto;gap:14px;margin-top:12px}
.lrt-left{display:flex;flex-direction:column;gap:10px;min-width:0}
.lrt-display{position:relative;display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:12px;align-items:baseline;padding:10px 12px;padding-right:56px;background:#1b1426;color:var(--c);border:3px solid var(--wood2);border-radius:10px;text-shadow:0 0 calc(var(--s)*10px) var(--c);transition:color .4s;min-height:62px}
.is-off .lrt-display{color:#6b5d7a;text-shadow:none}
.lrt-display .freq{grid-row:span 2;font-size:26px;font-weight:700}
.lrt-display small{font-size:10px;margin-left:3px}
.lrt-display .name{font-size:15px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lrt-display .vibe{font-size:11px;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.found{position:absolute;right:10px;top:8px;font-size:11px;color:#ffd27a99}
.found.all{color:#ffd27a;text-shadow:0 0 8px #ffd27a}
.bars{position:absolute;right:10px;bottom:12px;display:flex;align-items:flex-end;gap:3px}
.bars i{width:5px;background:#ffffff22;border-radius:1px}
.bars i.on{background:var(--c)}
.lrt-grille{flex:1;min-height:70px;border-radius:10px;border:3px solid var(--wood2);background:radial-gradient(circle,#3a2516 1.6px,transparent 2.2px) 0 0/9px 9px,linear-gradient(#5b3a22,#4a2e1a)}
.lrt-grille.is-live{animation:lrt-thump linear infinite;box-shadow:inset 0 0 18px color-mix(in srgb,var(--c) 45%,transparent)}
@keyframes lrt-thump{0%{transform:scale(1.012)}20%{transform:scale(1)}}
.lrt-controls{display:flex;flex-direction:column;align-items:center;gap:10px}
.lrt-knobwrap{display:flex;flex-direction:column;align-items:center;gap:4px}
.lrt-knob{width:96px;height:96px;border-radius:50%;background:conic-gradient(from 0deg,#2a1a10,#4b301e,#2a1a10,#4b301e,#2a1a10);padding:8px;cursor:grab;touch-action:none;box-shadow:0 6px 0 var(--wood2),0 8px 16px #0006;outline:none}
.lrt-knob.is-drag{cursor:grabbing}
.lrt-knob:focus-visible{box-shadow:0 0 0 3px var(--cream),0 0 0 6px var(--c)}
.lrt-knob .cap{position:relative;display:block;width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff7e4,var(--cream) 40%,#d9c49a);box-shadow:inset 0 -3px 6px #0003}
.lrt-knob .cap i{position:absolute;left:50%;top:6px;width:5px;height:22px;margin-left:-2.5px;border-radius:3px;background:var(--c);box-shadow:0 0 6px var(--c);transition:background .4s}
.lrt-lbl{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--cream)}
.lrt-btns{display:flex;gap:6px}
.lrt-btns button{width:32px;height:32px;border-radius:8px;border:2px solid var(--wood2);background:var(--cream);color:var(--ink);font-size:12px;cursor:pointer;box-shadow:0 3px 0 var(--wood2)}
.lrt-btns button:active{transform:translateY(2px);box-shadow:0 1px 0 var(--wood2)}
.lrt-btns button:focus-visible{outline:3px solid var(--c);outline-offset:2px}
.lrt-btns .pwr{font-size:16px;color:#a33}
.lrt-btns .pwr.on{background:var(--c);color:var(--ink);box-shadow:0 3px 0 var(--wood2),0 0 14px var(--c)}
.lrt-vol{display:flex;align-items:center;gap:6px;font-size:10px;text-transform:uppercase;color:var(--cream)}
.lrt-vol input{width:78px;accent-color:var(--c)}
.lrt-feet{display:flex;justify-content:space-between;padding:0 40px}
.lrt-feet i{width:40px;height:10px;background:var(--wood2);border-radius:0 0 8px 8px}
@media (max-width:480px){
  .lrt-row{grid-template-columns:1fr}
  .lrt-controls{flex-direction:row;justify-content:space-between;flex-wrap:wrap}
  .lrt-grille{min-height:40px}
  .lrt-knob{width:82px;height:82px}
  .lrt-display .freq{font-size:22px}
  .tick b{font-size:9px}
}
@media (prefers-reduced-motion:reduce){.lrt *{animation:none !important;transition-duration:1ms !important}}
`;
