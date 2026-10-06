"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

export interface NavItem {
  id: string;
  label: string;
  /** Renders a real link when set, otherwise a button. */
  href?: string;
  disabled?: boolean;
}

export interface MorphingPillNavbarProps {
  /** Links shown in the bar. */
  items?: NavItem[];
  /** Controlled active item. Leave undefined to let the navbar manage it. */
  activeId?: string;
  /** Initially active item when uncontrolled. Defaults to the first item. */
  defaultActiveId?: string;
  /** Brand text on the left. */
  logo?: string;
  /** Text of the call-to-action button. Pass an empty string to hide it. */
  ctaLabel?: string;
  /** Accessible name of the navigation landmark. */
  ariaLabel?: string;
  /** Called when an item is chosen. */
  onNavigate?: (item: NavItem) => void;
  /** Called when the call-to-action is pressed. */
  onCtaClick?: () => void;
  /** Disable the whole bar. */
  disabled?: boolean;
  /** Show skeleton pills and disable the bar. */
  loading?: boolean;
  className?: string;
}

const DEFAULT_ITEMS: NavItem[] = [
  { id: "home", label: "Home" },
  { id: "features", label: "Features" },
  { id: "pricing", label: "Pricing" },
  { id: "docs", label: "Docs" },
  { id: "contact", label: "Contact" },
];

type Box = { left: number; width: number };

// The pill glides between items with a springy curve and stretches to each label's width.
const SPRING = "350ms cubic-bezier(.34,1.35,.64,1)";

