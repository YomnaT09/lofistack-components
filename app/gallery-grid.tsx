"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { registry, type ComponentType_ } from "@/lib/registry";
import { THEMES, type GalleryVariant } from "./themes";

// One accent per component type, used on the badge and the card glow.
const TYPE_STYLE: Record<ComponentType_, { badge: string; dot: string }> = {
  button: { badge: "border-indigo-400/40 bg-indigo-400/10 text-indigo-200", dot: "bg-indigo-400" },
  form: { badge: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200", dot: "bg-emerald-400" },
  card: { badge: "border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-200", dot: "bg-fuchsia-400" },
  modal: { badge: "border-violet-400/40 bg-violet-400/10 text-violet-200", dot: "bg-violet-400" },
  navbar: { badge: "border-sky-400/40 bg-sky-400/10 text-sky-200", dot: "bg-sky-400" },
  table: { badge: "border-lime-400/40 bg-lime-400/10 text-lime-200", dot: "bg-lime-400" },
  loader: { badge: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200", dot: "bg-cyan-400" },
  section: { badge: "border-amber-400/40 bg-amber-400/10 text-amber-200", dot: "bg-amber-400" },
  chart: { badge: "border-orange-400/40 bg-orange-400/10 text-orange-200", dot: "bg-orange-400" },
  input: { badge: "border-teal-400/40 bg-teal-400/10 text-teal-200", dot: "bg-teal-400" },
};

export default function GalleryGrid({ variant = "aurora" }: { variant?: GalleryVariant }) {
  const t = THEMES[variant];
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ComponentType_ | "all">("all");

  const types = useMemo(() => {
    const counts = new Map<ComponentType_, number>();
    registry.forEach((c) => counts.set(c.type, (counts.get(c.type) ?? 0) + 1));
    return [...counts.entries()];
  }, []);

  const q = query.trim().toLowerCase();
  const shown = registry
    .map((item, i) => ({ item, n: i + 1 }))
    .filter(({ item }) => (type === "all" || item.type === type) && (!q || `${item.name} ${item.description} ${item.type}`.toLowerCase().includes(q)));

  const chip = (active: boolean) =>
    `inline-flex items-center gap-1.5 border px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${t.focus} ${
      variant === "aurora" || variant === "paper" ? "rounded-full" : ""
    } ${active ? t.chipOn : t.chipOff}`;

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={type === "all"} onClick={() => setType("all")} className={chip(type === "all")}>
            All <span className={type === "all" ? t.chipCount[0] : t.chipCount[1]}>{registry.length}</span>
          </button>
          {types.map(([tp, count]) => (
            <button key={tp} type="button" aria-pressed={type === tp} onClick={() => setType(tp)} className={chip(type === tp)}>
              <span aria-hidden className={`h-2 w-2 rounded-full ${TYPE_STYLE[tp].dot}`} />
              <span className="capitalize">{tp}</span>
              <span className={type === tp ? t.chipCount[0] : t.chipCount[1]}>{count}</span>
            </button>
          ))}
        </div>
        <label className="relative block w-full lg:w-72">
          <span className="sr-only">Search components</span>
          <svg aria-hidden viewBox="0 0 20 20" className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${t.muted}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="9" cy="9" r="6" />
            <path d="m14 14 4 4" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search components"
            className={`w-full py-2.5 pl-10 pr-4 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${t.focus} ${t.search}`}
          />
        </label>
      </div>

      <p role="status" aria-live="polite" className={`mt-5 text-sm ${t.muted}`}>
        Showing {shown.length} of {registry.length} components
      </p>

      {shown.length === 0 ? (
        <div className={`mt-6 rounded-2xl border border-dashed p-10 text-center ${t.emptyBox}`}>
          No component matches that search.{" "}
          <button type="button" onClick={() => { setQuery(""); setType("all"); }} className={`font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 ${t.focus} ${t.clear}`}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(({ item: { slug, name, type: ty, week, description, Component, previewScale, previewProps, previewWidth }, n }) => (
            <Link
              key={slug}
              href={`/components/${slug}`}
              className={`group relative flex flex-col p-3 transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${t.focus} ${t.card}`}
            >
              <div className={`pointer-events-none relative flex h-56 items-center justify-center overflow-hidden ${t.stage}`}>
                <div aria-hidden className={`absolute inset-0 ${t.stageGrid}`} />
                <div aria-hidden inert className={`relative ${previewWidth ? "shrink-0" : ""}`} style={{ transform: `scale(${previewScale ?? 0.6})`, width: previewWidth }}>
                  <Component {...previewProps} />
                </div>
                <span className={`absolute left-3 top-3 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${t.num}`}>
                  #{String(n).padStart(2, "0")}
                </span>
              </div>
              <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`text-lg font-semibold tracking-tight ${t.cardTitle}`}>{name}</h3>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${t.badge || TYPE_STYLE[ty].badge}`}>{ty}</span>
                </div>
                <p className={`mt-1.5 flex-1 text-sm leading-relaxed ${t.cardDesc}`}>{description}</p>
                <div className={`mt-4 flex items-center justify-between border-t pt-3 text-xs ${t.cardFoot}`}>
                  <span>Week {String(week).padStart(2, "0")}</span>
                  <span className={`inline-flex items-center gap-1 font-semibold transition group-hover:gap-2 ${t.cardLink}`}>
                    View live + code <span aria-hidden>→</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
