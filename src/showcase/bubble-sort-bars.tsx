"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type BubbleSortSpeed = 1 | 2 | 3 | 4 | 5;

export interface BubbleSortStats {
  passes: number;
  compares: number;
  swaps: number;
  earlyExit: boolean;
}

export interface BubbleSortBarsProps {
  /** Numbers to sort. When left out, a fixed demo list of `size` numbers is used. */
  values?: number[];
  /** How many bars to start with (5 to 20). Ignored when `values` is given. */
  size?: number;
  /** 1 is slow, 5 is fast. */
  speed?: BubbleSortSpeed;
  /** Start playing as soon as it mounts. */
  autoPlay?: boolean;
  /** After finishing, wait a moment, shuffle and play again (good for demos). */
  loop?: boolean;
  /** Show the Python code panel with the running line lit up. */
  showCode?: boolean;
  /** Show the Play, Step, Shuffle, Speed and Size controls. */
  showControls?: boolean;
  /** Called once each time a sort finishes. */
  onDone?: (stats: BubbleSortStats) => void;
  className?: string;
}

type Bar = { id: number; v: number };

type Frame = {
  order: Bar[];
  line: number; // index into CODE
  p: number;
  i: number | null; // left index of the pair being looked at
  swapped: boolean;
  compares: number;
  swaps: number;
  sortedFrom: number; // positions >= this are in their final place
  tone: "info" | "compare" | "swap" | "keep" | "early" | "done";
  msg: string;
};

// The exact Python this component animates. Each frame points at one of these lines.
const CODE: { text: string; indent: number }[] = [
  { text: "def bubble_sort(a):", indent: 0 },
  { text: "n = len(a)", indent: 1 },
  { text: "for p in range(n - 1):", indent: 1 },
  { text: "swapped = False", indent: 2 },
  { text: "for i in range(n - 1 - p):", indent: 2 },
  { text: "if a[i] > a[i + 1]:", indent: 3 },
  { text: "a[i], a[i + 1] = a[i + 1], a[i]", indent: 4 },
  { text: "swapped = True", indent: 4 },
  { text: "if not swapped:", indent: 2 },
  { text: "break", indent: 3 },
  { text: "return a", indent: 1 },
];

const SPEED_MS: Record<BubbleSortSpeed, number> = { 1: 1100, 2: 650, 3: 380, 4: 200, 5: 90 };
const MIN_SIZE = 5;
const MAX_SIZE = 20;
const DEMO = [3, 5, 2, 6, 4, 8, 7, 9, 13, 11, 15, 12, 18, 10, 16, 14, 20, 17, 19, 1];

const clampSize = (n: number) => Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(n)));
const toBars = (vals: number[]): Bar[] => vals.map((v, id) => ({ id, v }));

function randomValues(n: number): number[] {
  const out = Array.from({ length: n }, (_, k) => k + 1);
  for (let k = out.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [out[k], out[j]] = [out[j], out[k]];
  }
  return out;
}

function almostSorted(n: number): number[] {
  const out = Array.from({ length: n }, (_, k) => k + 1);
  // Two small swaps near the front, so the early exit kicks in after a few passes.
  const a = Math.floor(Math.random() * (n - 1));
  [out[a], out[a + 1]] = [out[a + 1], out[a]];
  const b = Math.floor(Math.random() * (n - 1));
  [out[b], out[b + 1]] = [out[b + 1], out[b]];
  return out;
}

