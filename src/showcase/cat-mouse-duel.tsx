"use client";

import { useEffect, useRef, useState } from "react";

export type DuelSide = "cat" | "mouse";
export type DuelMove = "attack" | "trick" | "dodge";
export type DuelDifficulty = "easy" | "normal" | "hard";

export interface DuelResult {
  /** Side the player chose. */
  side: DuelSide;
  won: boolean;
  /** Hit points left at the end. */
  playerHp: number;
  aiHp: number;
  rounds: number;
}

export interface CatMouseDuelProps {
  /** Skip the side picker and start as this side. */
  defaultSide?: DuelSide;
  /** Hit points each fighter starts with. */
  hp?: number;
  /** How well the AI reads your last move. */
  difficulty?: DuelDifficulty;
  /** Heading of the game card. */
  title?: string;
  /** Called after every round. */
  onRound?: (info: { player: DuelMove; ai: DuelMove; outcome: "win" | "lose" | "clash" }) => void;
  /** Called once when the fight is over. */
  onFinish?: (result: DuelResult) => void;
  /** Lock every button. */
  disabled?: boolean;
  /** Show a skeleton instead of the game. */
  loading?: boolean;
  className?: string;
}

// attack beats trick, trick beats dodge, dodge beats attack
const BEATS: Record<DuelMove, DuelMove> = { attack: "trick", trick: "dodge", dodge: "attack" };
const BEATEN_BY: Record<DuelMove, DuelMove> = { trick: "attack", dodge: "trick", attack: "dodge" };
const MOVES: DuelMove[] = ["attack", "trick", "dodge"];
const READ_CHANCE: Record<DuelDifficulty, number> = { easy: 0.1, normal: 0.35, hard: 0.55 };

const NAMES: Record<DuelSide, Record<DuelMove, string>> = {
  cat: { attack: "Scratch", trick: "Pounce", dodge: "Leap away" },
  mouse: { attack: "Bite", trick: "Trap", dodge: "Scurry" },
};

const other = (s: DuelSide): DuelSide => (s === "cat" ? "mouse" : "cat");
const pick = (): DuelMove => MOVES[Math.floor(Math.random() * MOVES.length)];

function aiMove(level: DuelDifficulty, last: DuelMove | null): DuelMove {
  if (last && Math.random() < READ_CHANCE[level]) return BEATEN_BY[last];
  return pick();
}

function Heart({ full }: { full: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 20 18" className={`h-5 w-5 ${full ? "text-rose-400" : "text-white/20"}`} fill="currentColor">
      <path d="M10 17 2.3 9.4C.3 7.4.3 4.3 2.2 2.4a5 5 0 0 1 7 0l.8.8.8-.8a5 5 0 0 1 7 0c1.9 1.9 1.9 5 0 7z" />
    </svg>
  );
}

