"use client";

import { useEffect, useRef, useState } from "react";

const PRESETS = [5, 15, 25];
const RING = 100; // arc radius inside the 240px svg
const CIRC = 2 * Math.PI * RING;
const TICKS = 60;
const CONFETTI = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * Math.PI * 2 + (i % 3) * 0.15;
  const dist = 110 + (i % 4) * 28;
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, hue: (i * 47) % 360, size: 6 + (i % 3) * 3, round: i % 2 === 0 };
});

type Status = "idle" | "running" | "paused" | "done";

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function FocusTimerButton() {
  const [minutes, setMinutes] = useState(25);
  const [status, setStatus] = useState<Status>("idle");
  const [left, setLeft] = useState(25 * 60);
  const [sessions, setSessions] = useState(0);
  const [ripple, setRipple] = useState(0);
  const endsAt = useRef(0);

  const total = minutes * 60;

  // Tick from a wall-clock deadline so the countdown stays correct if the tab is throttled.
  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.round((endsAt.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        setStatus("done");
        setSessions((n) => n + 1);
      }
    }, 250);
    return () => clearInterval(id);
  }, [status]);

  const start = () => {
    endsAt.current = Date.now() + left * 1000;
    setStatus("running");
  };
  const reset = () => {
    setStatus("idle");
    setLeft(total);
  };
  const pick = (m: number) => {
    setMinutes(m);
    setLeft(m * 60);
    setStatus("idle");
  };
  const onMain = () => {
    setRipple((r) => r + 1);
    if (status === "running") setStatus("paused");
    else if (status === "done") reset();
    else start();
  };

  const idle = status === "idle";
  const done = status === "done";
  const progress = done ? 1 : total === 0 ? 0 : 1 - left / total;

  // Colour travels indigo -> magenta -> amber as the session progresses.
  const hue = 250 + progress * 140;
  const c1 = `hsl(${hue} 95% 62%)`;
  const c2 = `hsl(${hue + 55} 95% 66%)`;
  const glow = `hsl(${hue} 95% 60%)`;

  const headAngle = progress * Math.PI * 2 - Math.PI / 2;
  const hx = 120 + Math.cos(headAngle) * RING;
  const hy = 120 + Math.sin(headAngle) * RING;

  return (
    <div style={{ fontFamily: "var(--font-verdana)" }} className="relative w-[340px] select-none overflow-hidden rounded-[2rem] border border-white/15 bg-slate-950/80 px-6 pb-5 pt-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]">
      <style>{`
        @keyframes ft-drift-a { 0%,100% { transform: translate(0,0) } 50% { transform: translate(60px,40px) } }
        @keyframes ft-drift-b { 0%,100% { transform: translate(0,0) } 50% { transform: translate(-50px,-30px) } }
        @keyframes ft-spin { to { transform: rotate(360deg) } }
        @keyframes ft-pop { 0% { transform: translate(0,0) scale(.3) rotate(0); opacity: 1 } 100% { transform: translate(var(--x), var(--y)) scale(1) rotate(300deg); opacity: 0 } }
        @keyframes ft-breathe { 0%,100% { transform: scale(1) } 50% { transform: scale(1.035) } }
        @keyframes ft-shine { 0% { transform: translateX(-120%) skewX(-20deg) } 60%,100% { transform: translateX(260%) skewX(-20deg) } }
        @keyframes ft-gradient { 0% { background-position: 0% 50% } 100% { background-position: 300% 50% } }
        @keyframes ft-ripple { 0% { transform: scale(.6); opacity: .7 } 100% { transform: scale(1.9); opacity: 0 } }
        @keyframes ft-fade { from { opacity: 0; transform: scale(.85) } to { opacity: 1; transform: scale(1) } }
      `}</style>

      {/* aurora background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-16 -top-16 h-64 w-64 rounded-full opacity-50 blur-3xl transition-colors duration-1000"
          style={{ background: glow, animation: "ft-drift-a 9s ease-in-out infinite" }}
        />
        <div
          className="absolute -bottom-20 -right-12 h-64 w-64 rounded-full opacity-40 blur-3xl transition-colors duration-1000"
          style={{ background: c2, animation: "ft-drift-b 11s ease-in-out infinite" }}
        />
      </div>

      <div className="relative flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.25em] text-white/60">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: status === "running" ? "#4ade80" : "rgba(255,255,255,.35)", boxShadow: status === "running" ? "0 0 10px #4ade80" : "none" }}
          />
          {status === "running" ? "In the zone" : done ? "Session complete" : status === "paused" ? "Paused" : "Ready to focus"}
        </div>

        <div className="flex gap-2" aria-label="Session length">
          {PRESETS.map((m) => (
            <button
              key={m}
              onClick={() => pick(m)}
              disabled={status === "running"}
              className={`rounded-full border px-3.5 py-1 text-xs backdrop-blur transition disabled:opacity-40 ${
                minutes === m
                  ? "border-white bg-white text-slate-900"
                  : "border-white/15 bg-white/10 text-white/75 hover:bg-white/20"
              }`}
            >
              {m} min
            </button>
          ))}
        </div>

        <div className="relative flex h-[250px] w-full items-center justify-center">
          {/* outer rotating glow that wakes up when the timer runs */}
          <div
            aria-hidden
            className="absolute rounded-full blur-2xl transition-all duration-700"
            style={{
              width: idle ? 210 : 230,
              height: idle ? 70 : 230,
              opacity: idle ? 0.55 : status === "running" ? 0.7 : 0.35,
              background: `conic-gradient(from 0deg, ${c1}, ${c2}, ${c1})`,
              animation: "ft-spin 6s linear infinite",
            }}
          />

          {!idle && (
            <svg
              aria-hidden
              viewBox="0 0 240 240"
              className="pointer-events-none absolute h-[240px] w-[240px]"
              style={{ animation: "ft-fade 500ms ease-out" }}
            >
              <defs>
                <linearGradient id="ft-arc" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={c1} />
                  <stop offset="100%" stopColor={c2} />
                </linearGradient>
              </defs>
              {Array.from({ length: TICKS }, (_, i) => {
                const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
                const long = i % 5 === 0;
                const r1 = 112;
                const r2 = long ? 120 : 117;
                const lit = i / TICKS < progress;
                return (
                  <line
                    key={i}
                    x1={120 + Math.cos(a) * r1}
                    y1={120 + Math.sin(a) * r1}
                    x2={120 + Math.cos(a) * r2}
                    y2={120 + Math.sin(a) * r2}
                    stroke={lit ? c1 : "rgba(255,255,255,.18)"}
                    strokeWidth={long ? 2.2 : 1.2}
                    strokeLinecap="round"
                    style={{ transition: "stroke 400ms", filter: lit ? `drop-shadow(0 0 3px ${c1})` : undefined }}
                  />
                );
              })}
              <circle cx="120" cy="120" r={RING} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="8" />
              <circle
                cx="120" cy="120" r={RING} fill="none" stroke="url(#ft-arc)" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - progress)}
                transform="rotate(-90 120 120)"
                style={{ transition: "stroke-dashoffset 300ms linear", filter: `drop-shadow(0 0 8px ${glow})` }}
              />
              {progress > 0 && !done && (
                <>
                  <circle cx={hx} cy={hy} r="11" fill={glow} opacity=".45" style={{ filter: "blur(4px)" }} />
                  <circle cx={hx} cy={hy} r="5" fill="white" style={{ filter: `drop-shadow(0 0 6px ${glow})` }} />
                </>
              )}
            </svg>
          )}

          {/* click ripple */}
          {ripple > 0 && (
            <span
              key={ripple}
              aria-hidden
              className="pointer-events-none absolute h-[170px] w-[170px] rounded-full border-2"
              style={{ borderColor: glow, animation: "ft-ripple 700ms ease-out forwards" }}
            />
          )}

          {/* the button: pill when idle, orb when running */}
          <button
            onClick={onMain}
            aria-label={status === "running" ? "Pause focus timer" : done ? "Start another session" : "Start focus timer"}
            className="relative flex items-center justify-center overflow-hidden border border-white/20 text-white transition-all duration-700 ease-[cubic-bezier(.34,1.3,.64,1)] active:scale-95"
            style={{
              width: idle ? 200 : 168,
              height: idle ? 60 : 168,
              borderRadius: idle ? 30 : 84,
              background: "#070712",
              animation: status === "running" ? "ft-breathe 4s ease-in-out infinite" : undefined,
              boxShadow: idle ? `0 10px 40px -8px ${c1}` : `inset 0 0 40px -10px ${glow}, 0 0 50px -10px ${glow}`,
            }}
          >
            {/* animated gradient + shine, only on the idle pill */}
            <span
              aria-hidden
              className="absolute inset-0 transition-opacity duration-500"
              style={{
                opacity: idle ? 1 : 0,
                backgroundImage: "linear-gradient(110deg,#6366f1,#d946ef,#f59e0b,#22d3ee,#6366f1)",
                backgroundSize: "300% 100%",
                animation: "ft-gradient 5s linear infinite",
              }}
            />
            {idle && (
              <span
                aria-hidden
                className="absolute inset-y-0 w-10 bg-white/40 blur-md"
                style={{ animation: "ft-shine 2.8s ease-in-out infinite" }}
              />
            )}
            <span className="relative">
              {idle ? (
                <span className="flex items-center gap-2 text-[15px] font-semibold tracking-wide">
                  <span aria-hidden>▶</span> Start focus
                </span>
              ) : done ? (
                <span className="flex flex-col items-center leading-tight">
                  <span className="text-2xl font-semibold">Done!</span>
                  <span className="text-[10px] uppercase tracking-widest text-white/60">tap to go again</span>
                </span>
              ) : (
                <span className="flex flex-col items-center leading-tight">
                  <span
                    className="text-5xl font-semibold tabular-nums"
                    style={{ textShadow: `0 0 24px ${glow}` }}
                  >
                    {fmt(left)}
                  </span>
                  <span className="mt-1 text-[10px] uppercase tracking-[0.3em] text-white/60">
                    {status === "paused" ? "tap to resume" : "tap to pause"}
                  </span>
                </span>
              )}
            </span>
          </button>

          {/* confetti burst on completion */}
          {done &&
            CONFETTI.map((c, i) => (
              <span
                key={i}
                aria-hidden
                className="pointer-events-none absolute"
                style={{
                  width: c.size,
                  height: c.size,
                  borderRadius: c.round ? "50%" : 2,
                  background: `hsl(${c.hue} 90% 60%)`,
                  ["--x" as string]: `${c.x}px`,
                  ["--y" as string]: `${c.y}px`,
                  animation: `ft-pop ${900 + (i % 5) * 120}ms cubic-bezier(.2,.8,.3,1) forwards`,
                }}
              />
            ))}
        </div>

        <div className="flex h-8 w-full items-center justify-between text-xs text-white/55">
          <span>
            Sessions today <b className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-white">{sessions}</b>
          </span>
          {!idle && (
            <button onClick={reset} className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white/80 transition hover:bg-white/20">
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