export default function MorphingPillNavbar({
  items = DEFAULT_ITEMS,
  activeId,
  defaultActiveId,
  logo = "Lofi",
  ctaLabel = "Sign in",
  ariaLabel = "Main",
  onNavigate,
  onCtaClick,
  disabled = false,
  loading = false,
  className = "",
}: MorphingPillNavbarProps) {
  const panelId = useId();
  const locked = disabled || loading;
  const [inner, setInner] = useState(defaultActiveId ?? items[0]?.id);
  const active = activeId ?? inner;
  const [open, setOpen] = useState(false);
  const [pill, setPill] = useState<Box | null>(null);
  const [ghost, setGhost] = useState<Box | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const measure = useCallback((id?: string): Box | null => {
    const el = id ? itemRefs.current[id] : null;
    return el && el.offsetWidth > 0 ? { left: el.offsetLeft, width: el.offsetWidth } : null;
  }, []);

  // Measure after mount (and whenever the list resizes, e.g. a web font loads or the window changes).
  useEffect(() => {
    setPill(measure(active));
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setPill(measure(active)));
    ro.observe(list);
    return () => ro.disconnect();
  }, [active, items, measure, loading]);

  const choose = (item: NavItem) => {
    if (locked || item.disabled) return;
    setInner(item.id);
    setOpen(false);
    onNavigate?.(item);
  };

  const itemClass = (isActive: boolean, isDisabled?: boolean) =>
    `relative z-10 block rounded-full px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 ${
      isDisabled ? "cursor-not-allowed text-white/40" : isActive ? "text-white" : "text-white/80 hover:text-white"
    }`;

  const renderItem = (item: NavItem, mobile = false) => {
    const isActive = item.id === active;
    const isDisabled = locked || item.disabled;
    const common = {
      "aria-current": isActive ? ("page" as const) : undefined,
      "aria-disabled": isDisabled || undefined,
      onClick: (e: React.MouseEvent) => {
        if (isDisabled) {
          e.preventDefault();
          return;
        }
        if (!item.href) e.preventDefault();
        choose(item);
      },
    };
    const cls = mobile
      ? `block w-full rounded-2xl px-4 py-3 text-left text-base font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 ${
          isDisabled
            ? "cursor-not-allowed text-white/40"
            : isActive
              ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white"
              : "text-white/85 hover:bg-white/10"
        }`
      : itemClass(isActive, isDisabled);
    return item.href ? (
      <a href={item.href} className={cls} {...common}>
        {item.label}
      </a>
    ) : (
      <button type="button" disabled={isDisabled} className={cls} {...common}>
        {item.label}
      </button>
    );
  };

  const cta = (extra: string) =>
    ctaLabel ? (
      <button
        type="button"
        onClick={onCtaClick}
        disabled={locked}
        className={`rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50 ${extra}`}
      >
        {ctaLabel}
      </button>
    ) : null;

  return (
    <nav
      aria-label={ariaLabel}
      aria-busy={loading}
      style={{ fontFamily: "var(--font-lexend)" }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
      className={`${className} mpn-root relative w-full max-w-[680px] rounded-[1.75rem] border border-white/15 bg-slate-950/75 text-white shadow-[0_20px_60px_-20px_rgba(99,102,241,.55)] backdrop-blur-xl`}
    >
      <style>{`
        @media (prefers-reduced-motion: reduce) { .mpn-root *, .mpn-root { transition-duration: 1ms !important; animation: none !important; } }
      `}</style>

      <div className="flex items-center justify-between gap-3 px-4 py-2 md:px-2.5">
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="flex items-center gap-2 rounded-full py-1 pr-2 text-base font-bold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 md:pl-2"
        >
          <span aria-hidden className="h-3.5 w-3.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500 shadow-[0_0_14px_rgba(129,140,248,.9)]" />
          {logo}
        </a>

        {/* desktop bar */}
        <ul
          ref={listRef}
          onMouseLeave={() => setGhost(null)}
          className="relative hidden items-center md:flex"
        >
          {pill && !loading && (
            <li
              aria-hidden
              className="absolute inset-y-0 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 shadow-[0_6px_20px_-4px_rgba(168,85,247,.7)]"
              style={{ left: pill.left, width: pill.width, transition: `left ${SPRING}, width ${SPRING}` }}
            />
          )}
          {ghost && !loading && (
            <li
              aria-hidden
              className="absolute inset-y-0 rounded-full bg-white/10"
              style={{ left: ghost.left, width: ghost.width, transition: "left 200ms ease-out, width 200ms ease-out" }}
            />
          )}
          {loading
            ? [0, 1, 2, 3].map((i) => (
                <li key={i} aria-hidden className="px-1">
                  <span className="block h-8 w-16 animate-pulse rounded-full bg-white/10" />
                </li>
              ))
            : items.map((item) => (
                <li
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current[item.id] = el;
                  }}
                  onMouseEnter={() => !locked && !item.disabled && setGhost(measure(item.id))}
                  onFocus={() => !locked && !item.disabled && setGhost(measure(item.id))}
                  onBlur={() => setGhost(null)}
                >
                  {renderItem(item)}
                </li>
              ))}
        </ul>

        <div className="hidden md:block">{cta("")}</div>

        {/* mobile menu button: three bars morph into a cross */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={locked}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:opacity-50 md:hidden"
        >
          <span aria-hidden className="relative block h-3.5 w-5">
            <span className={`absolute left-0 h-0.5 w-5 rounded bg-white transition-all duration-300 ${open ? "top-1.5 rotate-45" : "top-0"}`} />
            <span className={`absolute left-0 top-1.5 h-0.5 w-5 rounded bg-white transition-all duration-300 ${open ? "scale-x-0 opacity-0" : ""}`} />
            <span className={`absolute left-0 h-0.5 w-5 rounded bg-white transition-all duration-300 ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
          </span>
        </button>
      </div>

      {/* mobile panel: the pill grows downward to reveal the links */}
      <div
        id={panelId}
        inert={!open}
        className={`grid transition-[grid-template-rows] duration-300 ease-out md:hidden ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <ul className="space-y-1 px-2 pb-3 pt-1">
            {loading
              ? [0, 1, 2].map((i) => (
                  <li key={i} aria-hidden>
                    <span className="block h-11 animate-pulse rounded-2xl bg-white/10" />
                  </li>
                ))
              : items.map((item) => <li key={item.id}>{renderItem(item, true)}</li>)}
            {ctaLabel && <li className="pt-1">{cta("w-full py-3 text-base")}</li>}
          </ul>
        </div>
      </div>
    </nav>
  );
}
