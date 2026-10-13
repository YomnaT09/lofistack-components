"use client";

import { useEffect, useRef, useState } from "react";

export interface LoaderStep {
  id: string;
  label: string;
  /** Small text under the label while this step runs. */
  description?: string;
}

export interface ProgressStepsLoaderProps {
  steps?: LoaderStep[];
  /** Index of the step that is running. Steps before it are done. Use steps.length for "all done". */
  current?: number;
  /** Index of a step that failed. It shows an error and a Retry button. */
  failedIndex?: number | null;
  /** Demo mode: move through the steps on a timer. Ignores `current` and `failedIndex`. */
  autoPlay?: boolean;
  /** Milliseconds each step takes in autoPlay. */
  stepMs?: number;
  /** In autoPlay, make this step fail on its first try to show the retry flow. */
  demoFailAt?: number | null;
  title?: string;
  doneText?: string;
  onRetry?: (index: number) => void;
  onComplete?: () => void;
  className?: string;
}

const DEFAULT_STEPS: LoaderStep[] = [
  { id: "upload", label: "Upload", description: "Sending your file to Messi" },
  { id: "process", label: "Process", description: "Counting every whisker" },
  { id: "review", label: "Review", description: "Checking for naps" },
  { id: "publish", label: "Publish", description: "Almost there" },
];

