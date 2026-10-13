"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GuitarMode = "play" | "chords" | "tuner" | "tab" | "strum" | "song";

export type StrumStyle = "folk" | "pop" | "slow" | "finger";

export interface GuitarSong {
  name: string;
  /** Up to 8 bars. Each bar is a chord name, or null for an empty bar. */
  bars: (string | null)[];
  style: StrumStyle;
  tempo: number;
}

export interface GuitarChord {
  name: string;
  /** Fret for each string from low E to high e. -1 = muted, 0 = open. */
  frets: [number, number, number, number, number, number];
}

export interface TabNote {
  /** 0 = low E ... 5 = high e. */
  string: number;
  fret: number;
}

export interface GuitarStudioProps {
  defaultMode?: GuitarMode;
  chords?: GuitarChord[];
  defaultChord?: string;
  /** One entry per step; each step is a list of notes played together (empty = rest). */
  tab?: TabNote[][];
  /** Beats per minute for Tab and Strum. */
  tempo?: number;
  /** Example songs shown in the Song tab. */
  songs?: GuitarSong[];
  /** localStorage key for songs saved from the Song tab. */
  storageKey?: string;
  muted?: boolean;
  disabled?: boolean;
  /** Called every time a string sounds. */
  onPluck?: (info: { string: number; fret: number; frequency: number }) => void;
  className?: string;
}

const MODES: { id: GuitarMode; label: string }[] = [
  { id: "play", label: "Play" },
  { id: "chords", label: "Chords" },
  { id: "tuner", label: "Tuner" },
  { id: "tab", label: "Tab" },
  { id: "strum", label: "Strum" },
  { id: "song", label: "Song" },
];

const OPEN = [82.41, 110, 146.83, 196, 246.94, 329.63]; // E2 A2 D3 G3 B3 E4
const NAMES = ["E", "A", "D", "G", "B", "e"];

const DEFAULT_CHORDS: GuitarChord[] = [
  { name: "Am", frets: [-1, 0, 2, 2, 1, 0] },
  { name: "C", frets: [-1, 3, 2, 0, 1, 0] },
  { name: "G", frets: [3, 2, 0, 0, 0, 3] },
  { name: "Em", frets: [0, 2, 2, 0, 0, 0] },
  { name: "D", frets: [-1, -1, 0, 2, 3, 2] },
  { name: "E", frets: [0, 2, 2, 1, 0, 0] },
  { name: "F", frets: [1, 3, 3, 2, 1, 1] },
  { name: "Dm", frets: [-1, -1, 0, 2, 3, 1] },
];

const DEFAULT_SONGS: GuitarSong[] = [
  { name: "Lofi Sunday", bars: ["Am", "F", "C", "G", "Am", "F", "C", "G"], style: "folk", tempo: 84 },
  { name: "Campfire", bars: ["G", "C", "G", "D", "G", "C", "D", "G"], style: "pop", tempo: 100 },
  { name: "Sad Cat", bars: ["Am", "Dm", "Em", "Am", "F", "Dm", "E", "Am"], style: "slow", tempo: 70 },
];

const STYLES: { id: StrumStyle; label: string; slots: ("D" | "U" | "-")[] }[] = [
  { id: "folk", label: "Folk", slots: ["D", "-", "D", "U", "-", "U", "D", "U"] },
  { id: "pop", label: "Pop", slots: ["D", "-", "D", "U", "D", "U", "D", "U"] },
  { id: "slow", label: "Slow", slots: ["D", "-", "-", "-", "D", "-", "U", "-"] },
  { id: "finger", label: "Fingerpick", slots: ["D", "D", "D", "D", "D", "D", "D", "D"] },
];

const DEFAULT_TAB: TabNote[][] = [
  [{ string: 1, fret: 0 }], [{ string: 2, fret: 2 }], [{ string: 3, fret: 2 }], [{ string: 4, fret: 1 }],
  [{ string: 3, fret: 2 }], [{ string: 2, fret: 2 }], [{ string: 1, fret: 0 }], [{ string: 2, fret: 2 }],
  [{ string: 1, fret: 3 }], [{ string: 2, fret: 2 }], [{ string: 3, fret: 0 }], [{ string: 4, fret: 1 }],
  [{ string: 3, fret: 0 }], [{ string: 2, fret: 2 }], [{ string: 1, fret: 3 }], [{ string: 2, fret: 2 }],
];

// Neck geometry in SVG units. The nut is at X0, the bridge at X0 + SCALE.
const X0 = 130;
const SCALE = 570;
const BRIDGE = X0 + SCALE;
const fretX = (n: number) => X0 + SCALE * (1 - Math.pow(2, -n / 12));
const rowY = (row: number, x: number) => {
  const t = (x - X0) / SCALE;
  const nut = 125 + row * 14;
  const bridge = 118 + row * 16.8;
  return nut + (bridge - nut) * t;
};
// String index 0 is the low E, which is drawn at the bottom.
const stringRow = (s: number) => 5 - s;
const stringY = (s: number, x: number) => rowY(stringRow(s), x);
const THICK = [3.5, 2.9, 2.3, 1.7, 1.3, 1.0];
const FRETS = 14;

const fretFromX = (x: number) => {
  if (x < X0 - 4 || x > fretX(FRETS)) return 0;
  for (let n = 1; n <= FRETS; n++) if (x < fretX(n)) return n;
  return 0;
};

