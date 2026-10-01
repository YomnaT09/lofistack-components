"use client";

import { useEffect, useRef, useState } from "react";

export interface HabitState {
  habit: string;
  /** Seven booleans, Monday first. */
  done: boolean[];
  streak: number;
}

export interface HabitStreakCardProps {
  /** Habit name shown (and editable) at the top. */
  habit?: string;
  /** Small caption above the habit name. */
  title?: string;
  /** Seven short labels for the day buttons, Monday first. */
  dayLabels?: string[];
  /** Which days start ticked, Monday first. Ignored once progress is saved. */
  defaultDone?: boolean[];
  /** Let people rename the habit. */
  editable?: boolean;
  /** Text of the reset button. */
  resetLabel?: string;
  /** Keep progress in localStorage. */
  persist?: boolean;
  /** localStorage key used when `persist` is true. */
  storageKey?: string;
  /** Disable every control. */
  disabled?: boolean;
  /** Show a skeleton and disable the card, e.g. while data loads. */
  loading?: boolean;
  /** Called whenever the habit name or ticks change. */
  onChange?: (state: HabitState) => void;
  className?: string;
}

const DEFAULT_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DEFAULT_KEY = "habit-streak-card:v1";
const R = 44;
const CIRC = 2 * Math.PI * R;

// Everything below uses the viewer's LOCAL timezone (not UTC): the week runs Monday 00:00 to Sunday 23:59
// on their own clock, so it rolls over at their local midnight.
const pad = (n: number) => String(n).padStart(2, "0");
const localISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Monday = 0 ... Sunday = 6
const dayIndex = (d: Date) => (d.getDay() + 6) % 7;
const weekStart = (d: Date) => {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dayIndex(d));
  return localISO(m);
};
const EMPTY = [false, false, false, false, false, false, false];

