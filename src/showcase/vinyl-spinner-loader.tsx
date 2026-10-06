"use client";

import { useEffect, useState } from "react";

export interface VinylSpinnerLoaderProps {
  /** Progress from 0 to 100. Leave undefined for an endless (indeterminate) loader. */
  progress?: number;
  /** Main line, e.g. what is loading. */
  title?: string;
  /** Second line under the title. */
  subtitle?: string;
  /** Text shown when loading is finished. */
  doneLabel?: string;
  /** Seconds for one full turn of the record. */
  secondsPerTurn?: number;
  /** Hue (0 to 360) of the record label and glow. */
  accentHue?: number;
  /** Set to false to show the finished state (record slows to a stop, arm lifts). */
  loading?: boolean;
  /** Show the pause / resume button. */
  pausable?: boolean;
  /** Called when the user pauses or resumes. */
  onPausedChange?: (paused: boolean) => void;
  /** Disable the pause button and dim the loader. */
  disabled?: boolean;
  className?: string;
}

const clamp = (n: number) => Math.min(100, Math.max(0, n));

export default function VinylSpinnerLoader({
  progress,
  title = "Mixing your playlist",
  subtitle = "Dropping the needle on track 1",
  doneLabel = "Ready to play",
  secondsPerTurn = 1.8,
  accentHue = 275,
  loading = true,
  pausable = true,
  onPausedChange,
  disabled = false,
  className = "",
}: VinylSpinnerLoaderProps) {
  const [paused, setPaused] = useState(false);
  const [wobble, setWobble] = useState(0);
  const determinate = typeof progress === "number";
  const pct = determinate ? clamp(progress) : null;
  const finished = !loading || (pct !== null && pct >= 100);
  const running = !finished && !paused && !disabled;

  // In endless mode the needle drifts slowly across the grooves so it never looks stuck.
  useEffect(() => {
    if (determinate || !running) return;
    const id = window.setInterval(() => setWobble((w) => (w + 1) % 6), 1200);
    return () => window.clearInterval(id);
  }, [determinate, running]);

  // Arm angle: rests off the record, then moves inward as progress grows.
  const arm = finished ? -8 : 8 + (pct !== null ? (pct / 100) * 22 : wobble * 3.5);

  const hue = accentHue;
  const label = finished ? doneLabel : paused ? "Paused" : pct !== null ? `${Math.round(pct)}%` : "Loading";

  const toggle = () => {
    if (disabled || finished) return;
    const next = !paused;
    setPaused(next);
    onPausedChange?.(next);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!finished}
      style={{ fontFamily: "var(--font-lexend)" }}
      className={`${className} vsl-root w-full max-w-[340px] rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-white shadow-[0_24px_60px_-24px_hsla(${hue},90%,60%,.6)] backdrop-blur-xl ${disabled ? "opacity-60" : ""}`}
    >
      <style>{`
        @keyframes vsl-spin { to { transform: rotate(360deg) } }
        .vsl-disc { transform-origin: 100px 100px; animation: vsl-spin ${secondsPerTurn}s linear infinite; animation-play-state: ${running ? "running" : "paused"}; }
        .vsl-slow { animation-duration: ${secondsPerTurn * 6}s; }
        .vsl-arm { transform-origin: 176px 24px; transition: transform 900ms cubic-bezier(.34,1.2,.64,1); }
        @media (prefers-reduced-motion: reduce) { .vsl-disc { animation-duration: ${secondsPerTurn * 8}s; } .vsl-arm { transition-duration: 1ms; } }
      `}</style>

      <div className="relative mx-auto aspect-square w-full max-w-[260px]">
        <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
          <defs>
            <radialGradient id="vsl-label" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={`hsl(${hue} 90% 72%)`} />
              <stop offset="100%" stopColor={`hsl(${(hue + 50) % 360} 85% 52%)`} />
            </radialGradient>
            <linearGradient id="vsl-sheen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity=".0" />
              <stop offset="45%" stopColor="#fff" stopOpacity=".16" />
              <stop offset="55%" stopColor="#fff" stopOpacity=".0" />
              <stop offset="100%" stopColor="#fff" stopOpacity=".1" />
            </linearGradient>
          </defs>

          <g className={`vsl-disc ${finished ? "vsl-slow" : ""}`}>
            <circle cx="100" cy="100" r="92" fill="#0b0b12" stroke="#2a2a3a" strokeWidth="1.5" />
            {[84, 78, 72, 66, 60, 54, 48, 42].map((r, i) => (
              <circle key={r} cx="100" cy="100" r={r} fill="none" stroke={i % 3 === 0 ? "#2b2b3d" : "#181824"} strokeWidth="1" />
            ))}
            <circle cx="100" cy="100" r="30" fill="url(#vsl-label)" />
            <path d="M100 76a24 24 0 0 1 24 24" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" />
            <circle cx="100" cy="100" r="3.5" fill="#0b0b12" />
          </g>
          {/* sheen stays still while the record turns, which sells the spin */}
          <circle cx="100" cy="100" r="92" fill="url(#vsl-sheen)" />

          {/* tonearm */}
          <g className="vsl-arm" style={{ transform: `rotate(${arm}deg)` }}>
            <circle cx="176" cy="24" r="9" fill="#d4d4e0" />
            <circle cx="176" cy="24" r="3.5" fill="#6b6b80" />
            <path d="M176 24 L150 148" stroke="#e5e5f0" strokeWidth="4" strokeLinecap="round" fill="none" />
            <rect x="140" y="144" width="16" height="10" rx="2" transform="rotate(10 148 149)" fill="#fff" />
          </g>
        </svg>
      </div>

      <div className="mt-4 text-center">
        <p className="text-base font-semibold">{finished ? doneLabel : title}</p>
        <p className="mt-0.5 text-sm text-white/75">{finished ? "Needle lifted. Enjoy." : subtitle}</p>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div
          className={`h-full rounded-full ${pct === null && !finished ? "vsl-bar" : ""}`}
          style={{
            width: finished ? "100%" : pct === null ? "35%" : `${pct}%`,
            background: `linear-gradient(90deg, hsl(${hue} 90% 65%), hsl(${(hue + 60) % 360} 90% 65%))`,
            transition: "width 400ms ease-out",
            animation: pct === null && !finished && running ? "vsl-slide 1.6s ease-in-out infinite alternate" : undefined,
          }}
        />
      </div>
      <style>{`@keyframes vsl-slide { from { transform: translateX(0) } to { transform: translateX(185%) } } @media (prefers-reduced-motion: reduce) { .vsl-bar { animation: none !important; } }`}</style>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-sm font-medium tabular-nums text-white/85">{label}</span>
        {pausable && (
          <button
            type="button"
            onClick={toggle}
            disabled={disabled || finished}
            aria-pressed={paused}
            className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {paused ? "Resume" : "Pause"}
          </button>
        )}
      </div>
    </div>
  );
}