type Audio = { ctx: AudioContext; out: GainNode; cache: Map<number, AudioBuffer> };

function makeAudio(): Audio | null {
  const AC = typeof window !== "undefined" ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext : undefined;
  if (!AC) return null;
  const ctx = new AC();
  const out = ctx.createGain();
  out.gain.value = 0.9;
  // A little body: a low wood resonance and a soft presence boost.
  const low = ctx.createBiquadFilter();
  low.type = "peaking";
  low.frequency.value = 220;
  low.gain.value = 5;
  const high = ctx.createBiquadFilter();
  high.type = "peaking";
  high.frequency.value = 2400;
  high.gain.value = 2;
  out.connect(low);
  low.connect(high);
  high.connect(ctx.destination);
  return { ctx, out, cache: new Map() };
}

// Karplus-Strong: a burst of noise circulating in a short delay line sounds like a plucked string.
function pluckBuffer(a: Audio, freq: number) {
  const sr = a.ctx.sampleRate;
  const N = Math.max(2, Math.round(sr / freq));
  const hit = a.cache.get(N);
  if (hit) return { buffer: hit, base: sr / N };
  const len = Math.floor(sr * 2.4);
  const buffer = a.ctx.createBuffer(1, len, sr);
  const d = buffer.getChannelData(0);
  const ring = new Float32Array(N);
  let prev = 0;
  for (let i = 0; i < N; i++) {
    const n = Math.random() * 2 - 1;
    prev = prev * 0.5 + n * 0.5; // soften the start so it is less harsh
    ring[i] = prev;
  }
  let p = 0;
  const damp = freq > 300 ? 0.994 : 0.997;
  for (let i = 0; i < len; i++) {
    const cur = ring[p];
    d[i] = cur;
    ring[p] = 0.5 * (cur + ring[(p + 1) % N]) * damp;
    p = (p + 1) % N;
  }
  a.cache.set(N, buffer);
  return { buffer, base: sr / N };
}

