"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import logo from "@/assets/lofistack-logo.png";

export interface CatQuestion {
  id: string;
  question: string;
  /** Answer choices. Leave empty to let the user type an answer instead. */
  options?: string[];
  /** Index of the correct option. Leave undefined for opinion questions (no right or wrong). */
  answerIndex?: number;
  /** Shown after answering. */
  explanation?: string;
  /** Placeholder of the text box for typed answers. */
  placeholder?: string;
}

export interface CatQuizResult {
  score: number;
  total: number;
  answers: { id: string; answer: string; correct: boolean | null }[];
}

export interface LaptopCatQuizProps {
  questions?: CatQuestion[];
  /** Name the cat uses to introduce itself. */
  catName?: string;
  /** Speech shown when the cat first pops out. */
  introText?: string;
  /** Heading on the final screen. */
  doneTitle?: string;
  /** Hue (0 to 360) of buttons and the screen glow. */
  accentHue?: number;
  /** Pop the cat out automatically. When false, the user opens the laptop with a button. */
  autoReveal?: boolean;
  /** Milliseconds before the cat pops out when autoReveal is on. */
  revealDelayMs?: number;
  /** Called after each answer. `correct` is null for typed or opinion answers. */
  onAnswer?: (question: CatQuestion, answer: string, correct: boolean | null) => void;
  /** Called once when every question is answered. */
  onComplete?: (result: CatQuizResult) => void;
  /** Lock the cat and every button. */
  disabled?: boolean;
  /** Keep the cat asleep and show a skeleton while the questions load. */
  loading?: boolean;
  className?: string;
}

const DEFAULT_QUESTIONS: CatQuestion[] = [
  { id: "name", question: "First things first, what should I call you?", placeholder: "Your name" },
  {
    id: "morning",
    question: "Are you a morning person or a night owl?",
    options: ["Morning person", "Night owl", "Depends on the day"],
    explanation: "Both are fine. Cats nap in the day and zoom at night.",
  },
  {
    id: "happy",
    question: "What makes you happiest on a normal day?",
    options: ["Good food", "Time with people I love", "Music", "Quiet time alone"],
  },
  {
    id: "goal",
    question: "What is one thing you want to get better at?",
    placeholder: "Type your answer",
  },
  { id: "thanks", question: "What is one thing you are grateful for today?", placeholder: "Type your answer" },
];

type Phase = "asleep" | "peek" | "asking" | "feedback" | "done";
type Mood = "calm" | "happy" | "sad" | "think";