// Runs the same bubble_sort as the Python code and records a frame for every step.
function buildFrames(start: Bar[]): Frame[] {
  const a = start.slice();
  const n = a.length;
  const frames: Frame[] = [];
  let compares = 0;
  let swaps = 0;
  let sortedFrom = n;
  const push = (f: Omit<Frame, "order" | "compares" | "swaps" | "sortedFrom">) =>
    frames.push({ ...f, order: a.slice(), compares, swaps, sortedFrom });

  push({ line: 1, p: 0, i: null, swapped: false, tone: "info", msg: `n = len(a) = ${n}. Press Play or Step to start.` });
  let p = 0;
  let early = false;
  for (p = 0; p < n - 1; p++) {
    let swapped = false;
    push({ line: 3, p, i: null, swapped, tone: "info", msg: `Pass ${p} starts. swapped = False. Checking pairs 0 to ${n - 2 - p}.` });
    for (let i = 0; i < n - 1 - p; i++) {
      compares++;
      const x = a[i].v;
      const y = a[i + 1].v;
      const bigger = x > y;
      push({
        line: 5, p, i, swapped, tone: "compare",
        msg: `Is a[${i}] > a[${i + 1}]?  ${x} > ${y} → ${bigger ? "yes, swap them" : "no, leave them"}`,
      });
      if (bigger) {
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
        swaps++;
        swapped = true;
        push({ line: 6, p, i, swapped, tone: "swap", msg: `Swapped. ${y} moves left, ${x} bubbles right. swapped = True` });
      }
    }
    sortedFrom = n - 1 - p;
    if (!swapped) {
      push({ line: 8, p, i: null, swapped, tone: "keep", msg: `Pass ${p} done with no swaps. if not swapped → True` });
      sortedFrom = 0;
      const saved = n - 2 - p;
      push({
        line: 9, p, i: null, swapped, tone: "early",
        msg: `Early exit! No swaps in pass ${p} → break. Saved ${saved} pass${saved === 1 ? "" : "es"}.`,
      });
      early = true;
      break;
    }
    push({ line: 8, p, i: null, swapped, tone: "keep", msg: `Pass ${p} done. ${a[n - 1 - p].v} is in its final spot. swapped = True, keep going.` });
  }
  sortedFrom = 0;
  const passes = early ? p + 1 : n - 1;
  const savedNote = early ? ` Early exit saved ${n - 1 - passes} pass${n - 1 - passes === 1 ? "" : "es"}.` : "";
  push({
    line: 10, p: Math.min(p, n - 2), i: null, swapped: false, tone: "done",
    msg: `Sorted in ${passes} pass${passes === 1 ? "" : "es"}, ${compares} compares and ${swaps} swaps.${savedNote}`,
  });
  return frames;
}

