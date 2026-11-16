"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export interface ThermometerRatingProps {
  /** Question shown above the thermometer. */
  question?: string;
  /** Five labels, from coldest (1) to hottest (5). */
  labels?: [string, string, string, string, string];
  /** Rating selected at the start, 1 to 5. */
  defaultValue?: number;
  /** Show the Send button and the thank-you note. */
  showSubmit?: boolean;
  /** Text on the Send button. */
  submitLabel?: string;
  /** Play a soft tick on every level and a chime on send (Web Audio). */
  sound?: boolean;
  /** Lock the rating. */
  disabled?: boolean;
  /** Called whenever the rating settles on a new level. */
  onChange?: (value: number) => void;
  /** Called when Send is pressed. */
  onSubmit?: (value: number) => void;
  className?: string;
}

const DEFAULT_LABELS: [string, string, string, string, string] = ["Freezing", "Chilly", "Okay", "Warm", "On fire!"];

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const toLevel = (f: number) => Math.round(1 + clamp01(f) * 4);
const toFrac = (v: number) => (Math.max(1, Math.min(5, v)) - 1) / 4;
// Cold blue (hue 205) to hot red (hue 0), through teal, yellow and orange.
const hue = (f: number) => 205 - 205 * clamp01(f);

// Tiny Web Audio helper so the component needs no sound files.
let ctx: AudioContext | null = null;
function blip(freq: number, dur = 0.08, vol = 0.06, type: OscillatorType = "triangle", when = 0) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    /* audio is optional */
  }
}

