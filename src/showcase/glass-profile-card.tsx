"use client";

import { useState } from "react";

export default function GlassProfileCard() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [following, setFollowing] = useState(false);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: py * -10, y: px * 10 });
  };

  return (
    <div className="relative" style={{ perspective: 900 }}>
      <div className="absolute -left-10 -top-8 h-32 w-32 rounded-full bg-fuchsia-500/60 blur-3xl" />
      <div className="absolute -bottom-8 -right-10 h-32 w-32 rounded-full bg-cyan-400/50 blur-3xl" />
      <div
        onMouseMove={onMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: "transform 150ms ease-out",
        }}
        className="relative w-72 rounded-3xl border border-white/20 bg-white/10 p-6 text-center shadow-2xl backdrop-blur-xl"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-400 to-cyan-400 text-2xl font-semibold text-white ring-4 ring-white/20">
          YT
        </div>
        <h3 className="mt-4 text-lg font-semibold text-white">Yomna T.</h3>
        <p className="text-sm text-white/60">Frontend Builder · LofiStack</p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-white">
          {[
            ["30", "Components"],
            ["12", "Agent logs"],
            ["90", "Days"],
          ].map(([n, l]) => (
            <div key={l} className="rounded-xl bg-white/10 py-2">
              <div className="font-semibold">{n}</div>
              <div className="text-[10px] uppercase tracking-wide text-white/55">{l}</div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setFollowing((f) => !f)}
          className={`mt-5 w-full rounded-xl py-2 text-sm font-medium transition ${
            following ? "bg-white/15 text-white" : "bg-white text-slate-900 hover:bg-white/90"
          }`}
        >
          {following ? "Following" : "Follow"}
        </button>
      </div>
    </div>
  );
}
