"use client";

import { useState } from "react";

export default function GlowBorderButton() {
  const [pressed, setPressed] = useState(false);
  const [clicks, setClicks] = useState(0);

  return (
    <div className="flex flex-col items-center gap-4">
      <style>{`@keyframes glow-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }`}</style>
      <button
        onClick={() => setClicks((c) => c + 1)}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        style={{
          transform: pressed ? "scale(0.95)" : "scale(1)",
          transition: "transform 120ms ease-out",
        }}
        className="group relative overflow-hidden rounded-2xl p-[2px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        {/* spinning conic gradient shows through the 2px padding as the border */}
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[300%] w-[300%] opacity-70 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "conic-gradient(from 0deg, #f43f5e, #f59e0b, #22c55e, #06b6d4, #6366f1, #d946ef, #f43f5e)",
            animation: "glow-spin 3s linear infinite",
            transform: "translate(-50%, -50%)",
          }}
        />
        <span
          aria-hidden
          className="absolute inset-0 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-60"
          style={{ background: "conic-gradient(#f43f5e, #6366f1, #06b6d4, #f43f5e)" }}
        />
        <span className="relative flex items-center gap-2 rounded-[14px] bg-slate-950 px-8 py-3 font-medium text-white">
          Get started
          <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </span>
      </button>
      <p className="text-xs text-white/40">{clicks === 0 ? "Hover and click it" : `Clicked ${clicks} time${clicks > 1 ? "s" : ""}`}</p>
    </div>
  );
}