export default function GuitarStudio({
  defaultMode = "play",
  chords = DEFAULT_CHORDS,
  defaultChord,
  tab = DEFAULT_TAB,
  tempo = 90,
  songs = DEFAULT_SONGS,
  storageKey = "guitar-studio:songs",
  muted = false,
  disabled = false,
  onPluck,
  className = "",
}: GuitarStudioProps) {
  const [mode, setMode] = useState<GuitarMode>(defaultMode);
  const [chordName, setChordName] = useState(defaultChord ?? chords[0]?.name);
  const [bpm, setBpm] = useState(tempo);
  const [vib, setVib] = useState<number[]>([0, 0, 0, 0, 0, 0]); // restart counters for the string wobble
  const [pressed, setPressed] = useState<{ s: number; f: number } | null>(null);
  const [cents, setCents] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [tunerString, setTunerString] = useState(0);
  const [tabStep, setTabStep] = useState(-1);
  const [tabOn, setTabOn] = useState(false);
  const [pattern, setPattern] = useState<("D" | "U" | "-")[]>(["D", "-", "D", "U", "-", "U", "D", "U"]);
  const [strumStep, setStrumStep] = useState(-1);
  const [strumOn, setStrumOn] = useState(false);
  const [note, setNote] = useState("");
  const [bars, setBars] = useState<(string | null)[]>(() => [...(songs[0]?.bars ?? []), ...Array(8).fill(null)].slice(0, 8));
  const [songName, setSongName] = useState(songs[0]?.name ?? "My song");
  const [style, setStyle] = useState<StrumStyle>(songs[0]?.style ?? "folk");
  const [selBar, setSelBar] = useState<number | null>(null);
  const [songOn, setSongOn] = useState(false);
  const [songBar, setSongBar] = useState(-1);
  const [saved, setSaved] = useState<GuitarSong[]>([]);
  const audio = useRef<Audio | null>(null);
  const timers = useRef<number[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const lastString = useRef<number | null>(null);
  const centsRef = useRef(cents);
  centsRef.current = cents;
  const callbackRef = useRef(onPluck);
  callbackRef.current = onPluck;

  const chord = chords.find((c) => c.name === chordName) ?? chords[0];
  const barChord = songBar >= 0 ? chords.find((c) => c.name === bars[songBar]) : undefined;
  const activeChord = mode === "song" && barChord ? barChord : chord;

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setSaved(JSON.parse(raw));
    } catch {
      /* storage can be blocked; saving then lasts for this visit only */
    }
  }, [storageKey]);

  useEffect(() => {
    const t = timers;
    return () => {
      t.current.forEach(clearTimeout);
      audio.current?.ctx.close().catch(() => {});
      audio.current = null;
    };
  }, []);

  const pluck = useCallback(
    (s: number, fret: number, soft = false) => {
      if (disabled) return;
      const freq = OPEN[s] * Math.pow(2, fret / 12) * Math.pow(2, centsRef.current[s] / 1200);
      setVib((v) => v.map((n, i) => (i === s ? n + 1 : n)));
      callbackRef.current?.({ string: s, fret, frequency: Math.round(freq * 100) / 100 });
      if (muted) return;
      if (!audio.current) audio.current = makeAudio();
      const a = audio.current;
      if (!a) return;
      if (a.ctx.state === "suspended") a.ctx.resume().catch(() => {});
      const { buffer, base } = pluckBuffer(a, freq);
      const src = a.ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = freq / base;
      const g = a.ctx.createGain();
      const now = a.ctx.currentTime;
      g.gain.setValueAtTime(soft ? 0.5 : 0.75, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
      src.connect(g);
      g.connect(a.out);
      src.start();
      src.stop(now + 2.3);
    },
    [disabled, muted],
  );

  // Play the strings of a chord one after another, low to high (down) or high to low (up).
  const strum = useCallback(
    (c: GuitarChord, dir: "D" | "U") => {
      const order = [0, 1, 2, 3, 4, 5];
      if (dir === "U") order.reverse();
      let k = 0;
      order.forEach((s) => {
        if (c.frets[s] < 0) return;
        later(() => pluck(s, c.frets[s], true), k * 32);
        k++;
      });
    },
    [pluck],
  );

  // ---------- Play mode: press a spot on the neck, or drag across the strings ----------
  const toSvg = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 800, y: ((e.clientY - r.top) / r.height) * 320 };
  };
  const stringAt = (x: number, y: number) => {
    if (x < X0 - 6 || x > BRIDGE + 10) return null;
    let best: number | null = null;
    let dist = 9;
    for (let s = 0; s < 6; s++) {
      const d = Math.abs(stringY(s, Math.min(x, BRIDGE)) - y);
      if (d < dist) {
        dist = d;
        best = s;
      }
    }
    return best;
  };
  const hit = (e: React.PointerEvent, down: boolean) => {
    if (disabled || mode === "tuner") return;
    if (!down && e.buttons === 0) return;
    const { x, y } = toSvg(e);
    const s = stringAt(x, y);
    if (s === null) {
      lastString.current = null;
      return;
    }
    if (s === lastString.current) return;
    lastString.current = s;
    const fret = mode === "play" ? fretFromX(x) : activeChord.frets[s] < 0 ? 0 : activeChord.frets[s];
    if (mode !== "play" && activeChord.frets[s] < 0) return;
    pluck(s, fret);
    setPressed({ s, f: fret });
    setNote(`${NAMES[s]} string, ${fret === 0 ? "open" : `fret ${fret}`}`);
  };

  // ---------- Tab and Strum players ----------
  useEffect(() => {
    if (!tabOn) return;
    const ms = 60000 / bpm / 2;
    let i = 0;
    const id = window.setInterval(() => {
      if (i >= tab.length) {
        setTabOn(false);
        setTabStep(-1);
        return;
      }
      setTabStep(i);
      tab[i].forEach((n) => pluck(n.string, n.fret));
      i++;
    }, ms);
    return () => clearInterval(id);
  }, [tabOn, bpm, tab, pluck]);

  useEffect(() => {
    if (!strumOn) return;
    const ms = 60000 / bpm / 2;
    let i = 0;
    const id = window.setInterval(() => {
      const slot = i % pattern.length;
      setStrumStep(slot);
      if (pattern[slot] !== "-") strum(chord, pattern[slot] as "D" | "U");
      i++;
    }, ms);
    return () => clearInterval(id);
  }, [strumOn, bpm, pattern, chord, strum]);

  // ---------- Song player: one bar = 8 eighth-note slots ----------
  useEffect(() => {
    if (!songOn) return;
    const filled = bars.map((c, i) => ({ c: chords.find((x) => x.name === c), i })).filter((x) => x.c);
    if (!filled.length) {
      setSongOn(false);
      return;
    }
    const pat = STYLES.find((x) => x.id === style)!.slots;
    const ms = 60000 / bpm / 2;
    let step = 0;
    const tick = () => {
      const { c, i } = filled[Math.floor(step / 8) % filled.length];
      const ch = c!;
      const slot = step % 8;
      setSongBar(i);
      if (style === "finger") {
        const live = [0, 1, 2, 3, 4, 5].filter((s) => ch.frets[s] >= 0);
        const order = [0, 2, 3, 4, 3, 2, 3, 4]; // bass note first, then the higher strings
        const pick = live.length ? live[Math.min(order[slot], live.length - 1)] : -1;
        if (pick >= 0) pluck(pick, ch.frets[pick], true);
      } else if (pat[slot] !== "-") {
        strum(ch, pat[slot] as "D" | "U");
      }
      step++;
    };
    tick();
    const id = window.setInterval(tick, ms);
    return () => clearInterval(id);
  }, [songOn, bars, bpm, style, chords, pluck, strum]);

  const addChord = (name: string) => {
    const target = selBar !== null ? selBar : bars.findIndex((b) => b === null);
    if (target < 0) {
      setNote("All 8 bars are full. Pick a bar to change it.");
      return;
    }
    setBars((b) => b.map((v, i) => (i === target ? name : v)));
    setSelBar(null);
    const ch = chords.find((c) => c.name === name);
    if (ch && !songOn) strum(ch, "D");
  };
  const clearBar = (i: number) => {
    setBars((b) => b.map((v, j) => (j === i ? null : v)));
    setSelBar(null);
  };
  const loadSong = (song: GuitarSong) => {
    setSongOn(false);
    setSongBar(-1);
    setBars([...song.bars, ...Array(8).fill(null)].slice(0, 8));
    setSongName(song.name);
    setStyle(song.style);
    setBpm(song.tempo);
    setSelBar(null);
  };
  const saveSong = () => {
    const name = songName.trim() || "My song";
    const next = [...saved.filter((x) => x.name !== name), { name, bars, style, tempo: bpm }];
    setSaved(next);
    setNote(`Saved ${name}`);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* storage can be blocked */
    }
  };
  const removeSaved = (name: string) => {
    const next = saved.filter((x) => x.name !== name);
    setSaved(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* storage can be blocked */
    }
  };

  const pickMode = (m: GuitarMode) => {
    setMode(m);
    setSongOn(false);
    setSongBar(-1);
    setTabOn(false);
    setStrumOn(false);
    setTabStep(-1);
    setStrumStep(-1);
    setPressed(null);
  };

  const showChord = mode === "chords" || mode === "strum" || (mode === "song" && songBar >= 0);
  const dots: { s: number; f: number }[] = showChord
    ? activeChord.frets.map((f, s) => ({ s, f })).filter((d) => d.f > 0)
    : mode === "tab" && tabStep >= 0
      ? tab[tabStep].map((n) => ({ s: n.string, f: n.fret })).filter((d) => d.f > 0)
      : pressed && pressed.f > 0
        ? [pressed]
        : [];

  const detune = () => setCents([-22, 14, -9, 26, -15, 11]);
  const bump = (s: number, delta: number) => setCents((c) => c.map((v, i) => (i === s ? Math.max(-50, Math.min(50, v + delta)) : v)));

  return (
    <section className={`gst ${className}`} aria-label="Guitar studio">
      <style>{CSS}</style>
      <div role="tablist" aria-label="Mode" className="gst-tabs">
        {MODES.map((m) => (
          <button key={m.id} role="tab" type="button" aria-selected={mode === m.id} className={mode === m.id ? "on" : ""} onClick={() => pickMode(m.id)} disabled={disabled}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="gst-neck">
        <svg
          ref={svgRef}
          viewBox="0 0 800 320"
          role="img"
          aria-label={`Acoustic guitar. ${note || "Press a string to play it."}`}
          className="gst-svg"
          onPointerDown={(e) => {
            lastString.current = null;
            hit(e, true);
          }}
          onPointerMove={(e) => hit(e, false)}
          onPointerUp={() => (lastString.current = null)}
        >
          <Defs />
          <Body />
          <polygon points="130,120 480,112 480,208 130,200" fill="url(#gst-neck)" />
          <Head />
          <rect x="126" y="118" width="7" height="84" rx="2" fill="#f4efe0" />
          {Array.from({ length: FRETS }, (_, i) => i + 1).map((n) => (
            <rect key={n} x={fretX(n) - 1.6} y={118 - (n / 14) * 6} width="3.2" height={84 + (n / 14) * 12} rx="1.4" fill="url(#gst-fret)" />
          ))}
          {[3, 5, 7, 9].map((n) => <circle key={n} cx={(fretX(n - 1) + fretX(n)) / 2} cy="160" r="5" fill="url(#gst-pearl)" />)}
          {[143, 177].map((y) => <circle key={y} cx={(fretX(11) + fretX(12)) / 2} cy={y} r="5" fill="url(#gst-pearl)" />)}
          {[0, 1, 2, 3, 4, 5].map((s) => {
            const y1 = stringY(s, X0 - 4);
            const y2 = stringY(s, BRIDGE);
            const w = THICK[s];
            const wound = s <= 2;
            return (
              <g key={`${s}-${vib[s]}`} className={vib[s] ? "gst-vib" : ""} style={{ ["--amp" as string]: `${1 + w * 0.5}px` }}>
                <line x1={X0 - 4} y1={y1} x2={BRIDGE} y2={y2} stroke={wound ? "#b08a4a" : "#d6dbe6"} strokeWidth={w} />
                <line x1={X0 - 4} y1={y1 - w * 0.25} x2={BRIDGE} y2={y2 - w * 0.25} stroke="#fff" strokeOpacity=".55" strokeWidth={Math.max(0.5, w * 0.3)} />
                {wound && <line x1={X0 - 4} y1={y1} x2={BRIDGE} y2={y2} stroke="#6b4e1c" strokeWidth={w} strokeDasharray="1.2 1.6" strokeOpacity=".6" />}
              </g>
            );
          })}
          {dots.map((d, i) => {
            const x = (fretX(d.f - 1) + fretX(d.f)) / 2 + 3;
            return <circle key={`${d.s}-${d.f}-${i}`} cx={x} cy={stringY(d.s, x)} r="8.5" fill="#fb7185" stroke="#fff" strokeOpacity=".7" strokeWidth="1.4" filter="url(#gst-glow)" />;
          })}
          {showChord &&
            activeChord.frets.map((f, s) =>
              f <= 0 ? (
                <text key={s} x="112" y={stringY(s, X0) + 4} textAnchor="middle" fontSize="12" fontFamily="ui-monospace,monospace" fill="#cbd2e6">{f < 0 ? "x" : "o"}</text>
              ) : null,
            )}
          <g fontFamily="ui-monospace,monospace" fontSize="11" fill="#9aa2b8">
            {[0, 3, 5, 7, 9].map((n) => <text key={n} x={n === 0 ? 136 : (fretX(n - 1) + fretX(n)) / 2 - 3} y="104">{n}</text>)}
          </g>
        </svg>
      </div>

      <div className="gst-panel">
        {mode === "play" && (
          <>
            <p className="gst-hint">Press a spot on the neck to play that fret, or drag across the strings. Pressing in the body plays open strings.</p>
            <div className="gst-row" aria-label="Open strings">
              {NAMES.map((n, s) => (
                <button key={n + s} type="button" className="gst-pill" disabled={disabled} onClick={() => { pluck(s, 0); setPressed(null); setNote(`${n} string, open`); }}>{n}</button>
              ))}
            </div>
          </>
        )}

        {(mode === "chords" || mode === "strum") && (
          <div className="gst-row" role="group" aria-label="Chord">
            {chords.map((c) => (
              <button key={c.name} type="button" aria-pressed={c.name === chord.name} className={`gst-pill${c.name === chord.name ? " on" : ""}`} disabled={disabled} onClick={() => { setChordName(c.name); if (mode === "chords") strum(c, "D"); }}>{c.name}</button>
            ))}
            {mode === "chords" && (
              <>
                <button type="button" className="gst-btn" disabled={disabled} onClick={() => strum(chord, "D")}>Strum down</button>
                <button type="button" className="gst-btn" disabled={disabled} onClick={() => strum(chord, "U")}>Strum up</button>
              </>
            )}
          </div>
        )}

        {mode === "tuner" && (
          <Tuner cents={cents} selected={tunerString} onSelect={setTunerString} onPlay={(s) => pluck(s, 0)} onBump={bump} onDetune={detune} disabled={disabled} />
        )}

        {mode === "tab" && (
          <>
            <TabView tab={tab} step={tabStep} />
            <div className="gst-row">
              <button type="button" className="gst-btn" disabled={disabled} onClick={() => { setTabStep(-1); setTabOn((v) => !v); }}>{tabOn ? "Stop" : "Play tab"}</button>
              <Tempo bpm={bpm} setBpm={setBpm} />
            </div>
          </>
        )}

        {mode === "strum" && (
          <>
            <div className="gst-slots" role="group" aria-label="Strumming pattern">
              {pattern.map((p, i) => (
                <button key={i} type="button" aria-label={`Beat ${i + 1}: ${p === "D" ? "down" : p === "U" ? "up" : "rest"}`} className={`gst-slot${strumStep === i ? " now" : ""}${p === "-" ? " rest" : ""}`} disabled={disabled} onClick={() => setPattern((a) => a.map((v, j) => (j === i ? (v === "D" ? "U" : v === "U" ? "-" : "D") : v)))}>
                  {p === "D" ? "↓" : p === "U" ? "↑" : "·"}
                </button>
              ))}
            </div>
            <div className="gst-row">
              <button type="button" className="gst-btn" disabled={disabled} onClick={() => { setStrumStep(-1); setStrumOn((v) => !v); }}>{strumOn ? "Stop" : "Play pattern"}</button>
              <Tempo bpm={bpm} setBpm={setBpm} />
            </div>
          </>
        )}
        {mode === "song" && (
          <div className="gst-song">
            <div className="gst-songhead">
              <input className="gst-name" aria-label="Song name" value={songName} maxLength={28} onChange={(e) => setSongName(e.target.value)} disabled={disabled} />
              <span className="gst-meta">{bars.filter(Boolean).length} of 8 bars · {bpm} bpm</span>
            </div>
            <div className="gst-bars" role="group" aria-label="Song bars">
              {bars.map((b, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={selBar === i}
                  aria-label={b ? `Bar ${i + 1}: ${b}` : `Bar ${i + 1}: empty`}
                  className={`gst-bar${b ? "" : " empty"}${songBar === i ? " now" : ""}${selBar === i ? " sel" : ""}`}
                  disabled={disabled}
                  onClick={() => setSelBar((v) => (v === i ? null : i))}
                >
                  <small>Bar {i + 1}</small>
                  <strong>{b ?? "+ add chord"}</strong>
                </button>
              ))}
            </div>
            <p className="gst-hint">{selBar !== null ? `Bar ${selBar + 1} is selected. Pick a chord to put there.` : "Pick a chord to put it in the next empty bar, or select a bar to change it."}</p>
            <div className="gst-row" role="group" aria-label="Chords to add">
              {chords.map((c) => (
                <button key={c.name} type="button" className="gst-pill" disabled={disabled} onClick={() => addChord(c.name)}>{c.name}</button>
              ))}
              {selBar !== null && bars[selBar] && (
                <button type="button" className="gst-btn" onClick={() => clearBar(selBar)}>Clear bar {selBar + 1}</button>
              )}
            </div>
            <div className="gst-row">
              <button type="button" className="gst-btn" disabled={disabled || !bars.some(Boolean)} onClick={() => { setSelBar(null); if (songOn) setSongBar(-1); setSongOn((v) => !v); }}>{songOn ? "Stop" : "▶ Play song"}</button>
              <span className="gst-styles" role="group" aria-label="Strum style">
                {STYLES.map((st) => (
                  <button key={st.id} type="button" aria-pressed={style === st.id} className={`gst-pill${style === st.id ? " on" : ""}`} disabled={disabled} onClick={() => setStyle(st.id)}>{st.label}</button>
                ))}
              </span>
              <Tempo bpm={bpm} setBpm={setBpm} />
            </div>
            <div className="gst-row">
              <button type="button" className="gst-btn gst-save" disabled={disabled} onClick={saveSong}>Save</button>
              <button type="button" className="gst-btn gst-ghost" disabled={disabled} onClick={() => { setBars(Array(8).fill(null)); setSongOn(false); setSongBar(-1); setSelBar(null); }}>Clear all</button>
            </div>
            <div className="gst-row" aria-label="Songs">
              <small className="gst-label">Examples</small>
              {songs.map((sg) => (
                <button key={sg.name} type="button" className="gst-pill" disabled={disabled} onClick={() => loadSong(sg)}>{sg.name}</button>
              ))}
            </div>
            {saved.length > 0 && (
              <div className="gst-row">
                <small className="gst-label">Saved</small>
                {saved.map((sg) => (
                  <span key={sg.name} className="gst-saved">
                    <button type="button" className="gst-pill" disabled={disabled} onClick={() => loadSong(sg)}>{sg.name}</button>
                    <button type="button" className="gst-x" aria-label={`Delete ${sg.name}`} onClick={() => removeSaved(sg.name)}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        <p className="gst-sr" role="status">{note}</p>
      </div>
    </section>
  );
}

function Tempo({ bpm, setBpm }: { bpm: number; setBpm: (n: number) => void }) {
  return (
    <label className="gst-tempo">
      Tempo
      <input type="range" min={50} max={140} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
      <span>{bpm} bpm</span>
    </label>
  );
}

function TabView({ tab, step }: { tab: TabNote[][]; step: number }) {
  return (
    <div className="gst-tabview" role="img" aria-label="Guitar tab">
      <div className="gst-tabgrid" style={{ gridTemplateColumns: `20px repeat(${tab.length}, minmax(18px, 1fr))` }}>
        {[5, 4, 3, 2, 1, 0].map((s) => (
          <div key={s} className="gst-tabrow">
            <span className="gst-tabname">{NAMES[s]}</span>
            {tab.map((notes, i) => {
              const n = notes.find((x) => x.string === s);
              return <span key={i} className={`gst-tabcell${step === i ? " now" : ""}`}>{n ? n.fret : ""}</span>;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Tuner({ cents, selected, onSelect, onPlay, onBump, onDetune, disabled }: { cents: number[]; selected: number; onSelect: (s: number) => void; onPlay: (s: number) => void; onBump: (s: number, d: number) => void; onDetune: () => void; disabled: boolean }) {
  const c = cents[selected];
  const ok = Math.abs(c) <= 3;
  const angle = Math.max(-50, Math.min(50, c)) * 1.4;
  return (
    <div className="gst-tuner">
      <div className="gst-gauge" role="img" aria-label={`${NAMES[selected]} string is ${ok ? "in tune" : c < 0 ? "flat" : "sharp"} by ${Math.abs(c)} cents`}>
        <svg viewBox="0 0 200 110" width="100%">
          <path d="M20,100 A80,80 0 0 1 180,100" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="8" strokeLinecap="round" />
          <path d="M86,22 A80,80 0 0 1 114,22" fill="none" stroke={ok ? "#a3e635" : "#38bdf8"} strokeWidth="8" strokeLinecap="round" />
          <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "100px 100px", transition: "transform .25s" }}>
            <line x1="100" y1="100" x2="100" y2="30" stroke={ok ? "#a3e635" : "#fb7185"} strokeWidth="3" strokeLinecap="round" />
          </g>
          <circle cx="100" cy="100" r="6" fill="#e8ebf5" />
          <text x="22" y="108" fill="#9aa2b8" fontSize="10" fontFamily="ui-monospace,monospace">flat</text>
          <text x="156" y="108" fill="#9aa2b8" fontSize="10" fontFamily="ui-monospace,monospace">sharp</text>
        </svg>
        <p className={`gst-cents${ok ? " ok" : ""}`}>{ok ? "In tune" : `${c > 0 ? "+" : ""}${c} cents`}</p>
      </div>
      <div className="gst-pegs">
        {NAMES.map((n, s) => (
          <div key={s} className={`gst-peg${selected === s ? " on" : ""}`}>
            <button type="button" className="gst-pill" aria-pressed={selected === s} disabled={disabled} onClick={() => { onSelect(s); onPlay(s); }}>{n}</button>
            <span className="gst-turn">
              <button type="button" aria-label={`Loosen ${n} string`} disabled={disabled} onClick={() => { onSelect(s); onBump(s, -5); }}>−</button>
              <button type="button" aria-label={`Tighten ${n} string`} disabled={disabled} onClick={() => { onSelect(s); onBump(s, 5); }}>+</button>
            </span>
          </div>
        ))}
      </div>
      <button type="button" className="gst-btn" disabled={disabled} onClick={onDetune}>Detune strings</button>
    </div>
  );
}

function Defs() {
  return (
    <defs>
      <linearGradient id="gst-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a2a14" /><stop offset=".5" stopColor="#2e170a" /><stop offset="1" stopColor="#43250f" /></linearGradient>
      <linearGradient id="gst-neck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3c2212" /><stop offset=".5" stopColor="#2a150a" /><stop offset="1" stopColor="#3a200f" /></linearGradient>
      <radialGradient id="gst-top" cx=".45" cy=".5" r=".75"><stop offset="0" stopColor="#efc98a" /><stop offset=".55" stopColor="#d49a52" /><stop offset=".85" stopColor="#9b5f26" /><stop offset="1" stopColor="#5e3412" /></radialGradient>
      <linearGradient id="gst-fret" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8f9199" /><stop offset=".5" stopColor="#f2f3f6" /><stop offset="1" stopColor="#8f9199" /></linearGradient>
      <radialGradient id="gst-pearl"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#bfc3cf" /></radialGradient>
      <radialGradient id="gst-chrome"><stop offset="0" stopColor="#fff" /><stop offset=".6" stopColor="#b9bcc6" /><stop offset="1" stopColor="#6f727c" /></radialGradient>
      <filter id="gst-shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity=".55" /></filter>
      <filter id="gst-glow"><feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#fb7185" floodOpacity=".9" /></filter>
    </defs>
  );
}

const BODY =
  "M610,104 C630,84 655,68 678,72 C705,78 718,92 735,92 C765,92 790,38 850,40 C905,42 930,100 928,160 C930,220 905,278 850,280 C790,282 765,228 735,228 C718,228 705,242 678,248 C655,252 630,236 610,216 Z";

function Body() {
  return (
    <g transform="translate(-150 0)">
      <g filter="url(#gst-shadow)"><path d={BODY} fill="url(#gst-top)" /></g>
      <path d={BODY} fill="none" stroke="#3b2411" strokeWidth="5" />
      <path d={BODY} fill="none" stroke="#f1d9a6" strokeWidth="1.4" transform="translate(-2 3)" opacity=".7" />
      <circle cx="710" cy="160" r="40" fill="#1a0f07" stroke="#2b1a0c" strokeWidth="6" />
      <circle cx="710" cy="160" r="46" fill="none" stroke="#f3e2b4" strokeWidth="2" />
      <circle cx="710" cy="160" r="52" fill="none" stroke="#6b3d16" strokeWidth="3" />
      <circle cx="710" cy="160" r="58" fill="none" stroke="#f3e2b4" strokeWidth="1.2" />
      <rect x="832" y="126" width="22" height="68" rx="6" fill="#2b1608" />
      <rect x="850" y="136" width="4" height="48" rx="2" fill="#efe7d4" />
      {Array.from({ length: 6 }, (_, i) => <circle key={i} cx="838" cy={139 + i * 8.4} r="2.1" fill="#efe7d4" />)}
    </g>
  );
}

function Head() {
  return (
    <g>
      <g filter="url(#gst-shadow)"><path d="M26,98 C26,88 40,84 60,84 L132,100 L132,220 L60,236 C40,236 26,232 26,222 Z" fill="url(#gst-wood)" stroke="#2a1608" strokeWidth="2.5" /></g>
      <text x="56" y="168" fill="#e9d29a" fontSize="13" fontFamily="Georgia,serif" fontStyle="italic" transform="rotate(-90 70 160)">LofiStack</text>
      {[0, 1, 2].map((i) => <circle key={`t${i}`} cx={58 + i * 22} cy="80" r="8" fill="url(#gst-chrome)" stroke="#555" />)}
      {[0, 1, 2].map((i) => <circle key={`b${i}`} cx={58 + i * 22} cy="240" r="8" fill="url(#gst-chrome)" stroke="#555" />)}
    </g>
  );
}

const CSS = `
.gst{font-family:var(--font-lexend),system-ui,sans-serif;color:#e8ebf5;width:100%;max-width:860px;padding:16px;border-radius:20px;border:1px solid rgba(56,189,248,.4);background:radial-gradient(ellipse at 50% 0,#241b3a,#0e1020 70%);box-shadow:0 0 40px -18px rgba(251,113,133,.6)}
.gst *{box-sizing:border-box}
.gst-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.gst-tabs button{font:600 12px ui-monospace,monospace;letter-spacing:.04em;padding:6px 12px;border-radius:8px;border:1px solid #2c3158;background:transparent;color:#9aa2b8;cursor:pointer}
.gst-tabs button.on{background:#fb7185;border-color:#fb7185;color:#10132a}
.gst-tabs button:disabled,.gst button:disabled{opacity:.45;cursor:not-allowed}
.gst button:focus-visible,.gst input:focus-visible{outline:2px solid #38bdf8;outline-offset:2px}
.gst-neck{overflow-x:auto;padding-block:4px;touch-action:pan-x}
.gst-svg{display:block;width:100%;min-width:560px;cursor:pointer;touch-action:pan-x pan-y}
.gst-vib{animation:gst-vib .9s ease-out}
@keyframes gst-vib{0%{transform:translateY(calc(var(--amp)*-1))}12%{transform:translateY(var(--amp))}26%{transform:translateY(calc(var(--amp)*-.7))}40%{transform:translateY(calc(var(--amp)*.5))}55%{transform:translateY(calc(var(--amp)*-.3))}70%{transform:translateY(calc(var(--amp)*.15))}100%{transform:none}}
.gst-panel{display:flex;flex-direction:column;gap:10px;margin-top:6px;min-height:108px}
.gst-hint{margin:0;font-size:13px;color:#9aa2b8}
.gst-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.gst-pill{min-width:40px;padding:5px 13px;border-radius:99px;border:1px solid #38bdf8;background:rgba(56,189,248,.14);color:#e8ebf5;font:inherit;font-size:13px;cursor:pointer}
.gst-pill.on{background:#38bdf8;color:#10132a}
.gst-btn{padding:6px 14px;border-radius:9px;border:1px solid #fb7185;background:rgba(251,113,133,.16);color:#e8ebf5;font:inherit;font-size:13px;cursor:pointer}
.gst-btn:hover:not(:disabled),.gst-pill:hover:not(:disabled){filter:brightness(1.25)}
.gst-tempo{display:flex;align-items:center;gap:8px;margin-left:auto;font-size:12px;color:#9aa2b8}
.gst-tempo input{accent-color:#fb7185;width:110px}
.gst-tempo span{min-width:52px;font-variant-numeric:tabular-nums}
.gst-slots{display:grid;grid-template-columns:repeat(8,1fr);gap:6px}
.gst-slot{aspect-ratio:1;max-height:44px;border-radius:9px;border:1px solid #38bdf8;background:rgba(56,189,248,.12);color:#e8ebf5;font-size:20px;cursor:pointer}
.gst-slot.rest{border-color:#2c3158;background:transparent;color:#566}
.gst-slot.now{background:#fb7185;border-color:#fb7185;color:#10132a;box-shadow:0 0 14px #fb7185}
.gst-tabview{overflow-x:auto}
.gst-tabgrid{display:grid;gap:0;min-width:420px}
.gst-tabrow{display:contents}
.gst-tabname{font:11px ui-monospace,monospace;color:#9aa2b8;align-self:center}
.gst-tabcell{height:22px;display:grid;place-items:center;font:12px ui-monospace,monospace;border-top:1px solid #2c3158;background-image:linear-gradient(#566,#566);background-size:100% 1px;background-position:center;background-repeat:no-repeat;color:#e8ebf5}
.gst-tabcell:not(:empty){font-weight:700}
.gst-tabcell.now{background-color:rgba(251,113,133,.25)}
.gst-tuner{display:grid;grid-template-columns:minmax(150px,220px) 1fr;gap:14px;align-items:center}
.gst-gauge{min-width:0}.gst-cents{margin:0;text-align:center;font:600 13px ui-monospace,monospace;color:#cbd2e6}.gst-cents.ok{color:#a3e635}
.gst-pegs{display:grid;grid-template-columns:repeat(auto-fit,minmax(84px,1fr));gap:8px}
.gst-peg{display:flex;align-items:center;gap:6px;padding:4px;border-radius:10px;border:1px solid transparent}.gst-peg.on{border-color:#2c3158}
.gst-turn{display:flex;gap:4px}.gst-turn button{width:26px;height:26px;border-radius:7px;border:1px solid #2c3158;background:#161a33;color:#e8ebf5;cursor:pointer}
.gst-tuner>.gst-btn{grid-column:1/-1;justify-self:start}
.gst-song{display:flex;flex-direction:column;gap:10px}
.gst-songhead{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.gst-name{all:unset;box-sizing:border-box;font-size:17px;font-weight:600;border-bottom:1px dashed #2c3158;min-width:120px;max-width:100%;color:#e8ebf5}
.gst-name:focus-visible{border-bottom-color:#38bdf8}
.gst-meta{font:12px ui-monospace,monospace;color:#9aa2b8}
.gst-bars{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.gst-bar{text-align:left;padding:8px 10px;min-height:60px;border-radius:12px;border:1px solid #38bdf8;background:rgba(56,189,248,.1);color:#e8ebf5;font:inherit;cursor:pointer}
.gst-bar small{display:block;font:11px ui-monospace,monospace;color:#9aa2b8}.gst-bar strong{font-size:19px}
.gst-bar.empty{border-style:dashed;border-color:#2c3158;background:transparent}.gst-bar.empty strong{font-size:13px;font-weight:400;color:#6b7390}
.gst-bar.sel{outline:2px solid #a3e635;outline-offset:1px}
.gst-bar.now{background:#fb7185;border-color:#fb7185;color:#10132a;box-shadow:0 0 16px #fb7185}.gst-bar.now small{color:#4a1c26}
.gst-styles{display:flex;flex-wrap:wrap;gap:6px}
.gst-save{border-color:#38bdf8;background:rgba(56,189,248,.16)}.gst-ghost{border-color:#566;background:transparent}
.gst-label{font:11px ui-monospace,monospace;color:#9aa2b8;text-transform:uppercase;letter-spacing:.06em}
.gst-saved{display:inline-flex;align-items:center}.gst-x{margin-left:-6px;width:22px;height:22px;border-radius:50%;border:1px solid #2c3158;background:#161a33;color:#cbd2e6;cursor:pointer;line-height:1}
@media (max-width:560px){.gst-bars{grid-template-columns:repeat(2,minmax(0,1fr))}}
.gst-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);margin:0}
@media (max-width:560px){.gst-tuner{grid-template-columns:1fr}.gst-tempo{margin-left:0}}
@media (prefers-reduced-motion:reduce){.gst-vib{animation:none}}
`;