export default function BubbleSortBars({
  values,
  size = 12,
  speed: speedProp = 3,
  autoPlay = false,
  loop = false,
  showCode = true,
  showControls = true,
  onDone,
  className = "",
}: BubbleSortBarsProps) {
  const initial = useMemo(
    () => (values && values.length >= 2 ? values.slice(0, 40) : DEMO.slice(0, clampSize(size))),
    [values, size],
  );
  const [start, setStart] = useState<number[]>(initial);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState<BubbleSortSpeed>(speedProp);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  // Follow prop changes.
  useEffect(() => { setStart(initial); setIdx(0); }, [initial]);
  useEffect(() => { setSpeed(speedProp); }, [speedProp]);

  const frames = useMemo(() => buildFrames(toBars(start)), [start]);
  const last = frames.length - 1;
  const f = frames[Math.min(idx, last)];
  const n = start.length;
  const max = Math.max(...start, 1);
  const finished = idx >= last;

  // Playback timer.
  useEffect(() => {
    if (!playing) return;
    if (finished) {
      if (!loop) { setPlaying(false); return; }
      const t = setTimeout(() => { setStart(randomValues(n)); setIdx(0); }, 1800);
      return () => clearTimeout(t);
    }
    // Hold the early exit moment a bit longer so it can be seen.
    const ms = f.tone === "early" ? Math.max(1400, SPEED_MS[speed] * 3) : SPEED_MS[speed];
    const t = setTimeout(() => setIdx((k) => Math.min(k + 1, last)), ms);
    return () => clearTimeout(t);
  }, [playing, finished, loop, speed, last, n, f.tone, idx]);

  const earlyRun = useMemo(() => frames.some((fr) => fr.tone === "early"), [frames]);
  const showEarly = f.tone === "early" || (finished && earlyRun);

  useEffect(() => {
    if (!finished) return;
    doneRef.current?.({ passes: f.p + 1, compares: f.compares, swaps: f.swaps, earlyExit: earlyRun });
    // Only when a run reaches its end.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, frames, earlyRun]);

  const reset = useCallback((vals: number[]) => {
    setStart(vals);
    setIdx(0);
    setPlaying(false);
  }, []);

  const togglePlay = () => {
    if (finished) { setIdx(0); setPlaying(true); return; }
    setPlaying((v) => !v);
  };
  const step = () => { setPlaying(false); setIdx((k) => Math.min(k + 1, last)); };
  const back = () => { setPlaying(false); setIdx((k) => Math.max(k - 1, 0)); };
  const resize = (d: number) => reset(randomValues(clampSize(n + d)));

  const pair = f.i;
  const role = (pos: number) =>
    pos >= f.sortedFrom ? "sorted"
      : pair !== null && (pos === pair || pos === pair + 1) ? (f.tone === "swap" ? "swap" : "compare")
        : "idle";

  const slot = 100 / n;
  const showNums = n <= 16;

  return (
    <div className={`bsb ${showEarly ? "is-early" : ""} ${className}`} style={{ ["--bsb-ms" as string]: `${Math.min(SPEED_MS[speed], 420)}ms` }}>
      <style>{CSS}</style>
      <div className="bsb-grid">
        <div className="bsb-main">
          <div className="bsb-stats">
            <div className="bsb-stat"><span>Pass p</span><b>{f.p} <small>/ {n - 2}</small></b></div>
            <div className="bsb-stat"><span>Compares</span><b>{f.compares}</b></div>
            <div className="bsb-stat"><span>Swaps</span><b>{f.swaps}</b></div>
            <div className={`bsb-stat ${f.swapped ? "is-true" : ""}`}><span>swapped</span><b>{f.swapped ? "True" : "False"}</b></div>
          </div>

          <div className="bsb-chart" role="img" aria-label={`Bars: ${f.order.map((b) => b.v).join(", ")}`}>
            {f.order.map((b, pos) => (
              <div
                key={b.id}
                className={`bsb-bar is-${role(pos)}`}
                style={{ left: `${pos * slot}%`, width: `${slot}%`, height: `${8 + (b.v / max) * 84}%` }}
              >
                <span className="bsb-fill" />
                {showNums && <span className="bsb-num">{b.v}</span>}
              </div>
            ))}
          </div>
          <div className="bsb-marks" aria-hidden>
            {f.order.map((b, pos) => (
              <span key={b.id + "-m"} style={{ left: `${pos * slot}%`, width: `${slot}%` }} className={pos >= f.sortedFrom ? "is-sorted" : ""}>
                {pair === pos ? "i ▲" : pair !== null && pair + 1 === pos ? "i+1 ▲" : pos >= f.sortedFrom ? "✓" : ""}
              </span>
            ))}
          </div>

          <p className={`bsb-msg is-${f.tone}`} role="status" aria-live="polite">
            {showEarly && <span aria-hidden>⚡ </span>}
            {f.msg}
          </p>
        </div>

        {showCode && (
          <pre className="bsb-code" aria-label="Python bubble sort code">
            {CODE.map((c, k) => (
              <code key={k} className={k === f.line ? "is-on" : ""} style={{ paddingLeft: `${12 + c.indent * 14}px` }}>
                {highlight(c.text)}
              </code>
            ))}
          </pre>
        )}
      </div>

      {showControls && (
        <div className="bsb-ctrls">
          <button type="button" className="bsb-btn is-main" onClick={togglePlay} aria-label={playing ? "Pause" : finished ? "Replay" : "Play"}>
            {playing ? "❚❚ Pause" : finished ? "↺ Replay" : "▶ Play"}
          </button>
          <button type="button" className="bsb-btn" onClick={back} disabled={idx === 0} aria-label="Step back">⏮</button>
          <button type="button" className="bsb-btn" onClick={step} disabled={finished} aria-label="Step forward">⏭ Step</button>
          <button type="button" className="bsb-btn" onClick={() => reset(randomValues(n))}>🔀 Shuffle</button>
          <button type="button" className="bsb-btn" onClick={() => reset(almostSorted(n))}>Almost sorted</button>
          <label className="bsb-btn bsb-range">
            Speed
            <input type="range" min={1} max={5} value={speed} onChange={(e) => setSpeed(Number(e.target.value) as BubbleSortSpeed)} aria-label="Speed" />
          </label>
          <span className="bsb-btn bsb-size">
            <button type="button" onClick={() => resize(-1)} disabled={n <= MIN_SIZE} aria-label="Fewer bars">−</button>
            Size {n}
            <button type="button" onClick={() => resize(1)} disabled={n >= MAX_SIZE} aria-label="More bars">+</button>
          </span>
        </div>
      )}
    </div>
  );
}

// Tiny Python colouring: keywords, the function name, numbers.
function highlight(text: string) {
  return text.split(/(\bdef\b|\bfor\b|\bin\b|\bif not\b|\bif\b|\bbreak\b|\breturn\b|\bTrue\b|\bFalse\b|bubble_sort|range|len|\b\d+\b)/).map((part, k) => {
    if (!part) return null;
    const cls = /^(def|for|in|if not|if|break|return|True|False)$/.test(part) ? "k"
      : /^(bubble_sort|range|len)$/.test(part) ? "f"
        : /^\d+$/.test(part) ? "n" : "";
    return cls ? <span key={k} className={`bsb-${cls}`}>{part}</span> : part;
  });
}

const CSS = `
.bsb{--bsb-ms:380ms;font-family:var(--font-lexend),system-ui,sans-serif;color:#e8ebf5;width:760px;max-width:100%;padding:22px;border-radius:22px;border:1px solid rgba(244,114,182,.25);background:radial-gradient(ellipse at 40% 0%,#1d1a4a 0%,#0b0c18 62%);box-shadow:0 0 50px -24px rgba(244,114,182,.55)}
.bsb *{box-sizing:border-box}
.bsb-grid{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:18px;align-items:start}
.bsb-main{min-width:0}
.bsb-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}
.bsb-stat{min-width:0;padding:9px 14px;border-radius:14px;border:1px solid #262a4d;background:#0f1124}
.bsb-stat span{display:block;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#8b90ad}
.bsb-stat b{display:block;font-size:22px;color:#fff;font-variant-numeric:tabular-nums}
.bsb-stat small{font-size:13px;color:#8b90ad;font-weight:500}
.bsb-stat.is-true{border-color:#f472b6}.bsb-stat.is-true b{color:#f472b6}
.bsb-chart{position:relative;height:280px;margin-top:4px;border-bottom:1px solid #2a2d4a}
.bsb-bar{position:absolute;bottom:0;padding:0 3px;display:flex;flex-direction:column;justify-content:flex-end;transition:left var(--bsb-ms) cubic-bezier(.45,.05,.3,1),height var(--bsb-ms) ease}
.bsb-fill{display:block;height:100%;border-radius:9px 9px 3px 3px;background:linear-gradient(180deg,#6366f1,#38bdf8);transition:background .2s,box-shadow .2s}
.bsb-num{position:absolute;top:-21px;left:0;right:0;text-align:center;font-size:12px;color:#fff;font-variant-numeric:tabular-nums}
.bsb-bar.is-compare .bsb-fill{background:linear-gradient(180deg,#f472b6,#fbbf24);box-shadow:0 0 20px rgba(244,114,182,.6)}
.bsb-bar.is-swap .bsb-fill{background:linear-gradient(180deg,#fb7185,#f472b6);box-shadow:0 0 26px rgba(251,113,133,.85)}
.bsb-bar.is-sorted .bsb-fill{background:linear-gradient(180deg,#10b981,#34d399)}
.bsb.is-early .bsb-bar.is-sorted .bsb-fill{box-shadow:0 0 18px rgba(52,211,153,.55)}
.bsb-marks{position:relative;height:22px;font-size:11px;color:#f472b6}
.bsb-marks span{position:absolute;top:5px;text-align:center;white-space:nowrap}
.bsb-marks span.is-sorted{color:#34d399}
.bsb-msg{margin:10px 0 0;min-height:44px;padding:11px 14px;border-radius:12px;font-size:14px;line-height:1.45;border:1px solid #262a4d;background:#0f1124;color:#cfd3e6}
.bsb-msg.is-compare,.bsb-msg.is-swap{border-color:rgba(244,114,182,.4);background:#1a1030;color:#f9a8d4}
.bsb-msg.is-early{border-color:#34d399;background:linear-gradient(90deg,#064e3b,#0b2a3a);color:#6ee7b7;font-weight:600;animation:bsb-pop .5s ease}
.bsb-msg.is-done{border-color:rgba(52,211,153,.5);color:#a7f3d0}
@keyframes bsb-pop{0%{transform:scale(.97);box-shadow:0 0 0 rgba(52,211,153,0)}50%{transform:scale(1.02);box-shadow:0 0 30px rgba(52,211,153,.5)}100%{transform:scale(1)}}
.bsb-code{margin:0;padding:12px 0;border-radius:14px;border:1px solid #262a4d;background:#090a16;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.8;overflow-x:auto}
.bsb-code code{display:block;white-space:pre;padding-right:14px;color:#9aa0c0;border-left:3px solid transparent;transition:background .15s}
.bsb-code code.is-on{background:rgba(56,189,248,.14);border-left-color:#38bdf8;color:#fff}
.bsb.is-early .bsb-code code.is-on{background:rgba(52,211,153,.16);border-left-color:#34d399}
.bsb-k{color:#c084fc}.bsb-f{color:#38bdf8}.bsb-n{color:#fbbf24}
.bsb-ctrls{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:18px}
.bsb-btn{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 16px;border-radius:999px;border:1px solid #2c3048;background:#12142a;color:#cfd3e6;font:inherit;font-size:14px;cursor:pointer;transition:border-color .15s,background .15s}
.bsb-btn:hover:not(:disabled){border-color:#38bdf8}
.bsb-btn:disabled{opacity:.4;cursor:default}
.bsb-btn:focus-visible,.bsb-size button:focus-visible,.bsb-range input:focus-visible{outline:2px solid #38bdf8;outline-offset:2px}
.bsb-btn.is-main{border:none;background:linear-gradient(90deg,#34d399,#38bdf8);color:#04131a;font-weight:600;min-width:110px;justify-content:center}
.bsb-range{cursor:default}
.bsb-range input{width:90px;accent-color:#38bdf8}
.bsb-size{cursor:default;gap:10px}
.bsb-size button{width:26px;height:26px;border-radius:50%;border:1px solid #2c3048;background:#0b0c18;color:#cfd3e6;font:inherit;cursor:pointer}
.bsb-size button:disabled{opacity:.4;cursor:default}
@media (max-width:880px){.bsb{width:calc(100vw - 120px)}.bsb-grid{grid-template-columns:minmax(0,1fr)}.bsb-chart{height:220px}}
@media (max-width:639px){.bsb{width:calc(100vw - 60px)}}
@media (max-width:480px){.bsb{padding:14px}.bsb-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.bsb-stat b{font-size:18px}.bsb-msg{font-size:13px}.bsb-btn{padding:0 12px;font-size:13px}}
@media (prefers-reduced-motion:reduce){.bsb-bar,.bsb-fill{transition:none}.bsb-msg.is-early{animation:none}}
`;
