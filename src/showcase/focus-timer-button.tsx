"use client";

import { useEffect, useRef, useState } from "react";

const PRESETS = [5, 15, 25];
const R = 54;
const CIRC = 2 * Math.PI * R;
const CONFETTI = ["#f43f5e", "#f59e0b", "#22c55e", "#06b6d4", "#6366f1", "#d946ef"];

type Status = "idle" | "running" | "paused" | "done";

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function FocusTimerButton() {
  const [minutes, setMinutes] = useState(25);
  const [status, setStatus] = useState<Status>("idle");
  const [left, setLeft] = useState(25 * 60);
  const [sessions, setSessions] = useState(0);
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
  const pause = () => setStatus("paused");
  const reset = () => {
    setStatus("idle");
    setLeft(total);
  };
  const pick = (m: number) => {
    setMinutes(m);
    setLeft(m * 60);
    setStatus("idle");
  };

  const idle = status === "idle";
  const progress = total === 0 ? 0 : 1 - left / total;

  return (
    <div className="flex w-72 flex-col items-center gap-6 select-none">
      <style>{`
        @keyframes ft-pop { 0% { transform: translate(0,0) scale(.4); opacity: 1 } 100% { transform: translate(var(--x), var(--y)) scale(1); opacity: 0 } }
        @keyframes ft-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,.5) } 50% { box-shadow: 0 0 0 14px rgba(99,102,241,0) } }
      `}</style>

      <div className="flex gap-2" aria-label="Session length">
        {PRESETS.map((m) => (
          <button
            key={m}
            onClick={() => pick(m)}
            disabled={status === "running"}
            className={`rounded-full px-3 py-1 text-xs transition disabled:opacity-40 ${
              minutes === m ? "bg-white text-slate-900" : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            {m} min
          </button>
        ))}
      </div>

      {/* One element that morphs between a pill button and a circular timer ring. */}
      <div className="relative flex h-40 w-full items-center justify-center">
        <button
          onClick={status === "running" ? pause : status === "done" ? reset : start}
          aria-label={status === "running" ? "Pause focus timer" : status === "done" ? "Start another session" : "Start focus timer"}
          className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-500 to-fuchsia-500 font-medium text-white shadow-xl shadow-indigo-900/50 transition-all duration-500 ease-[cubic-bezier(.34,1.3,.64,1)] hover:brightness-110 active:scale-95"
          style={{
            width: idle ? 190 : 140,
            height: idle ? 56 : 140,
            borderRadius: idle ? 28 : 70,
            animation: idle ? "ft-pulse 2.4s ease-in-out infinite" : undefined,
          }}
        >
          {idle ? (
            <span className="flex items-center gap-2">
              <span aria-hidden>▶</span> Start focus
            </span>
          ) : (
            <>
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden>
                <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="6" />
                <circle
                  cx="60" cy="60" r={R} fill="none" stroke="white" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - progress)}
                  style={{ transition: "stroke-dashoffset 300ms linear" }}
                />
              </svg>
              <span className="relative text-center leading-tight">
                {status === "done" ? (
                  <span className="text-lg">Done!</span>
                ) : (
                  <>
                    <span className="block text-2xl font-semibold tabular-nums">{fmt(left)}</span>
                    <span className="block text-[10px] uppercase tracking-widest text-white/75">
                      {status === "paused" ? "paused · tap" : "focus · tap"}
                    </span>
                  </>
                )}
              </span>
            </>
          )}
        </button>

        {status === "done" &&
          CONFETTI.flatMap((c, i) =>
            [0, 1].map((j) => {
              const angle = ((i * 2 + j) / (CONFETTI.length * 2)) * Math.PI * 2;
              return (
                <span
                  key={`${i}-${j}`}
                  aria-hidden
                  className="pointer-events-none absolute h-2 w-2 rounded-full"
                  style={{
                    background: c,
                    ["--x" as string]: `${Math.cos(angle) * 90}px`,
                    ["--y" as string]: `${Math.sin(angle) * 90}px`,
                    animation: "ft-pop 900ms ease-out forwards",
                  }}
                />
              );
            }),
          )}
      </div>

      <div className="flex h-8 items-center gap-3 text-xs text-white/50">
        <span>
          Sessions today: <b className="text-white/80">{sessions}</b>
        </span>
        {!idle && (
          <button onClick={reset} className="rounded-full bg-white/10 px-3 py-1 text-white/80 hover:bg-white/20">
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
