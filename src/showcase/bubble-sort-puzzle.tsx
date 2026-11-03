"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BubbleSortBars from "@/showcase/bubble-sort-bars";

export interface BubbleSortPuzzleResult {
  level: number;
  bars: number;
  moves: number;
  best: number;
  stars: 1 | 2 | 3;
  seconds: number;
}

export interface BubbleSortPuzzleProps {
  /** Level to start on. Level 1 has 6 bars, each level adds one (up to 14). */
  startLevel?: number;
  /** Show the "Show me how the code does it" button. */
  showWatch?: boolean;
  /** Called when a puzzle is solved. */
  onWin?: (result: BubbleSortPuzzleResult) => void;
  className?: string;
}

type Bar = { id: number; v: number };

const MIN_BARS = 6;
const MAX_BARS = 14;
// Fixed first puzzle so the page renders the same on the server and in the browser.
const FIRST_PUZZLE = [2, 5, 1, 4, 3, 6];

const barsFor = (level: number) => Math.min(MAX_BARS, MIN_BARS + Math.max(0, level - 1));
const toBars = (vals: number[]): Bar[] => vals.map((v, id) => ({ id, v }));

// Number of pairs in the wrong order. This is exactly how many swaps bubble_sort makes,
// and it is also the fewest neighbour swaps any player can sort the list in.
function wrongPairs(vals: number[]): number {
  let c = 0;
  for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) if (vals[i] > vals[j]) c++;
  return c;
}

function shuffled(n: number): number[] {
  let out: number[];
  do {
    out = Array.from({ length: n }, (_, k) => k + 1);
    for (let k = n - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [out[k], out[j]] = [out[j], out[k]];
    }
  } while (wrongPairs(out) < Math.ceil(n / 2)); // never hand out an almost-solved puzzle
  return out;
}

// Same shuffle every time for a given size (used for the first render only).
function seeded(n: number): number[] {
  const out = Array.from({ length: n }, (_, k) => k + 1);
  let s = 7 + n;
  for (let k = n - 1; k > 0; k--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (k + 1);
    [out[k], out[j]] = [out[j], out[k]];
  }
  return out;
}

const starsFor = (moves: number, best: number): 1 | 2 | 3 =>
  moves <= best ? 3 : moves <= best + Math.max(2, Math.ceil(best * 0.25)) ? 2 : 1;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

type Msg = { tone: "info" | "good" | "bad" | "win"; text: string };