export default function ThermometerRating({
  question = "How did you like this component?",
  labels = DEFAULT_LABELS,
  defaultValue = 4,
  showSubmit = true,
  submitLabel = "Send rating",
  sound = true,
  disabled = false,
  onChange,
  onSubmit,
  className = "",
}: ThermometerRatingProps) {
  const [value, setValue] = useState(() => Math.max(1, Math.min(5, Math.round(defaultValue))));
  const [frac, setFrac] = useState(() => toFrac(defaultValue)); // live mercury height, 0..1
  const [dragging, setDragging] = useState(false);
  const [sent, setSent] = useState(false);
  const [bump, setBump] = useState(0);
  const tubeRef = useRef<HTMLDivElement>(null);
  const lastLevel = useRef(value);
  const labelId = useId();

  useEffect(() => {
    const v = Math.max(1, Math.min(5, Math.round(defaultValue)));
    setValue(v);
    setFrac(toFrac(v));
    lastLevel.current = v;
  }, [defaultValue]);

  const level = toLevel(frac);
  const h = hue(frac);
  const color = `hsl(${h} 85% 55%)`;
  const glow = `hsl(${h} 95% 60% / .55)`;

  // Tick when the live level changes (while dragging or after a key press).
  useEffect(() => {
    if (level !== lastLevel.current) {
      lastLevel.current = level;
      setBump((b) => b + 1);
      if (sound) blip(260 + level * 90);
    }
  }, [level, sound]);

  const commit = (v: number) => {
    setValue(v);
    setFrac(toFrac(v));
    setSent(false);
    if (v !== value) onChange?.(v);
  };

  const fracAt = (clientY: number) => {
    const r = tubeRef.current!.getBoundingClientRect();
    return clamp01((1 - (clientY - r.top) / r.height - 0.08) / 0.92);
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setSent(false);
    setFrac(fracAt(e.clientY));
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging) setFrac(fracAt(e.clientY));
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    commit(toLevel(fracAt(e.clientY)));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const map: Record<string, number> = {
      ArrowUp: value + 1, ArrowRight: value + 1, ArrowDown: value - 1, ArrowLeft: value - 1,
      Home: 1, End: 5, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5,
    };
    const next = map[e.key];
    if (next === undefined) return;
    e.preventDefault();
    commit(Math.max(1, Math.min(5, next)));
  };

  const send = () => {
    if (disabled) return;
    setSent(true);
    onSubmit?.(value);
    if (sound) {
      blip(659, 0.18, 0.07, "sine");
      blip(988, 0.28, 0.07, "sine", 0.1);
    }
  };

  // Face: mouth bends from a frown to a big grin, cheeks blush as it heats up.
  const f = frac;
  const mouthY = 70 + (f - 0.35) * 26;
  const icy = level === 1;
  const hot = level === 5;

  return (
    <div className={`thr ${disabled ? "is-disabled" : ""} ${className}`} style={{ ["--c" as string]: color, ["--glow" as string]: glow, ["--h" as string]: h }}>
      <style>{CSS}</style>
      <p className="thr-q" id={labelId}>{question}</p>

      <div className="thr-body">
        <div
          className={`thr-meter ${dragging ? "is-drag" : ""}`}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-labelledby={labelId}
          aria-valuemin={1}
          aria-valuemax={5}
          aria-valuenow={level}
          aria-valuetext={`${level} of 5, ${labels[level - 1]}`}
          aria-disabled={disabled || undefined}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
        >
          <div className="thr-tube" ref={tubeRef}>
            <div className="thr-merc" style={{ height: `${8 + frac * 92}%` }} data-snap={!dragging || undefined} />
            <div className="thr-shine" aria-hidden />
          </div>
          <div className="thr-bulb" aria-hidden><span /></div>
          <ol className="thr-ticks" aria-hidden>
            {[5, 4, 3, 2, 1].map((n) => (
              <li key={n} className={n === level ? "on" : ""}><i />{n}</li>
            ))}
          </ol>
          {icy && <div className="thr-frost" aria-hidden>{["❄", "✳", "❄", "✳"].map((s, i) => <span key={i} style={{ ["--i" as string]: i, ["--b" as string]: `${46 + (i % 2) * 10}px` }}>{s}</span>)}</div>}
          {hot && <div className="thr-heat" aria-hidden>{[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ ["--i" as string]: i }} />)}</div>}
        </div>

        <div className="thr-side">
          <svg className={`thr-face ${icy ? "is-shiver" : ""} ${hot ? "is-hot" : ""}`} viewBox="0 0 100 100" key={bump} aria-hidden>
            <circle cx="50" cy="52" r="40" fill={`hsl(${h} 80% 72%)`} />
            <circle cx="50" cy="52" r="40" fill="url(#thr-sheen)" />
            <defs>
              <radialGradient id="thr-sheen" cx="35%" cy="30%" r="70%">
                <stop offset="0" stopColor="#fff" stopOpacity=".55" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx="29" cy="64" rx="7" ry="4" fill="#ff5d73" opacity={f * 0.7} />
            <ellipse cx="71" cy="64" rx="7" ry="4" fill="#ff5d73" opacity={f * 0.7} />
            {hot ? (
              <g stroke="#2a1a22" strokeWidth="4" fill="none" strokeLinecap="round">
                <path d="M30 47 q6 -8 12 0" />
                <path d="M58 47 q6 -8 12 0" />
              </g>
            ) : (
              <g fill="#2a1a22">
                <ellipse cx="36" cy="47" rx="4.5" ry={icy ? 3 : 5.5} />
                <ellipse cx="64" cy="47" rx="4.5" ry={icy ? 3 : 5.5} />
              </g>
            )}
            <path
              d={hot ? "M33 64 Q50 86 67 64 Z" : `M35 68 Q50 ${mouthY} 65 68`}
              stroke="#2a1a22"
              strokeWidth="4"
              strokeLinecap="round"
              fill={hot ? "#7a1f2e" : "none"}
            />
            {icy && <path d="M38 74 h24" stroke="#fff" strokeWidth="3" strokeDasharray="3 3" />}
            {hot && <path d="M80 30 q4 7 0 10 q-4 -3 0 -10z" fill="#7fd6ff" />}
          </svg>
          <b className="thr-label" aria-live="polite">{labels[level - 1]}</b>
          <span className="thr-score">{level} / 5</span>

          {showSubmit && (
            sent ? (
              <p className="thr-thanks" role="status">Thanks! Rated {value}/5 <button type="button" onClick={() => setSent(false)}>Change</button></p>
            ) : (
              <button type="button" className="thr-send" onClick={send} disabled={disabled || dragging}>{submitLabel}</button>
            )
          )}
        </div>
      </div>
      <p className="thr-help">Drag the mercury up or down, or use the arrow keys.</p>
    </div>
  );
}

