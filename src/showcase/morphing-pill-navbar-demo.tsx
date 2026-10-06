"use client";

import { useState } from "react";
import MorphingPillNavbar from "./morphing-pill-navbar";

const PAGES: Record<string, { title: string; text: string }> = {
  home: { title: "Welcome back", text: "Your workspace at a glance: tasks, shortcuts and everything new since yesterday." },
  features: { title: "Everything you need", text: "Boards, docs and automations that stay out of your way." },
  pricing: { title: "Simple pricing", text: "Start free, upgrade when your team grows. No surprise fees." },
  docs: { title: "Read the docs", text: "Guides, API references and copy-paste recipes." },
  contact: { title: "Talk to us", text: "Questions? We usually reply within a few hours." },
};

/** Demo wrapper: shows the navbar with a small page area that changes as you navigate. */
export default function MorphingPillNavbarDemo() {
  const [active, setActive] = useState("home");
  const page = PAGES[active];
  return (
    <div className="w-full max-w-[680px]">
      <MorphingPillNavbar activeId={active} onNavigate={(item) => setActive(item.id)} />
      <section
        key={active}
        aria-live="polite"
        className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5"
        style={{ animation: "mpn-fade 400ms ease-out", fontFamily: "var(--font-lexend)" }}
      >
        <style>{`@keyframes mpn-fade { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } } @media (prefers-reduced-motion: reduce) { section[aria-live] { animation: none !important; } }`}</style>
        <h3 className="text-lg font-semibold text-white">{page.title}</h3>
        <p className="mt-1 text-sm text-white/75">{page.text}</p>
      </section>
    </div>
  );
}
