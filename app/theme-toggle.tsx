"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Day" },
  { value: "dark", label: "Night" },
];

// Saves the choice in localStorage; the inline script in layout.tsx applies it before first paint.
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  const choose = (next: Theme) => {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("lofistack-theme", next);
    } catch {
      /* storage can be blocked; the choice then lasts for this visit only */
    }
  };

  return (
    <div role="group" aria-label="Colour theme" className="flex border-2 border-white p-0.5 font-[family-name:var(--font-pixel)] text-[10px] uppercase">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={theme === o.value}
          onClick={() => choose(o.value)}
          className={`px-2.5 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pq-coin ${
            theme === o.value ? "bg-pq-coin text-pq-ink" : "text-white hover:bg-white/15"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