export default function HabitStreakCard({
  habit: initialHabit = "Deep work, 2 hours",
  title = "This week's habit",
  dayLabels = DEFAULT_LABELS,
  defaultDone = EMPTY,
  editable = true,
  resetLabel = "Reset week",
  persist = true,
  storageKey = DEFAULT_KEY,
  disabled = false,
  loading = false,
  onChange,
  className = "",
}: HabitStreakCardProps) {
  const locked = disabled || loading;
  const [habit, setHabit] = useState(initialHabit);
  const [done, setDone] = useState<boolean[]>(defaultDone);
  const [today, setToday] = useState(-1); // set after mount to avoid a server/client mismatch
  const [week, setWeek] = useState(""); // local Monday of the week the ticks belong to
  const [loaded, setLoaded] = useState(false);
  const [bump, setBump] = useState(0);
  const weekRef = useRef("");

  // Load saved progress. If it belongs to an earlier week, start a fresh week (keep the habit name).
  useEffect(() => {
    const now = new Date();
    const thisWeek = weekStart(now);
    setToday(dayIndex(now));
    weekRef.current = thisWeek;
    setWeek(thisWeek);
    try {
      if (!persist) throw new Error("persist off");
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (saved && typeof saved.habit === "string") setHabit(saved.habit);
      if (saved?.done?.length === 7) setDone(saved.week === thisWeek ? saved.done : saved.week ? EMPTY : saved.done);
    } catch {}
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persist, storageKey]);

  // Keep "today" and the week correct while the page stays open across local midnight.
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const w = weekStart(now);
      setToday(dayIndex(now));
      if (weekRef.current && weekRef.current !== w) setDone(EMPTY);
      weekRef.current = w;
      setWeek(w);
    };
    const id = setInterval(check, 30_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  useEffect(() => {
    if (!persist || !loaded || !week) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ done, habit, week }));
    } catch {}
  }, [done, habit, week, loaded, persist, storageKey]);

  const count = done.filter(Boolean).length;
  const pct = count / 7;

  // Streak: consecutive done days ending today (or yesterday if today isn't done yet).
  let streak = 0;
  const end = today < 0 ? 6 : today;
  let i = done[end] ? end : end - 1;
  while (i >= 0 && done[i]) {
    streak++;
    i--;
  }
  const best = Math.max(
    0,
    ...done.reduce<number[]>((runs, d) => {
      runs.push(d ? (runs.length ? runs[runs.length - 1] : 0) + 1 : 0);
      return runs;
    }, []),
  );

  const toggle = (idx: number) => {
    setDone((d) => d.map((v, j) => (j === idx ? !v : v)));
    setBump((b) => b + 1);
  };

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    if (loaded) onChangeRef.current?.({ habit, done, streak });
  }, [loaded, habit, done, streak]);

  const perfect = count === 7;
  const msg = perfect
    ? "Perfect week. Unstoppable."
    : count === 0
      ? "Tap a day to start your streak."
      : `${7 - count} more day${7 - count > 1 ? "s" : ""} for a perfect week.`;

  return (
    <div style={{ fontFamily: "var(--font-lexend)" }} aria-busy={loading} className={`${className} hs-root relative w-full max-w-[320px] overflow-hidden rounded-[1.75rem] border border-white/15 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-5 shadow-[0_30px_70px_-20px_rgba(0,0,0,.9)] sm:p-6 ${loading ? "animate-pulse" : ""}`}>
      <style>{`
        @media (prefers-reduced-motion: reduce) { .hs-root *, .hs-root { animation: none !important; transition-duration: 1ms !important; } }
        @keyframes hs-flame { 0%,100% { transform: scale(1) rotate(-3deg) } 50% { transform: scale(1.18) rotate(4deg) } }
        @keyframes hs-pop { 0% { transform: scale(.7) } 60% { transform: scale(1.18) } 100% { transform: scale(1) } }
        @keyframes hs-shine { 0% { transform: translateX(-150%) } 100% { transform: translateX(350%) } }
      `}</style>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full blur-3xl transition-colors duration-700"
        style={{ background: perfect ? "#f59e0b" : "#6366f1", opacity: 0.35 }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-white/70">{title}</p>
          <input
            value={habit}
            onChange={(e) => setHabit(e.target.value)}
            maxLength={28}
            readOnly={!editable}
            disabled={locked}
            aria-label="Habit name"
            className="mt-1 w-full rounded bg-transparent text-base font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:opacity-60 sm:text-lg"
          />
        </div>
        <div className="flex items-center gap-1 rounded-full bg-orange-500/15 px-3 py-1.5 text-orange-300">
          <span aria-hidden style={{ display: "inline-block", animation: streak > 0 ? "hs-flame 1.4s ease-in-out infinite" : undefined, filter: streak > 0 ? undefined : "grayscale(1) opacity(.5)" }}>
            🔥
          </span>
          <span key={bump} className="text-sm font-bold tabular-nums" style={{ animation: "hs-pop 350ms ease-out" }}>
            {streak}
          </span>
        </div>
      </div>

      <div className="relative mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:justify-start">
        <div className="relative h-[104px] w-[104px] shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
            <defs>
              <linearGradient id="hs-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={perfect ? "#fbbf24" : "#818cf8"} />
                <stop offset="100%" stopColor={perfect ? "#f97316" : "#e879f9"} />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="9" />
            <circle
              cx="50" cy="50" r={R} fill="none" stroke="url(#hs-grad)" strokeWidth="9" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - pct)}
              style={{ transition: "stroke-dashoffset 600ms cubic-bezier(.3,1.2,.4,1)", filter: "drop-shadow(0 0 6px rgba(129,140,248,.7))" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums text-white">{Math.round(pct * 100)}%</span>
            <span className="text-[10px] uppercase tracking-widest text-white/70">{count}/7 days</span>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/70">Current streak</p>
            <p className="font-semibold text-white">
              {streak} day{streak === 1 ? "" : "s"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/70">Best this week</p>
            <p className="font-semibold text-white">
              {best} day{best === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>

      <div className="relative mt-6 grid grid-cols-7 gap-1.5">
        {dayLabels.slice(0, 7).map((d, idx) => {
          const on = done[idx];
          const isToday = idx === today;
          return (
            <button
              key={idx}
              onClick={() => toggle(idx)}
              disabled={locked}
              aria-pressed={on}
              aria-label={`${WEEKDAYS[idx]}${isToday ? " (today)" : ""}: ${on ? "done" : "not done"}`}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-semibold transition active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                on
                  ? "bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-900/50"
                  : "bg-white/10 text-white/75 hover:bg-white/20"
              } ${isToday ? "ring-2 ring-white/70 ring-offset-2 ring-offset-slate-950" : ""}`}
            >
              <span>{d}</span>
              <span className="text-[10px]" aria-hidden>{on ? "✓" : "·"}</span>
            </button>
          );
        })}
      </div>

      <p className="relative mt-4 text-center text-xs text-white/75">{msg}</p>

      <div className="relative mt-3 flex justify-center">
        <button
          onClick={() => setDone(EMPTY)}
          disabled={locked}
          className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resetLabel}
        </button>
      </div>
    </div>
  );
}
