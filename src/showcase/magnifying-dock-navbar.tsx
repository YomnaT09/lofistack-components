"use client";

import { useState } from "react";

export interface DockItem {
  id: string;
  label: string;
  /** Icon shown on the tile: any React node, or a short text such as a letter. */
  icon: React.ReactNode;
  /** Link target. Without it the item is a button. */
  href?: string;
  disabled?: boolean;
}

export interface MagnifyingDockNavbarProps {
  items?: DockItem[];
  /** Id of the active item when you do not control it. */
  defaultActiveId?: string;
  /** Controlled active id. */
  activeId?: string;
  /** Tile size in px when not magnified. */
  baseSize?: number;
  /** How many times bigger the tile under the pointer gets. */
  maxScale?: number;
  /** Accessible name of the navigation. */
  ariaLabel?: string;
  disabled?: boolean;
  onChange?: (item: DockItem) => void;
  className?: string;
}

const icon = (d: string) => (
  <svg aria-hidden viewBox="0 0 24 24" width="55%" height="55%" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const DEFAULT_ITEMS: DockItem[] = [
  { id: "home", label: "Home", icon: icon("M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10") },
  { id: "search", label: "Search", icon: icon("M11 4a7 7 0 100 14 7 7 0 000-14zm9 16l-4-4") },
  { id: "cats", label: "Cats", icon: icon("M5 9c-1-3 0-5 1-6 2 0 3 1 4 2h4c1-1 2-2 4-2 1 1 2 3 1 6 1 2 1 5-1 7s-4 3-6 3-4-1-6-3-2-5-1-7z") },
  { id: "chat", label: "Messages", icon: icon("M4 5h16v11H9l-5 4z") },
  { id: "settings", label: "Settings", icon: icon("M12 9a3 3 0 100 6 3 3 0 000-6zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2") },
];

const GAP = 10;

export default function MagnifyingDockNavbar({
  items = DEFAULT_ITEMS,
  defaultActiveId,
  activeId,
  baseSize = 48,
  maxScale = 1.6,
  ariaLabel = "Main",
  disabled = false,
  onChange,
  className = "",
}: MagnifyingDockNavbarProps) {
  const [inner, setInner] = useState(defaultActiveId ?? items[0]?.id);
  const [x, setX] = useState<number | null>(null); // pointer offset from the dock centre, in px
  const [focusId, setFocusId] = useState<string | null>(null);
  const current = activeId ?? inner;

  const pitch = baseSize + GAP;
  const centreOf = (i: number) => (i - (items.length - 1) / 2) * pitch;
  const range = pitch * 2.2;

  const scaleFor = (i: number) => {
    let at = x;
    if (at === null && focusId) {
      const fi = items.findIndex((it) => it.id === focusId);
      if (fi >= 0) at = centreOf(fi);
    }
    if (at === null) return 1;
    const d = Math.abs(at - centreOf(i));
    if (d >= range) return 1;
    const t = Math.cos((d / range) * (Math.PI / 2));
    return 1 + (maxScale - 1) * t * t;
  };

  const pick = (item: DockItem) => {
    if (disabled || item.disabled) return;
    setInner(item.id);
    onChange?.(item);
  };

  return (
    <nav
      aria-label={ariaLabel}
      className={`mdn ${className}`}
      style={{ ["--mdn-base" as string]: `${baseSize}px`, ["--mdn-gap" as string]: `${GAP}px`, ["--mdn-pad" as string]: `${Math.round(baseSize * (maxScale - 1) + 24)}px` }}
    >
      <style>{CSS}</style>
      <div
        className="mdn-stage"
        onPointerMove={(e) => {
          if (e.pointerType === "touch" || disabled) return;
          const r = e.currentTarget.getBoundingClientRect();
          setX(e.clientX - (r.left + r.width / 2));
        }}
        onPointerLeave={() => setX(null)}
      >
        <ul className="mdn-dock">
          {items.map((item, i) => {
            const s = scaleFor(i);
            const off = disabled || item.disabled;
            const active = item.id === current;
            const size = Math.round(baseSize * s);
            const tile = (
              <>
                <span className="mdn-tip" role="presentation">{item.label}</span>
                <span className="mdn-icon">{item.icon}</span>
                {active && <span className="mdn-dot" aria-hidden />}
              </>
            );
            const common = {
              className: `mdn-item${active ? " is-active" : ""}${off ? " is-off" : ""}`,
              style: { width: size, height: size },
              "aria-label": item.label,
              "aria-current": active ? ("page" as const) : undefined,
              onFocus: () => setFocusId(item.id),
              onBlur: () => setFocusId(null),
            };
            return (
              <li key={item.id} className="mdn-li">
                {item.href && !off ? (
                  <a href={item.href} {...common} onClick={() => pick(item)}>{tile}</a>
                ) : (
                  <button type="button" disabled={off} {...common} onClick={() => pick(item)}>{tile}</button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

const CSS = `
.mdn{font-family:var(--font-lexend),system-ui,sans-serif;color:#e8ebf5;display:flex;justify-content:center;max-width:100%}
.mdn *{box-sizing:border-box}
.mdn-stage{padding:calc(var(--mdn-pad) - 24px) 20px 4px;max-width:100%}
.mdn-dock{list-style:none;margin:0;padding:10px 14px;display:flex;align-items:flex-end;gap:var(--mdn-gap);border-radius:22px;border:1px solid rgba(56,189,248,.4);background:rgba(16,19,42,.85);backdrop-filter:blur(8px);box-shadow:0 0 0 1px rgba(251,113,133,.2),0 20px 50px -20px rgba(0,0,0,.8),0 0 40px -16px rgba(56,189,248,.5);max-width:100%}
.mdn-li{display:flex;align-items:flex-end}
.mdn-item{position:relative;display:grid;place-items:center;border:0;border-radius:28%;background:linear-gradient(145deg,#1d2347,#141831);color:#e8ebf5;text-decoration:none;cursor:pointer;transition:width .09s linear,height .09s linear,background .2s,box-shadow .2s;flex:none}
.mdn-item.is-active{background:linear-gradient(145deg,#fb7185,#38bdf8);color:#10132a}
.mdn-item:focus-visible{outline:2px solid #38bdf8;outline-offset:3px}
.mdn-item.is-off{opacity:.4;cursor:not-allowed}
.mdn-icon{display:grid;place-items:center;width:100%;height:100%;font-weight:700}
.mdn-dot{position:absolute;bottom:-7px;width:5px;height:5px;border-radius:50%;background:#fb7185;box-shadow:0 0 8px #fb7185}
.mdn-tip{position:absolute;bottom:calc(100% + 10px);left:50%;transform:translate(-50%,4px);padding:3px 9px;border-radius:7px;background:#e8ebf5;color:#10132a;font-size:12px;font-weight:600;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .12s,transform .12s}
.mdn-item:hover .mdn-tip,.mdn-item:focus-visible .mdn-tip{opacity:1;transform:translate(-50%,0)}
@media (hover:none){.mdn-tip{display:none}}
@media (max-width:420px){.mdn-stage{padding-inline:6px}.mdn-dock{padding-inline:8px;gap:6px}}
@media (prefers-reduced-motion:reduce){.mdn-item,.mdn-tip{transition:none}}
`;