export default function ProgressStepsLoader({
  steps = DEFAULT_STEPS,
  current = 0,
  failedIndex = null,
  autoPlay = false,
  stepMs = 1500,
  demoFailAt = null,
  title = "Publishing your post",
  doneText = "All done",
  onRetry,
  onComplete,
  className = "",
}: ProgressStepsLoaderProps) {
  const [auto, setAuto] = useState({ i: 0, failed: false });
  const failedOnce = useRef(false);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  const idx = autoPlay ? auto.i : Math.max(0, Math.min(current, steps.length));
  const failed = autoPlay ? (auto.failed ? auto.i : null) : failedIndex;
  const done = idx >= steps.length && failed === null;

  // Demo timer: finish one step per tick, stop on a failure until Retry is pressed.
  useEffect(() => {
    if (!autoPlay || auto.failed || auto.i >= steps.length) return;
    const t = setTimeout(() => {
      if (demoFailAt === auto.i && !failedOnce.current) {
        failedOnce.current = true;
        setAuto({ i: auto.i, failed: true });
      } else {
        setAuto({ i: auto.i + 1, failed: false });
      }
    }, stepMs);
    return () => clearTimeout(t);
  }, [autoPlay, auto, steps.length, stepMs, demoFailAt]);

  useEffect(() => {
    if (done) completeRef.current?.();
  }, [done]);

  const retry = (i: number) => {
    if (autoPlay) setAuto({ i, failed: false });
    onRetry?.(i);
  };
  const replay = () => {
    failedOnce.current = false;
    setAuto({ i: 0, failed: false });
  };

  const status = (i: number): "done" | "running" | "failed" | "todo" =>
    failed === i ? "failed" : i < idx ? "done" : i === idx && !done ? "running" : "todo";

  const message = done
    ? doneText
    : failed !== null
      ? `${steps[failed]?.label} failed`
      : `Step ${idx + 1} of ${steps.length}: ${steps[idx]?.label}`;

  return (
    <div className={`psl ${className}`}>
      <style>{CSS}</style>
      <p className="psl-title">{title}</p>
      <ol className="psl-list">
        {steps.map((s, i) => {
          const st = status(i);
          return (
            <li key={s.id} className={`psl-step is-${st}`} aria-current={st === "running" ? "step" : undefined}>
              <span className="psl-line" aria-hidden><span className="psl-fill" /></span>
              <span className="psl-node" aria-hidden>
                {st === "done" ? "✓" : st === "failed" ? "!" : st === "running" ? <span className="psl-spin" /> : i + 1}
              </span>
              <span className="psl-text">
                <span className="psl-label">{s.label}</span>
                <span className="psl-desc">
                  {st === "running" && s.description}
                  {st === "failed" && "Something went wrong"}
                  {st === "done" && "Done"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="psl-foot">
        <p className="psl-msg" role="status">{message}</p>
        {failed !== null && (
          <button type="button" className="psl-btn" onClick={() => retry(failed)}>Retry</button>
        )}
        {autoPlay && done && (
          <button type="button" className="psl-btn" onClick={replay}>Replay</button>
        )}
      </div>
    </div>
  );
}

const CSS = `
.psl{font-family:var(--font-lexend),system-ui,sans-serif;color:#e8ebf5;width:100%;max-width:560px;padding:20px;border-radius:18px;border:1px solid rgba(56,189,248,.35);background:#0f1226;box-shadow:0 0 40px -18px rgba(251,113,133,.6)}
.psl *{box-sizing:border-box}
.psl-title{margin:0 0 18px;font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#7dd3fc}
.psl-list{list-style:none;margin:0;padding:0;display:flex}
.psl-step{position:relative;flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px}
.psl-line{position:absolute;top:15px;left:calc(-50% + 18px);width:calc(100% - 36px);height:3px;border-radius:2px;background:rgba(255,255,255,.1);overflow:hidden}
.psl-step:first-child .psl-line{display:none}
.psl-fill{display:block;height:100%;width:0;background:linear-gradient(90deg,#fb7185,#38bdf8);transition:width .6s ease}
.psl-step.is-done .psl-fill,.psl-step.is-running .psl-fill,.psl-step.is-failed .psl-fill{width:100%}
.psl-step.is-running .psl-fill{width:50%}
.psl-node{position:relative;z-index:1;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-size:14px;font-weight:700;border:2px solid rgba(255,255,255,.2);background:#0f1226;color:#9aa2b8;transition:background .3s,border-color .3s,color .3s,box-shadow .3s}
.psl-step.is-done .psl-node{background:#38bdf8;border-color:#38bdf8;color:#0f1226}
.psl-step.is-running .psl-node{border-color:#fb7185;color:#fb7185;box-shadow:0 0 16px -2px #fb7185}
.psl-step.is-failed .psl-node{background:#ef4444;border-color:#ef4444;color:#fff}
.psl-spin{width:14px;height:14px;border-radius:50%;border:2px solid rgba(251,113,133,.3);border-top-color:#fb7185;animation:psl-spin .8s linear infinite}
@keyframes psl-spin{to{transform:rotate(360deg)}}
.psl-text{display:flex;flex-direction:column;gap:2px;min-width:0;padding-inline:2px}
.psl-label{font-size:14px;font-weight:600}
.psl-desc{font-size:12px;color:#8a92aa;min-height:1.4em;overflow-wrap:anywhere}
.psl-step.is-todo .psl-label{color:#9aa2b8;font-weight:500}
.psl-step.is-failed .psl-desc{color:#fca5a5}
.psl-foot{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)}
.psl-msg{margin:0;font-size:13px;color:#cbd2e6}
.psl-btn{padding:7px 14px;border-radius:9px;border:1px solid #38bdf8;background:rgba(56,189,248,.14);color:#e8ebf5;font:inherit;font-size:13px;cursor:pointer}
.psl-btn:hover{background:rgba(56,189,248,.28)}
.psl-btn:focus-visible{outline:2px solid #fb7185;outline-offset:2px}
@media (max-width:480px){
.psl-list{flex-direction:column;gap:0}
.psl-step{flex-direction:row;text-align:left;align-items:flex-start;gap:12px;padding-bottom:16px}
.psl-line{top:calc(-100% + 34px);left:15px;width:3px;height:calc(100% - 32px)}
.psl-fill{width:100%;height:0;transition:height .6s ease}
.psl-step.is-done .psl-fill,.psl-step.is-failed .psl-fill{height:100%;width:100%}
.psl-step.is-running .psl-fill{height:50%;width:100%}
}
@media (prefers-reduced-motion:reduce){.psl *{transition:none!important}.psl-spin{animation-duration:2.4s}}
`;