export default function LaptopCatQuiz({
  questions = DEFAULT_QUESTIONS,
  catName = "Messi",
  introText,
  doneTitle = "All done!",
  accentHue = 265,
  autoReveal = true,
  revealDelayMs = 700,
  onAnswer,
  onComplete,
  disabled = false,
  loading = false,
  className = "",
}: LaptopCatQuizProps) {
  const uid = useId();
  const locked = disabled || loading;
  const [phase, setPhase] = useState<Phase>("asleep");
  const [index, setIndex] = useState(0);
  const [mood, setMood] = useState<Mood>("calm");
  // After the last answer the cat leaps out onto the laptop, then vanishes in a puff.
  const [exit, setExit] = useState<"none" | "hop" | "poof" | "gone">("none");
  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean | null; extra?: string } | null>(null);
  const answers = useRef<CatQuizResult["answers"]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const total = questions.length;
  const q = questions[index];
  const hue = accentHue;
  const grad = `linear-gradient(90deg, hsl(${hue} 85% 62%), hsl(${(hue + 55) % 360} 85% 60%))`;

  // Cat pops out on its own after a short delay (unless it is loading or the caller wants a button).
  useEffect(() => {
    if (!autoReveal || loading || phase !== "asleep") return;
    const id = window.setTimeout(() => setPhase("peek"), revealDelayMs);
    return () => window.clearTimeout(id);
  }, [autoReveal, loading, phase, revealDelayMs]);

  // Keep the screen reader and keyboard user with the new content when the panel changes.
  useEffect(() => {
    if (phase === "asking" || phase === "feedback" || phase === "done") panelRef.current?.focus();
  }, [phase, index]);

  useEffect(() => {
    if (phase !== "done") return;
    setExit("hop");
    const t1 = window.setTimeout(() => setExit("poof"), 1900);
    const t2 = window.setTimeout(() => setExit("gone"), 2500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [phase]);

  const restart = () => {
    setExit("none");
    answers.current = [];
    setIndex(0);
    setTyped("");
    setPicked(null);
    setFeedback(null);
    setMood("calm");
    setPhase("peek");
  };

  const ask = () => {
    if (locked || total === 0) return;
    setMood("think");
    setPhase("asking");
  };

  const submit = (answer: string, choice: number | null) => {
    if (!q) return;
    const correct = q.options && q.answerIndex !== undefined && choice !== null ? choice === q.answerIndex : null;
    answers.current.push({ id: q.id, answer, correct });
    onAnswer?.(q, answer, correct);
    setPicked(choice);
    setMood(correct === true ? "happy" : correct === false ? "sad" : "happy");
    setFeedback({
      ok: correct,
      text: correct === true ? "Purrfect, that is right!" : correct === false ? "Not quite." : "Noted, thank you!",
      extra:
        correct === false && q.options && q.answerIndex !== undefined
          ? `Answer: ${q.options[q.answerIndex]}. ${q.explanation ?? ""}`.trim()
          : q.explanation,
    });
    setPhase("feedback");
  };

  const next = () => {
    if (index + 1 >= total) {
      const scored = answers.current.filter((a) => a.correct !== null);
      onComplete?.({ score: scored.filter((a) => a.correct).length, total, answers: answers.current });
      setMood("happy");
      setPhase("done");
      return;
    }
    setIndex((i) => i + 1);
    setTyped("");
    setPicked(null);
    setFeedback(null);
    setMood("think");
    setPhase("asking");
  };

  const scored = answers.current.filter((a) => a.correct !== null);
  const score = scored.filter((a) => a.correct).length;
  const up = phase !== "asleep" && exit !== "gone";

  const eyes = useMemo(() => {
    const cx = [136, 164];
    if (mood === "happy")
      return cx.map((x) => <path key={x} d={`M${x - 6} 86 Q${x} 78 ${x + 6} 86`} stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" />);
    if (mood === "sad")
      return cx.map((x) => <path key={x} d={`M${x - 6} 82 Q${x} 90 ${x + 6} 82`} stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" />);
    const dy = mood === "think" ? -2 : 0;
    return cx.map((x) => (
      <g key={x} className="llc-blink" style={{ transformOrigin: `${x}px 84px` }}>
        <ellipse cx={x} cy={84} rx="6.5" ry="7.5" fill="#fff7d6" />
        <ellipse cx={x + (mood === "think" ? 2 : 0)} cy={84 + dy} rx="3" ry="5.5" fill="#2b1b0e" />
      </g>
    ));
  }, [mood]);

  const btn =
    "rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-left text-sm font-medium text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50";
  const primary =
    "rounded-full px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div
      aria-busy={loading}
      style={{ fontFamily: "var(--font-lexend)" }}
      className={`${className} llc-root w-full max-w-[420px] text-white ${disabled ? "opacity-60" : ""}`}
    >
      <style>{`
        @keyframes llc-blink { 0%, 92%, 100% { transform: scaleY(1) } 96% { transform: scaleY(.1) } }
        @keyframes llc-tail { 0%, 100% { transform: rotate(-6deg) } 50% { transform: rotate(10deg) } }
        @keyframes llc-ear { 0%, 88%, 100% { transform: rotate(0) } 92% { transform: rotate(-9deg) } 96% { transform: rotate(3deg) } }
        @keyframes llc-pop { from { opacity: 0; transform: translateY(8px) scale(.98) } to { opacity: 1; transform: none } }
        @keyframes llc-glow { 0%, 100% { opacity: .55 } 50% { opacity: 1 } }
        .llc-blink { animation: llc-blink 4.5s infinite; }
        .llc-tail { transform-origin: 196px 96px; animation: llc-tail 2.4s ease-in-out infinite; }
        .llc-earl { transform-origin: 128px 62px; animation: llc-ear 6s infinite; }
        @keyframes llc-hop { 0% { transform: translate(0,0) scale(1) } 12% { transform: translate(0,6px) scale(1) } 32% { transform: translate(0,-66px) scale(.8) } 50% { transform: translate(0,-55px) scale(.75,.72) } 58% { transform: translate(0,-55px) scale(.75) } 72% { transform: translate(0,-72px) scale(.75) } 88%, 100% { transform: translate(0,-55px) scale(.75) } }
        @keyframes llc-poof { 0% { opacity: 1; transform: translate(0,-55px) scale(.75) } 100% { opacity: 0; transform: translate(0,-55px) scale(0) } }
        @keyframes llc-puff { 0% { opacity: .9; transform: scale(.2) } 100% { opacity: 0; transform: scale(1.6) } }
        .llc-hop { transform-origin: 150px 164px; animation: llc-hop 1.8s ease-in-out forwards; }
        .llc-poof { transform-origin: 150px 164px; animation: llc-poof 600ms ease-in forwards; }
        .llc-puff { transform-box: fill-box; transform-origin: center; animation: llc-puff 600ms ease-out forwards; }
        .llc-panel { animation: llc-pop 350ms ease-out; }
        .llc-cat { transition: transform 750ms cubic-bezier(.34,1.5,.64,1); }
        .llc-paw { transition: opacity 300ms ease-out 450ms; }
        .llc-screen { animation: llc-glow 3s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .llc-root *, .llc-root { animation: none !important; transition-duration: 1ms !important; } }
      `}</style>

      {/* speech panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="region"
        aria-live="polite"
        aria-label={`${catName} the cat`}
        key={`${phase}-${index}`}
        className="llc-panel relative min-h-[200px] rounded-3xl border border-white/10 bg-slate-950/75 p-5 shadow-[0_24px_60px_-28px_rgba(120,90,255,.6)] outline-none backdrop-blur-xl"
      >
        {loading ? (
          <div aria-hidden className="space-y-3">
            <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
            <div className="h-10 animate-pulse rounded-xl bg-white/10" />
            <div className="h-10 animate-pulse rounded-xl bg-white/10" />
          </div>
        ) : phase === "asleep" ? (
          <div className="flex h-full min-h-[160px] flex-col items-start justify-center gap-3">
            <p className="text-base font-semibold">Something is stirring inside the laptop...</p>
            {!autoReveal && (
              <button type="button" disabled={locked} onClick={() => setPhase("peek")} className={primary} style={{ background: grad }}>
                Open the laptop
              </button>
            )}
          </div>
        ) : phase === "peek" ? (
          <div className="flex min-h-[160px] flex-col items-start justify-center gap-3">
            <p className="text-base font-semibold">
              {introText ?? `Mewwww... I am ${catName}. Click me, I have ${total} question${total === 1 ? "" : "s"} for you.`}
            </p>
            <button type="button" disabled={locked || total === 0} onClick={ask} className={primary} style={{ background: grad }}>
              Ask me
            </button>
          </div>
        ) : phase === "asking" && q ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
              Question {index + 1} of {total}
            </p>
            <h3 id={`${uid}-q`} className="mt-1 text-base font-semibold leading-snug">
              {q.question}
            </h3>
            {q.options?.length ? (
              <div role="group" aria-labelledby={`${uid}-q`} className="mt-3 grid gap-2">
                {q.options.map((o, i) => (
                  <button key={o} type="button" disabled={locked} onClick={() => submit(o, i)} className={btn}>
                    {o}
                  </button>
                ))}
              </div>
            ) : (
              <form
                className="mt-3 flex flex-col gap-2 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (typed.trim() && !locked) submit(typed.trim(), null);
                }}
              >
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  disabled={locked}
                  aria-labelledby={`${uid}-q`}
                  placeholder={q.placeholder ?? "Type your answer"}
                  className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
                />
                <button type="submit" disabled={locked || !typed.trim()} className={primary} style={{ background: grad }}>
                  Send
                </button>
              </form>
            )}
          </div>
        ) : phase === "feedback" && q && feedback ? (
          <div className="flex min-h-[160px] flex-col items-start justify-center gap-2">
            <p className={`text-base font-semibold ${feedback.ok === true ? "text-emerald-300" : feedback.ok === false ? "text-rose-300" : "text-white"}`}>
              {feedback.text}
            </p>
            {picked !== null && q.options && <p className="text-sm text-white/75">You chose: {q.options[picked]}</p>}
            {feedback.extra && <p className="text-sm text-white/80">{feedback.extra}</p>}
            <button type="button" disabled={locked} onClick={next} className={`${primary} mt-1`} style={{ background: grad }}>
              {index + 1 >= total ? "Finish" : "Next question"}
            </button>
          </div>
        ) : (
          <div className="flex min-h-[160px] flex-col items-start justify-center gap-2">
            <p className="text-lg font-bold">{doneTitle}</p>
            <p className="text-sm text-white/80">
              {scored.length > 0 ? `${catName} says you got ${score} of ${scored.length} right.` : `${catName} saved all ${total} of your answers and vanished in a puff.`}
            </p>
            <button type="button" disabled={locked} onClick={restart} className={`${primary} mt-1`} style={{ background: grad }}>
              Play again
            </button>
          </div>
        )}
        <span aria-hidden className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-white/10 bg-slate-950" />
      </div>

      {/* scene: the cat peeks over the top of the laptop screen */}
      <div className="relative mx-auto mt-1 w-full max-w-[360px]">
        <svg viewBox="0 0 300 210" className="block h-auto w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={`${uid}-scr`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={`hsl(${hue} 70% 28%)`} />
              <stop offset="100%" stopColor={`hsl(${(hue + 60) % 360} 70% 22%)`} />
            </linearGradient>
            <clipPath id={`${uid}-clip`}>
              <rect x="-40" y="-90" width="380" height="280" />
            </clipPath>
          </defs>

          {/* cat (drawn behind the laptop) */}
          <g clipPath={`url(#${uid}-clip)`}>
          <g className="llc-cat" style={{ transform: up ? "translateY(0)" : "translateY(78px)", transition: exit === "gone" ? "none" : undefined }}>
            <g className={exit === "hop" ? "llc-hop" : exit === "poof" || exit === "gone" ? "llc-poof" : ""} style={exit === "gone" ? { opacity: 0 } : undefined}>
            <g className="llc-tail">
              <path d="M196 98 Q232 92 228 62" stroke="#2a2a33" strokeWidth="9" strokeLinecap="round" fill="none" />
            </g>
            <ellipse cx="150" cy="130" rx="40" ry="34" fill="#2a2a33" stroke="#5c5c70" strokeWidth="1.5" />
            <g className="llc-earl">
              <path d="M118 70 L121 38 L146 58 Z" fill="#2a2a33" stroke="#5c5c70" strokeWidth="1.5" />
              <path d="M124 62 L125 47 L137 57 Z" fill="#d9d9e3" />
            </g>
            <path d="M182 70 L179 38 L154 58 Z" fill="#2a2a33" stroke="#5c5c70" strokeWidth="1.5" />
            <path d="M176 62 L175 47 L163 57 Z" fill="#d9d9e3" />
            <ellipse cx="150" cy="140" rx="14" ry="22" fill="#ffffff" />
            <ellipse cx="150" cy="84" rx="36" ry="30" fill="#2a2a33" stroke="#5c5c70" strokeWidth="1.5" />
            <path d="M128 66 L132 76 M150 60 L150 72 M172 66 L168 76" stroke="#4a4a5c" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="150" cy="98" rx="14" ry="10" fill="#ffffff" />
            {eyes}
            <path d="M146 92 L154 92 L150 97 Z" fill="#9a9aa8" />
            {mood === "happy" ? (
              <path d="M142 99 Q150 108 158 99 Q150 103 142 99" fill="#3a3a46" stroke="#3a3a46" strokeWidth="1.5" strokeLinejoin="round" />
            ) : mood === "sad" ? (
              <path d="M143 102 Q150 97 157 102" stroke="#3a3a46" strokeWidth="2" fill="none" strokeLinecap="round" />
            ) : (
              <path d="M150 97 Q147 102 143 100 M150 97 Q153 102 157 100" stroke="#3a3a46" strokeWidth="2" fill="none" strokeLinecap="round" />
            )}
            <path d="M118 92 L100 88 M118 97 L100 99 M182 92 L200 88 M182 97 L200 99" stroke="#fff3e0" strokeOpacity=".8" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          </g>
          </g>

          {/* laptop */}
          <rect x="45" y="100" width="210" height="90" rx="9" fill="#1b1b2b" stroke="#3b3b58" strokeWidth="2" />
          <rect x="53" y="108" width="194" height="74" rx="4" fill={`url(#${uid}-scr)`} className="llc-screen" />
          <rect x="72" y="121" width="156" height="48" rx="8" fill="#fff" fillOpacity=".94" />
          <image href={logo.src} x="85" y="128" width="130" height="34" preserveAspectRatio="xMidYMid meet" />
          <rect x="26" y="190" width="248" height="12" rx="6" fill="#2a2a3f" />
          <rect x="120" y="190" width="60" height="5" rx="2.5" fill="#1b1b2b" />

          {exit === "poof" && (
            <g aria-hidden>
              {[[130, 62], [150, 50], [170, 62], [140, 78], [160, 78]].map(([x, y]) => (
                <circle key={`${x}-${y}`} className="llc-puff" cx={x} cy={y} r="14" fill="#fff" fillOpacity=".85" />
              ))}
            </g>
          )}

          {/* paws gripping the top edge */}
          <g className="llc-paw" style={{ opacity: up && exit === "none" ? 1 : 0, transitionDelay: up ? "450ms" : "0ms" }}>
            <ellipse cx="126" cy="101" rx="11" ry="7" fill="#ffffff" stroke="#9a9aa8" strokeWidth="1" />
            <ellipse cx="174" cy="101" rx="11" ry="7" fill="#ffffff" stroke="#9a9aa8" strokeWidth="1" />
            <path d="M122 100 V104 M127 100 V104 M170 100 V104 M175 100 V104" stroke="#9a9aa8" strokeWidth="1.3" strokeLinecap="round" />
          </g>
        </svg>

        {/* the cat itself is the click target */}
        {up && phase === "peek" && (
          <button
            type="button"
            onClick={ask}
            disabled={locked || total === 0}
            aria-label={`Click ${catName} to start the questions`}
            className="absolute left-[36%] top-[18%] h-[34%] w-[28%] rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed"
          />
        )}
      </div>
    </div>
  );
}