const CSS = `
.thr{--ink:#efe9f8;--mute:#a79cc2;width:100%;max-width:380px;margin:0 auto;padding:22px 22px 16px;border-radius:24px;
  background:radial-gradient(120% 90% at 20% 0%,hsl(var(--h) 60% 30% / .35),transparent 60%),linear-gradient(160deg,#241c33,#17121f);
  border:1px solid #ffffff14;box-shadow:0 18px 40px #0007;color:var(--ink);font-family:inherit;transition:background .4s;user-select:none;-webkit-user-select:none}
.thr.is-disabled{opacity:.6}
.thr-q{margin:0 0 14px;font-weight:700;font-size:16px;text-align:center;text-wrap:balance}
.thr-body{display:flex;align-items:center;justify-content:center;gap:22px}
.thr-meter{position:relative;width:84px;height:262px;flex-shrink:0;cursor:ns-resize;touch-action:none;outline:none;border-radius:18px}
.thr.is-disabled .thr-meter{cursor:default}
.thr-meter:focus-visible{box-shadow:0 0 0 3px #7fd6c2}
.thr-tube{position:absolute;left:22px;top:6px;width:26px;height:210px;border-radius:14px;background:linear-gradient(90deg,#e9e4f0,#fff 45%,#d6cfe0);box-shadow:inset 0 0 0 3px #c9c0d6,0 4px 10px #0005;overflow:hidden}
.thr-merc{position:absolute;left:7px;right:7px;bottom:0;border-radius:7px;background:linear-gradient(90deg,var(--c),hsl(var(--h) 90% 68%) 50%,var(--c));box-shadow:0 0 12px var(--glow);transition:background .25s}
.thr-merc[data-snap]{transition:height .45s cubic-bezier(.34,1.56,.64,1),background .25s}
.thr-shine{position:absolute;left:5px;top:10px;bottom:10px;width:4px;border-radius:2px;background:#ffffffb0}
.thr-bulb{position:absolute;left:10px;bottom:2px;width:50px;height:50px;border-radius:50%;background:#e9e4f0;box-shadow:inset 0 0 0 3px #c9c0d6,0 6px 14px #0006}
.thr-bulb span{position:absolute;inset:7px;border-radius:50%;background:radial-gradient(circle at 35% 35%,hsl(var(--h) 95% 75%),var(--c) 60%);box-shadow:0 0 22px 4px var(--glow);transition:background .25s,box-shadow .25s}
.thr-ticks{position:absolute;left:54px;top:2px;height:204px;margin:0;padding:0;list-style:none;display:flex;flex-direction:column;justify-content:space-between;font-size:12px;font-weight:800;color:var(--mute);font-variant-numeric:tabular-nums}
.thr-ticks li{display:flex;align-items:center;gap:4px;line-height:1;transition:color .2s,transform .2s}
.thr-ticks i{width:8px;height:2px;background:currentColor;border-radius:1px}
.thr-ticks li.on{color:var(--c);transform:translateX(3px)}
.thr-frost span{position:absolute;color:#bfe6ff;font-size:14px;left:calc(4px + var(--i) * 15px);bottom:var(--b);animation:thr-frost 2s ease-in-out infinite;animation-delay:calc(var(--i) * .3s)}
@keyframes thr-frost{50%{opacity:.35;transform:scale(.8) rotate(30deg)}}
.thr-heat span{position:absolute;left:calc(20px + var(--i) * 6px);top:0;width:6px;height:10px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:#ffb347;opacity:0;animation:thr-rise 1.4s ease-out infinite;animation-delay:calc(var(--i) * .25s)}
@keyframes thr-rise{0%{opacity:.9;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-34px) scale(.3)}}
.thr-side{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:130px}
.thr-face{width:104px;height:104px;animation:thr-pop .3s ease-out;filter:drop-shadow(0 6px 10px #0006)}
.thr-face.is-shiver{animation:thr-pop .3s ease-out,thr-shiver .12s linear .3s infinite}
.thr-face.is-hot{animation:thr-pop .3s ease-out,thr-bob 1s ease-in-out .3s infinite}
@keyframes thr-pop{from{transform:scale(.82)}60%{transform:scale(1.08)}}
@keyframes thr-shiver{25%{transform:translateX(-1.5px)}75%{transform:translateX(1.5px)}}
@keyframes thr-bob{50%{transform:translateY(-3px) rotate(-3deg)}}
.thr-label{font-size:22px;font-weight:800;color:var(--c);transition:color .25s;text-align:center}
.thr-score{font-size:13px;font-weight:800;color:var(--mute);font-variant-numeric:tabular-nums}
.thr-send{margin-top:10px;font:inherit;font-weight:800;font-size:14px;color:#1a1020;background:var(--c);border:0;border-radius:999px;padding:9px 18px;cursor:pointer;box-shadow:0 6px 16px var(--glow);transition:background .25s,transform .15s}
.thr-send:hover{transform:translateY(-1px)}
.thr-send:focus-visible{outline:3px solid #fff;outline-offset:2px}
.thr-send:disabled{opacity:.6;cursor:default}
.thr-thanks{margin:10px 0 0;font-size:13px;font-weight:700;text-align:center;color:#7fd6c2}
.thr-thanks button{font:inherit;font-size:12px;color:var(--mute);background:none;border:0;text-decoration:underline;cursor:pointer}
.thr-help{margin:12px 0 0;text-align:center;font-size:12px;color:var(--mute)}
@media (max-width:360px){.thr{padding:18px 12px 14px}.thr-body{gap:10px}.thr-side{min-width:110px}.thr-face{width:88px;height:88px}}
@media (prefers-reduced-motion:reduce){.thr *{animation:none!important;transition:none!important}}
`;
