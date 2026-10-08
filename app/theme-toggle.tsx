"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Default" },
];

// Saves the choice in localStorage; the inline script in layout.tsx applies it before first paint.
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
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
    <div role="group" aria-label="Colour theme" className="flex rounded-md border border-acc1/50 p-0.5 font-mono text-xs uppercase tracking-wider">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={theme === o.value}
          onClick={() => choose(o.value)}
          className={`rounded px-2.5 py-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-acc2 ${
            theme === o.value ? "bg-acc2 text-[rgb(var(--on-acc2))]" : "text-acc1-soft hover:bg-acc1/10"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
