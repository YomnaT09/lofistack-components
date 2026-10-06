"use client";

import { useEffect, useState } from "react";
import VinylSpinnerLoader from "./vinyl-spinner-loader";

/** Demo wrapper: simulates a download so you can watch the needle travel, the finish and a replay. */
export default function VinylSpinnerLoaderDemo() {
  const [progress, setProgress] = useState(0);
  const [run, setRun] = useState(0);
  const [mode, setMode] = useState<"progress" | "endless">("progress");

  useEffect(() => {
    if (mode !== "progress") return;
    setProgress(0);
    const id = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          window.clearInterval(id);
          return 100;
        }
        return Math.min(100, p + 2 + Math.random() * 4);
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [run, mode]);

  const btn =
    "rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

  return (
    <div className="w-full max-w-[340px]" style={{ fontFamily: "var(--font-lexend)" }}>
      <VinylSpinnerLoader progress={mode === "progress" ? progress : undefined} />
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button type="button" className={btn} onClick={() => { setMode("progress"); setRun((r) => r + 1); }}>
          Replay with progress
        </button>
        <button type="button" className={btn} onClick={() => setMode("endless")}>
          Endless mode
        </button>
      </div>
    </div>
  );
}