export default function BubbleSortPuzzle({
  startLevel = 1,
  showWatch = true,
  onWin,
  className = "",
}: BubbleSortPuzzleProps) {
  const [level, setLevel] = useState(Math.max(1, Math.floor(startLevel)));
  const [start, setStart] = useState<number[]>(() => {
    const n0 = barsFor(startLevel);
    return n0 === FIRST_PUZZLE.length ? FIRST_PUZZLE : seeded(n0);
  });
  const [bars, setBars] = useState<Bar[]>(() => toBars(start));
  const [history, setHistory] = useState<Bar[][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [shake, setShake] = useState<[number, number] | null>(null);
  const [hint, setHint] = useState<number | null>(null);
  const [msg, setMsg] = useState<Msg>({ tone: "info", text: "Tap a bar, then tap the bar next to it to swap them. Sort from small to big." });
  const [watch, setWatch] = useState(false);
  const winRef = useRef(onWin);
  winRef.current = onWin;

  const n = bars.length;
  const vals = bars.map((b) => b.v);
  const best = useMemo(() => wrongPairs(start), [start]);
  const left = wrongPairs(vals);
  const won = left === 0 && moves > 0;
  const stars = won ? starsFor(moves, best) : 0;

  // Bars from the right that are already in their final place.
  let lockedFrom = n;
  while (lockedFrom > 0 && vals[lockedFrom - 1] === lockedFrom && vals.slice(0, lockedFrom - 1).every((v) => v < lockedFrom)) lockedFrom--;

  useEffect(() => {
    if (!running || won) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  useEffect(() => {
    if (!won) return;
    setRunning(false);
    winRef.current?.({ level, bars: n, moves, best, stars: starsFor(moves, best), seconds });
    // Fire once per solved puzzle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  useEffect(() => {
    if (!shake) return;
    const t = setTimeout(() => setShake(null), 550);
    return () => clearTimeout(t);
  }, [shake]);

  useEffect(() => {
    if (hint === null) return;
    const t = setTimeout(() => setHint(null), 1800);
    return () => clearTimeout(t);
  }, [hint]);

  const load = (vals: number[], lvl = level) => {
    setLevel(lvl);
    setStart(vals);
    setBars(toBars(vals));
    setHistory([]);
    setSelected(null);
    setMoves(0);
    setSeconds(0);
    setRunning(false);
    setHint(null);
    setWatch(false);
    setMsg({ tone: "info", text: `Level ${lvl}: ${vals.length} bars. Best possible is ${wrongPairs(vals)} moves.` });
  };

  const swapAt = (a: number) => {
    const x = bars[a].v;
    const y = bars[a + 1].v;
    const next = bars.slice();
    [next[a], next[a + 1]] = [next[a + 1], next[a]];
    setHistory((h) => [...h, bars]);
    setBars(next);
    setMoves((m) => m + 1);
    setSelected(null);
    setHint(null);
    if (!running) setRunning(true);
    const remaining = wrongPairs(next.map((b) => b.v));
    if (x > y) {
      setMsg(remaining === 0
        ? { tone: "win", text: "Sorted!" }
        : { tone: "good", text: `Good swap! ${x} > ${y}, they were in the wrong order. ${remaining} pair${remaining === 1 ? "" : "s"} still wrong.` });
    } else {
      setShake([a, a + 1]);
      setMsg({ tone: "bad", text: `Oops, ${x} < ${y} were already in order. That made it worse (Undo can fix it).` });
    }
  };

  const tap = (pos: number) => {
    if (won) return;
    if (selected === null) {
      setSelected(pos);
      setMsg({ tone: "info", text: `${bars[pos].v} is picked. Now tap a bar right next to it.` });
    } else if (selected === pos) {
      setSelected(null);
      setMsg({ tone: "info", text: "Unpicked. Tap a bar to pick it." });
    } else if (Math.abs(selected - pos) === 1) {
      swapAt(Math.min(selected, pos));
    } else {
      setSelected(pos);
      setMsg({ tone: "bad", text: `Only neighbours can swap, like in bubble sort. Now ${bars[pos].v} is picked.` });
    }
  };

  const onKey = (e: React.KeyboardEvent, pos: number) => {
    // With a bar picked, Left/Right swaps it with that neighbour.
    if (selected !== pos) return;
    if (e.key === "ArrowLeft" && pos > 0) { e.preventDefault(); swapAt(pos - 1); }
    if (e.key === "ArrowRight" && pos < n - 1) { e.preventDefault(); swapAt(pos); }
  };

  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setBars(prev);
    setHistory((h) => h.slice(0, -1));
    setMoves((m) => Math.max(0, m - 1));
    setSelected(null);
    setMsg({ tone: "info", text: "Took back the last move." });
  };

  const showHint = () => {
    // The next pair the Python code would swap: the first a[i] > a[i + 1].
    const i = vals.findIndex((v, k) => k < n - 1 && v > vals[k + 1]);
    if (i < 0) return;
    setHint(i);
    setSelected(null);
    setMsg({ tone: "info", text: `Hint: a[${i}] > a[${i + 1}] (${vals[i]} > ${vals[i + 1]}), so the code would swap these two.` });
  };

  const role = (pos: number) =>
    shake && (pos === shake[0] || pos === shake[1]) ? "bad"
      : selected === pos ? "picked"
        : hint !== null && (pos === hint || pos === hint + 1) ? "hint"
          : won || pos >= lockedFrom ? "locked" : "idle";

  const slot = 100 / n;

  return (
    <div className={`bsp ${className}`}>
      <style>{CSS}</style>
      <div className="bsp-grid">
        <div className="bsp-main">
          <div className="bsp-stats">
            <div className="bsp-stat"><span>Level</span><b>{level}</b></div>
            <div className="bsp-stat"><span>Moves</span><b>{moves}</b></div>
            <div className="bsp-stat is-gold"><span title="Swaps your bubble_sort code makes">Best</span><b>{best}</b></div>
            <div className="bsp-stat"><span>Time</span><b>{fmt(seconds)}</b></div>
          </div>

          <div className="bsp-chart" role="group" aria-label="Bars to sort">
            {bars.map((b, pos) => {
              const r = role(pos);
              return (
                <button
                  key={b.id}
                  type="button"
                  className={`bsp-bar is-${r}`}
                  style={{ left: `${pos * slot}%`, width: `${slot}%`, height: `${10 + (b.v / n) * 82}%` }}
                  onClick={() => tap(pos)}
                  onKeyDown={(e) => onKey(e, pos)}
                  aria-pressed={selected === pos}
                  aria-label={`Bar ${b.v}, position ${pos + 1} of ${n}${selected === pos ? ", picked. Use left or right arrow to swap." : ""}`}
                  disabled={won}
                >
                  <span className="bsp-fill" />
                  <span className="bsp-num">{b.v}</span>
                </button>
              );
            })}
          </div>
          <div className="bsp-marks" aria-hidden>
            {bars.map((b, pos) => {
              const r = role(pos);
              return (
                <span key={b.id + "-m"} style={{ left: `${pos * slot}%`, width: `${slot}%` }} className={`is-${r}`}>
                  {r === "picked" ? "picked" : r === "hint" ? "💡" : r === "locked" && !won ? "✓" : ""}
                </span>
              );
            })}
          </div>

          <p className={`bsp-msg is-${won ? "win" : msg.tone}`} role="status" aria-live="polite">
            {won ? `Sorted in ${moves} moves and ${fmt(seconds)}. Your code needs ${best}.` : msg.text}
          </p>
        </div>

        <aside className={`bsp-side ${won ? "is-won" : ""}`}>
          {won ? (
            <>
              <p className="bsp-kicker">You did it</p>
              <p className="bsp-stars" aria-label={`${stars} of 3 stars`}>
                {[1, 2, 3].map((k) => <span key={k} className={k <= stars ? "on" : ""}>★</span>)}
              </p>
              <p className="bsp-side-text">
                {stars === 3 ? `${moves} moves, same as bubble_sort. Perfect!` : `${moves} moves. The code did it in ${best}. Try for 3 stars!`}
              </p>
              <div className="bsp-side-btns">
                <button type="button" className="bsp-btn is-main" onClick={() => load(shuffled(barsFor(level + 1)), level + 1)}>Next level →</button>
                <button type="button" className="bsp-btn" onClick={() => load(start)}>Try again</button>
              </div>
            </>
          ) : (
            <>
              <p className="bsp-kicker">How to win</p>
              <p className="bsp-stars" aria-hidden><span className="on">★</span><span className="on">★</span><span className="on">★</span></p>
              <p className="bsp-side-text">3 stars = same moves as the code, 2 = a few extra, 1 = sorted.</p>
              <p className="bsp-side-note">❌ A swap that makes it worse shakes red and still counts as a move.<br />💡 Hint lights up the next pair your code would swap.</p>
            </>
          )}
          <pre className="bsp-rule">Rule from your code:{"\n"}<b>if a[i] &gt; a[i + 1]: swap</b></pre>
        </aside>
      </div>

      <div className="bsp-ctrls">
        <button type="button" className="bsp-btn" onClick={showHint} disabled={won}>💡 Hint</button>
        <button type="button" className="bsp-btn" onClick={undo} disabled={!history.length || won}>↶ Undo</button>
        <button type="button" className="bsp-btn" onClick={() => load(shuffled(n))}>🔀 New puzzle</button>
        <span className="bsp-btn bsp-level">
          <button type="button" onClick={() => load(shuffled(barsFor(level - 1)), level - 1)} disabled={level <= 1} aria-label="Easier level">−</button>
          Level {level}: {n} bars
          <button type="button" onClick={() => load(shuffled(barsFor(level + 1)), level + 1)} disabled={barsFor(level) >= MAX_BARS} aria-label="Harder level">+</button>
        </span>
        {showWatch && (
          <button type="button" className="bsp-btn is-main" onClick={() => setWatch((w) => !w)} aria-expanded={watch}>
            {watch ? "✕ Hide the code run" : "▶ Show me how the code does it"}
          </button>
        )}
      </div>

      {showWatch && watch && (
        <div className="bsp-watch">
          <p className="bsp-kicker">Your bubble_sort on this same puzzle</p>
          <BubbleSortBars values={start} autoPlay speed={3} />
        </div>
      )}
    </div>
  );
}

const CSS = `
.bsp{font-family:var(--font-lexend),system-ui,sans-serif;color:#e8ebf5;width:760px;max-width:100%;padding:22px;border-radius:22px;border:1px solid rgba(251,191,36,.28);background:radial-gradient(ellipse at 40% 0%,#1d1a4a 0%,#0b0c18 62%);box-shadow:0 0 50px -24px rgba(251,191,36,.5)}
.bsp *{box-sizing:border-box}
.bsp-grid{display:grid;grid-template-columns:minmax(0,1fr) 230px;gap:18px;align-items:start}
.bsp-main{min-width:0}
.bsp-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}
.bsp-stat{min-width:0;padding:9px 14px;border-radius:14px;border:1px solid #262a4d;background:#0f1124}
.bsp-stat span{display:block;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#8b90ad;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bsp-stat b{display:block;font-size:22px;color:#fff;font-variant-numeric:tabular-nums}
.bsp-stat.is-gold{border-color:#fbbf24}.bsp-stat.is-gold b{color:#fbbf24}
.bsp-chart{position:relative;height:290px;border-bottom:1px solid #2a2d4a}
.bsp-bar{position:absolute;bottom:0;padding:0 4px;margin:0;border:0;background:none;cursor:pointer;display:flex;flex-direction:column;justify-content:flex-end;transition:left .28s cubic-bezier(.45,.05,.3,1),transform .2s;font:inherit;color:inherit;-webkit-tap-highlight-color:transparent}
.bsp-bar:disabled{cursor:default}
.bsp-fill{display:block;height:100%;border-radius:11px 11px 4px 4px;background:linear-gradient(180deg,#6366f1,#38bdf8);transition:background .2s,box-shadow .2s,outline-color .2s;outline:3px solid transparent;outline-offset:3px}
.bsp-bar:hover:not(:disabled) .bsp-fill{box-shadow:0 0 18px rgba(56,189,248,.5)}
.bsp-bar:focus-visible{outline:none}
.bsp-bar:focus-visible .bsp-fill{outline-color:#38bdf8}
.bsp-num{position:absolute;top:-25px;left:0;right:0;text-align:center;font-size:15px;font-weight:700;color:#fff;font-variant-numeric:tabular-nums}
.bsp-bar.is-picked{transform:translateY(-12px)}
.bsp-bar.is-picked .bsp-fill{background:linear-gradient(180deg,#f472b6,#fbbf24);outline-color:#fff;box-shadow:0 0 26px rgba(244,114,182,.7)}
.bsp-bar.is-hint .bsp-fill{background:linear-gradient(180deg,#fde68a,#fbbf24);box-shadow:0 0 24px rgba(251,191,36,.7);animation:bsp-pulse .6s ease-in-out infinite alternate}
.bsp-bar.is-locked .bsp-fill{background:linear-gradient(180deg,#10b981,#34d399)}
.bsp-bar.is-bad .bsp-fill{background:linear-gradient(180deg,#ef4444,#fb7185);box-shadow:0 0 24px rgba(239,68,68,.7)}
.bsp-bar.is-bad{animation:bsp-shake .45s}
@keyframes bsp-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes bsp-pulse{to{box-shadow:0 0 6px rgba(251,191,36,.3)}}
.bsp-marks{position:relative;height:22px;font-size:12px}
.bsp-marks span{position:absolute;top:5px;text-align:center;white-space:nowrap}
.bsp-marks .is-picked{color:#f9a8d4}.bsp-marks .is-locked{color:#34d399}
.bsp-msg{margin:10px 0 0;min-height:44px;padding:11px 14px;border-radius:12px;font-size:14px;line-height:1.45;border:1px solid #262a4d;background:#0f1124;color:#cfd3e6}
.bsp-msg.is-good{border-color:rgba(52,211,153,.45);color:#a7f3d0}
.bsp-msg.is-bad{border-color:rgba(251,113,133,.5);background:#1f0d18;color:#fda4af}
.bsp-msg.is-win{border-color:#fbbf24;background:linear-gradient(90deg,#3a2a06,#0f1124);color:#fde68a;font-weight:600}
.bsp-side{padding:16px;border-radius:16px;border:1px solid #262a4d;background:#0f1124}
.bsp-side.is-won{border-color:#fbbf24;box-shadow:0 0 30px -10px rgba(251,191,36,.6);animation:bsp-pop .5s ease}
@keyframes bsp-pop{0%{transform:scale(.96)}60%{transform:scale(1.03)}100%{transform:scale(1)}}
.bsp-kicker{margin:0 0 8px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#8b90ad}
.bsp-stars{margin:0;font-size:30px;letter-spacing:4px;color:#3a3d5c}
.bsp-stars .on{color:#fbbf24;text-shadow:0 0 14px rgba(251,191,36,.5)}
.bsp-side-text{margin:6px 0 0;font-size:14px;line-height:1.5;color:#cfd3e6}
.bsp-side-note{margin:12px 0 0;padding-top:12px;border-top:1px solid #23264a;font-size:12.5px;line-height:1.6;color:#8b90ad}
.bsp-side-btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.bsp-rule{margin:14px 0 0;padding:10px 12px;border-radius:12px;border:1px solid #23264a;background:#090a16;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.7;color:#8b90ad;white-space:pre-wrap}
.bsp-rule b{color:#fff;font-weight:500}
.bsp-ctrls{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:18px}
.bsp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:999px;border:1px solid #2c3048;background:#12142a;color:#cfd3e6;font:inherit;font-size:14px;cursor:pointer;transition:border-color .15s}
.bsp-btn:hover:not(:disabled){border-color:#fbbf24}
.bsp-btn:disabled{opacity:.4;cursor:default}
.bsp-btn:focus-visible,.bsp-level button:focus-visible{outline:2px solid #38bdf8;outline-offset:2px}
.bsp-btn.is-main{border:none;background:linear-gradient(90deg,#34d399,#38bdf8);color:#04131a;font-weight:600}
.bsp-level{cursor:default;gap:10px}
.bsp-level button{width:26px;height:26px;border-radius:50%;border:1px solid #2c3048;background:#0b0c18;color:#cfd3e6;font:inherit;cursor:pointer}
.bsp-level button:disabled{opacity:.4;cursor:default}
.bsp-watch{margin-top:20px;padding-top:18px;border-top:1px solid #23264a}
.bsp-watch .bsb{width:100%;max-width:100%}
@media (max-width:880px){.bsp{width:calc(100vw - 120px)}.bsp-grid{grid-template-columns:minmax(0,1fr)}.bsp-chart{height:230px}}
@media (max-width:639px){.bsp{width:calc(100vw - 60px)}}
@media (max-width:480px){.bsp{padding:14px}.bsp-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.bsp-stat b{font-size:18px}.bsp-msg{font-size:13px}.bsp-btn{padding:0 12px;font-size:13px}.bsp-num{font-size:12px}}
@media (prefers-reduced-motion:reduce){.bsp-bar,.bsp-fill{transition:none}.bsp-bar.is-bad,.bsp-bar.is-hint .bsp-fill,.bsp-side.is-won{animation:none}}
`;