function Cat({ mood }: { mood: "normal" | "hurt" | "happy" }) {
  const eye = (x: number) =>
    mood === "hurt" ? (
      <path d={`M${x - 3} -45 l6 6 M${x + 3} -45 l-6 6`} stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    ) : mood === "happy" ? (
      <path d={`M${x - 3.5} -39 Q${x} -46 ${x + 3.5} -39`} stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
    ) : (
      <>
        <ellipse cx={x} cy={-41} rx="3.6" ry="4.2" fill="#fff7d6" />
        <ellipse cx={x + 0.8} cy={-41} rx="1.6" ry="3.4" fill="#2b1b0e" />
      </>
    );
  return (
    <g>
      <path d="M-22 -26 Q-48 -34 -42 -62" stroke="#2a2a33" strokeWidth="7" strokeLinecap="round" fill="none" />
      <ellipse cx="0" cy="-24" rx="27" ry="17" fill="#2a2a33" stroke="#5c5c70" strokeWidth="1.5" />
      <ellipse cx="14" cy="-18" rx="9" ry="12" fill="#fff" opacity=".95" />
      <rect x="-18" y="-12" width="9" height="12" rx="4" fill="#2a2a33" stroke="#5c5c70" strokeWidth="1.2" />
      <rect x="12" y="-12" width="9" height="12" rx="4" fill="#fff" stroke="#9a9aa8" strokeWidth="1" />
      <path d="M14 -55 L17 -72 L28 -60 Z M34 -58 L40 -72 L46 -53 Z" fill="#2a2a33" stroke="#5c5c70" strokeWidth="1.5" />
      <ellipse cx="30" cy="-44" rx="17" ry="14" fill="#2a2a33" stroke="#5c5c70" strokeWidth="1.5" />
      <ellipse cx="38" cy="-37" rx="8" ry="6" fill="#fff" />
      {eye(25)}
      {eye(38)}
      <path d="M41 -39 l4 0 l-2 3 Z" fill="#9a9aa8" />
      <path d="M44 -36 L58 -39 M44 -33 L58 -32" stroke="#fff" strokeOpacity=".8" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
}

function Mouse({ mood }: { mood: "normal" | "hurt" | "happy" }) {
  return (
    <g>
      <path d="M-18 -12 Q-36 -4 -40 -20 Q-42 -28 -34 -26" stroke="#e7a9bd" strokeWidth="3" strokeLinecap="round" fill="none" />
      <ellipse cx="0" cy="-14" rx="19" ry="12" fill="#b9b9cc" stroke="#e5e5f0" strokeWidth="1" />
      <ellipse cx="4" cy="-9" rx="10" ry="6" fill="#ececf5" />
      <rect x="-9" y="-6" width="7" height="6" rx="3" fill="#b9b9cc" />
      <rect x="8" y="-6" width="7" height="6" rx="3" fill="#b9b9cc" />
      <ellipse cx="22" cy="-20" rx="12" ry="9" fill="#b9b9cc" stroke="#e5e5f0" strokeWidth="1" />
      <circle cx="13" cy="-30" r="8" fill="#b9b9cc" stroke="#e5e5f0" strokeWidth="1" />
      <circle cx="13" cy="-30" r="4.6" fill="#e7a9bd" />
      <circle cx="33" cy="-19" r="2.6" fill="#e7a9bd" />
      {mood === "hurt" ? (
        <path d="M22 -26 l5 5 M27 -26 l-5 5" stroke="#1b1b2b" strokeWidth="1.8" strokeLinecap="round" />
      ) : mood === "happy" ? (
        <path d="M22 -21 Q25 -27 28 -21" stroke="#1b1b2b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      ) : (
        <circle cx="25" cy="-23" r="2.4" fill="#1b1b2b" />
      )}
      <path d="M33 -18 L44 -21 M33 -16 L44 -14" stroke="#fff" strokeOpacity=".8" strokeWidth="1" strokeLinecap="round" />
    </g>
  );
}

type Outcome = "win" | "lose" | "clash";

export default function CatMouseDuel({
  defaultSide,
  hp = 3,
  difficulty = "normal",
  title = "Cat vs Mouse",
  onRound,
  onFinish,
  disabled = false,
  loading = false,
  className = "",
}: CatMouseDuelProps) {
  const locked = disabled || loading;
  const [side, setSide] = useState<DuelSide | null>(defaultSide ?? null);
  const [playerHp, setPlayerHp] = useState(hp);
  const [aiHp, setAiHp] = useState(hp);
  const [rounds, setRounds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState("Choose your move.");
  const [lunge, setLunge] = useState<DuelSide | null>(null); // who is lunging right now
  const [hit, setHit] = useState<DuelSide | null>(null); // who just got hurt
  const [clash, setClash] = useState(false);
  const lastMove = useRef<DuelMove | null>(null);
  const timers = useRef<number[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const over = side !== null && (playerHp <= 0 || aiHp <= 0);
  const won = over && playerHp > 0;

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  useEffect(() => {
    if (over) panelRef.current?.focus();
  }, [over]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const start = (s: DuelSide) => {
    if (locked) return;
    setSide(s);
    setPlayerHp(hp);
    setAiHp(hp);
    setRounds(0);
    setLog("Choose your move.");
    lastMove.current = null;
  };

  const reset = (keepSide: boolean) => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setBusy(false);
    setLunge(null);
    setHit(null);
    setClash(false);
    setPlayerHp(hp);
    setAiHp(hp);
    setRounds(0);
    setLog("Choose your move.");
    lastMove.current = null;
    if (!keepSide) setSide(null);
  };

  const play = (move: DuelMove) => {
    if (!side || busy || over || locked) return;
    const ai = aiMove(difficulty, lastMove.current);
    lastMove.current = move;
    const outcome: Outcome = move === ai ? "clash" : BEATS[move] === ai ? "win" : "lose";
    const pName = NAMES[side][move];
    const aName = NAMES[other(side)][ai];
    const attacker = outcome === "win" ? side : outcome === "lose" ? other(side) : null;
    setBusy(true);

    // 1) the winner of the round lunges, 2) the other fighter is hurt, 3) both settle back
    setLunge(attacker);
    setClash(false);
    later(() => {
      setHit(attacker ? other(attacker) : null);
      setClash(outcome === "clash");
      const nextPlayer = outcome === "lose" ? playerHp - 1 : playerHp;
      const nextAi = outcome === "win" ? aiHp - 1 : aiHp;
      setPlayerHp(nextPlayer);
      setAiHp(nextAi);
      setRounds((r) => r + 1);
      setLog(
        outcome === "win"
          ? `Your ${pName} beat their ${aName}! -1 for them.`
          : outcome === "lose"
            ? `Their ${aName} beat your ${pName}! -1 for you.`
            : `Both used ${pName === aName ? pName : `${pName} / ${aName}`}. Clash, nobody is hurt.`,
      );
      onRound?.({ player: move, ai, outcome });
      if (nextPlayer <= 0 || nextAi <= 0) {
        onFinish?.({ side, won: nextAi <= 0, playerHp: nextPlayer, aiHp: nextAi, rounds: rounds + 1 });
      }
    }, 280);
    later(() => {
      setLunge(null);
      setHit(null);
      setClash(false);
      setBusy(false);
    }, 950);
  };

  // Fighters stand on fixed spots: cat on the left, mouse on the right.
  const catIsPlayer = side === "cat";
  const catHp = catIsPlayer ? playerHp : aiHp;
  const mouseHp = catIsPlayer ? aiHp : playerHp;
  const catDown = side !== null && catHp <= 0;
  const mouseDown = side !== null && mouseHp <= 0;
  const mood = (s: DuelSide) => {
    const down = s === "cat" ? catDown : mouseDown;
    if (down || hit === s) return "hurt" as const;
    if (over) return "happy" as const;
    return "normal" as const;
  };
  const catX = 62 + (lunge === "cat" ? 62 : 0);
  const mouseX = 238 - (lunge === "mouse" ? 62 : 0);

  const btn =
    "rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50";
  const primary =
    "rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div
      aria-busy={loading}
      style={{ fontFamily: "var(--font-lexend)" }}
      className={`${className} cmd-root w-full max-w-[420px] rounded-3xl border border-white/10 bg-slate-950/75 p-4 text-white shadow-[0_24px_60px_-28px_rgba(120,90,255,.6)] backdrop-blur-xl sm:p-5 ${disabled ? "opacity-60" : ""}`}
    >
      <style>{`
        @keyframes cmd-shake { 0%, 100% { transform: translateX(0) } 25% { transform: translateX(-6px) } 75% { transform: translateX(6px) } }
        @keyframes cmd-cheer { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-14px) } }
        @keyframes cmd-burst { from { opacity: 1; transform: scale(.3) } to { opacity: 0; transform: scale(1.5) } }
        .cmd-fighter { transition: transform 260ms cubic-bezier(.3,1.3,.6,1); }
        .cmd-shake { animation: cmd-shake 300ms ease-in-out 1; }
        .cmd-cheer { animation: cmd-cheer 700ms ease-in-out infinite; }
        .cmd-burst { transform-box: fill-box; transform-origin: center; animation: cmd-burst 450ms ease-out forwards; }
        @media (prefers-reduced-motion: reduce) { .cmd-root *, .cmd-root { animation: none !important; transition-duration: 1ms !important; } }
      `}</style>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-bold tracking-tight">{title}</h3>
        {side && !over && <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-white/80">Round {rounds + 1}</span>}
      </div>

      {loading ? (
        <div aria-hidden className="mt-4 space-y-3">
          <div className="h-28 animate-pulse rounded-2xl bg-white/10" />
          <div className="h-12 animate-pulse rounded-xl bg-white/10" />
        </div>
      ) : side === null ? (
        <div className="mt-3">
          <p className="text-sm text-white/80">Pick your fighter. The AI plays the other one.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" disabled={locked} onClick={() => start("cat")} className={btn}>
              <span className="block text-base">Play as Cat</span>
              <span className="mt-0.5 block text-xs font-normal text-white/75">AI is the mouse</span>
            </button>
            <button type="button" disabled={locked} onClick={() => start("mouse")} className={btn}>
              <span className="block text-base">Play as Mouse</span>
              <span className="mt-0.5 block text-xs font-normal text-white/75">AI is the cat</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* health */}
          <div className="mt-3 flex items-center justify-between gap-2 text-xs font-semibold text-white/85">
            <div className="flex items-center gap-1">
              <span className="mr-1">{catIsPlayer ? "You (Cat)" : "AI Cat"}</span>
              {Array.from({ length: hp }, (_, i) => (
                <Heart key={i} full={i < catHp} />
              ))}
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: hp }, (_, i) => (
                <Heart key={i} full={i < mouseHp} />
              ))}
              <span className="ml-1">{catIsPlayer ? "AI Mouse" : "You (Mouse)"}</span>
            </div>
          </div>

          {/* arena */}
          <svg viewBox="0 0 300 140" className="mt-2 block h-auto w-full rounded-2xl bg-gradient-to-b from-indigo-950 to-slate-900" role="img" aria-label={`${catIsPlayer ? "Your cat" : "The AI cat"} on the left, ${catIsPlayer ? "the AI mouse" : "your mouse"} on the right`}>
            <rect x="0" y="116" width="300" height="24" fill="#241f3d" />
            <path d="M0 116 H300" stroke="#4b4476" strokeWidth="2" />
            <circle cx="262" cy="26" r="12" fill="#fff3c4" opacity=".9" />
            <g className={catDown ? "" : hit === "cat" ? "cmd-shake" : ""}>
              <g className="cmd-fighter" style={{ transform: `translate(${catX}px, 116px) translate(0px, -18px) scale(1, ${catDown ? -1 : 1}) translate(0px, 18px)` }}>
                <g className={over && !catDown ? "cmd-cheer" : ""}>
                  <Cat mood={mood("cat")} />
                </g>
              </g>
            </g>
            <g className={mouseDown ? "" : hit === "mouse" ? "cmd-shake" : ""}>
              <g className="cmd-fighter" style={{ transform: `translate(${mouseX}px, 116px) translate(0px, -18px) scale(1, ${mouseDown ? -1 : 1}) translate(0px, 18px)` }}>
                <g className={over && !mouseDown ? "cmd-cheer" : ""}>
                  <g transform="scale(-1,1)">
                    <Mouse mood={mood("mouse")} />
                  </g>
                </g>
              </g>
            </g>
            {hit && (
              <g aria-hidden className="cmd-burst" key={`${rounds}-${hit}`}>
                <path
                  d="M0 -12 L3 -4 L11 -6 L6 0 L12 6 L4 5 L1 13 L-3 5 L-11 7 L-6 0 L-12 -6 L-4 -4 Z"
                  transform={`translate(${hit === "cat" ? 100 : 200} 84)`}
                  fill="#fde047"
                />
              </g>
            )}
            {clash && (
              <g aria-hidden className="cmd-burst" key={`c-${rounds}`}>
                <circle cx="150" cy="84" r="14" fill="none" stroke="#fff" strokeWidth="3" />
              </g>
            )}
            <text x={catIsPlayer ? 62 : 238} y="22" textAnchor="middle" fontSize="9" fill="#fff" fillOpacity=".8" fontWeight="700">
              YOU
            </text>
          </svg>

          <div
            ref={panelRef}
            tabIndex={-1}
            role="status"
            aria-live="polite"
            className="mt-3 min-h-[2.5rem] text-center text-sm font-medium text-white/90 outline-none"
          >
            {over ? (
              <span className={`text-base font-bold ${won ? "text-emerald-300" : "text-rose-300"}`}>
                {won ? `You win! The ${side} is the champion.` : `You lose! The AI ${other(side)} wins this one.`}
              </span>
            ) : (
              log
            )}
          </div>

          {over ? (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button type="button" disabled={locked} onClick={() => reset(true)} className={primary}>
                Play again
              </button>
              <button
                type="button"
                disabled={locked}
                onClick={() => reset(false)}
                className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Change side
              </button>
            </div>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {MOVES.map((m) => (
                  <button key={m} type="button" disabled={locked || busy} onClick={() => play(m)} className={btn}>
                    <span className="block">{NAMES[side][m]}</span>
                    <span className="mt-0.5 block text-[11px] font-normal text-white/75">beats {NAMES[side][BEATS[m]]}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center text-[11px] text-white/70">First to empty the other&apos;s hearts wins.</p>
            </>
          )}
        </>
      )}
    </div>
  );
}
