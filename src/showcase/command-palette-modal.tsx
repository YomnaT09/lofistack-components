"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface PaletteCommand {
  id: string;
  label: string;
  /** Small grey text under the label. */
  hint?: string;
  /** Shortcut shown on the right, for example "T". */
  shortcut?: string;
  disabled?: boolean;
}

export interface CommandPaletteModalProps {
  commands?: PaletteCommand[];
  /** Text on the button that opens the palette. */
  triggerLabel?: string;
  /** Letter that opens the palette together with Ctrl or Cmd. Empty string turns the shortcut off. */
  shortcutKey?: string;
  title?: string;
  /** Placeholder of the search box. */
  placeholder?: string;
  /** Shown when no command matches the search. */
  emptyText?: string;
  /** Called with the command the person picked. */
  onSelect?: (command: PaletteCommand) => void;
  /** Called when the palette opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Show a spinner instead of the list, for example while commands load. */
  loading?: boolean;
  /** Disable the button and the shortcut. */
  disabled?: boolean;
  className?: string;
}

const DEFAULT_COMMANDS: PaletteCommand[] = [
  { id: "feed", label: "Feed the cat", hint: "Messi is hungry", shortcut: "F" },
  { id: "theme", label: "Switch theme", hint: "Dark or Default", shortcut: "T" },
  { id: "settings", label: "Open settings", hint: "Notifications and profile", shortcut: "S" },
  { id: "export", label: "Export my data", hint: "Download a copy as JSON", shortcut: "E" },
];

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function CommandPaletteModal({
  commands = DEFAULT_COMMANDS,
  triggerLabel = "Search commands",
  shortcutKey = "k",
  title = "Command palette",
  placeholder = "Type a command...",
  emptyText = "No command found",
  onSelect,
  onOpenChange,
  loading = false,
  disabled = false,
  className = "",
}: CommandPaletteModalProps) {
  const [open, setOpenState] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const listId = useId();
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const setOpen = (next: boolean | ((v: boolean) => boolean)) => {
    setOpenState((v) => {
      const value = typeof next === "function" ? next(v) : next;
      if (value !== v) queueMicrotask(() => onOpenChangeRef.current?.(value));
      return value;
    });
  };

  const q = query.trim().toLowerCase();
  const results = commands.filter((c) => !q || `${c.label} ${c.hint ?? ""}`.toLowerCase().includes(q));
  const current = results[Math.min(active, results.length - 1)];

  const close = () => {
    setOpen(false);
    setQuery("");
    setActive(0);
  };
  const pick = (c: PaletteCommand | undefined) => {
    if (!c || c.disabled) return;
    onSelect?.(c);
    close();
  };
  // Arrow keys skip disabled commands and wrap around.
  const move = (dir: 1 | -1) => {
    const n = results.length;
    if (!n) return;
    let i = Math.min(active, n - 1);
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (!results[i].disabled) break;
    }
    setActive(i);
  };

  // Ctrl/Cmd + shortcutKey toggles the palette.
  useEffect(() => {
    if (!shortcutKey || disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === shortcutKey.toLowerCase()) {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setActive(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    }, [shortcutKey, disabled]);

  // While open: lock page scroll, move focus inside, and give focus back to the button on close.
  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      trigger?.focus();
    };
  }, [open]);

  const onPanelKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      move(e.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      pick(current);
      return;
    }
    if (e.key !== "Tab") return;
    // Focus trap: Tab and Shift+Tab stay inside the panel.
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={`cpm ${className}`}>
      <style>{CSS}</style>
      <button ref={triggerRef} type="button" className="cpm-trigger" onClick={() => setOpen(true)} disabled={disabled} aria-haspopup="dialog" aria-expanded={open}>
        <svg aria-hidden viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 4 4" />
        </svg>
        <span className="cpm-trigger-label">{triggerLabel}</span>
        {shortcutKey && <kbd className="cpm-kbd">Ctrl {shortcutKey.toUpperCase()}</kbd>}
      </button>

      {open && !disabled && (
        <div className="cpm-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="cpm-panel" onKeyDown={onPanelKey}>
            <h2 id={titleId} className="cpm-title">{title}</h2>
            <input
              className="cpm-input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              placeholder={placeholder}
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
              aria-label="Search commands"
              autoComplete="off"
              spellCheck={false}
            />
            {loading ? (
              <div className="cpm-loading" role="status"><span className="cpm-spin" aria-hidden />Loading commands...</div>
            ) : (
            <ul id={listId} role="listbox" aria-label="Commands" className="cpm-list">
              {results.map((c) => (
                <li
                  key={c.id}
                  id={`${listId}-${c.id}`}
                  role="option"
                  aria-selected={c === current}
                  aria-disabled={c.disabled || undefined}
                  className={`cpm-item${c === current ? " is-active" : ""}${c.disabled ? " is-disabled" : ""}`}
                  onMouseMove={() => !c.disabled && setActive(results.indexOf(c))}
                  onClick={() => pick(c)}
                >
                  <span className="cpm-item-text">
                    <span className="cpm-item-label">{c.label}</span>
                    {c.hint && <span className="cpm-item-hint">{c.hint}</span>}
                  </span>
                  {c.shortcut && <kbd className="cpm-kbd">{c.shortcut}</kbd>}
                </li>
              ))}
            </ul>
            )}
            {!loading && results.length === 0 && <p className="cpm-empty">{emptyText}</p>}
            <div className="cpm-foot" aria-hidden>
              <span><kbd className="cpm-kbd">↑</kbd> <kbd className="cpm-kbd">↓</kbd> move</span>
              <span><kbd className="cpm-kbd">Enter</kbd> select</span>
              <span><kbd className="cpm-kbd">Esc</kbd> close</span>
            </div>
            <p className="cpm-sr" role="status">{results.length} {results.length === 1 ? "command" : "commands"} found</p>
          </div>
        </div>
      )}
    </div>
  );
}

const CSS = `
.cpm{font-family:var(--font-lexend),system-ui,sans-serif;color:#e8ebf5}
.cpm *{box-sizing:border-box}
.cpm-trigger{display:flex;align-items:center;gap:10px;width:100%;max-width:340px;padding:11px 14px;border-radius:12px;border:1px solid rgba(251,113,133,.5);background:rgba(18,21,42,.9);color:#cbd2e6;font:inherit;font-size:14px;cursor:pointer;transition:box-shadow .2s,border-color .2s}
.cpm-trigger:hover{border-color:#fb7185;box-shadow:0 0 24px -6px rgba(251,113,133,.7)}
.cpm-trigger-label{flex:1;text-align:left}
.cpm-kbd{font:11px ui-monospace,monospace;padding:2px 6px;border-radius:5px;border:1px solid rgba(255,255,255,.18);color:#9aa2b8;background:rgba(255,255,255,.04);white-space:nowrap}
.cpm-backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:flex-start;justify-content:center;padding:12vh 16px 16px;background:rgba(5,6,14,.7);backdrop-filter:blur(4px)}
.cpm-panel{width:100%;max-width:480px;max-height:min(70vh,520px);display:flex;flex-direction:column;border-radius:16px;border:1px solid rgba(56,189,248,.4);background:#10132a;box-shadow:0 0 0 1px rgba(251,113,133,.25),0 30px 70px -20px rgba(0,0,0,.8),0 0 50px -15px rgba(56,189,248,.5);overflow:hidden}
.cpm-title{margin:0;padding:14px 16px;font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#7dd3fc}
.cpm-list{list-style:none;margin:0;padding:6px;overflow:auto}
.cpm-input{all:unset;box-sizing:border-box;display:block;width:100%;padding:14px 16px;font-size:15px;color:#e8ebf5;border-bottom:1px solid rgba(255,255,255,.08)}
.cpm-input::placeholder{color:#7d86a0}
.cpm-input:focus-visible{box-shadow:inset 0 -2px 0 #38bdf8}
.cpm-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;border-left:3px solid transparent}
.cpm-item.is-active{background:rgba(251,113,133,.16);border-left-color:#fb7185}
.cpm-item.is-disabled{opacity:.4;cursor:not-allowed}
.cpm-trigger:focus-visible{outline:2px solid #38bdf8;outline-offset:2px}
.cpm-loading{display:flex;align-items:center;justify-content:center;gap:10px;padding:26px 16px;font-size:14px;color:#9aa2b8}
.cpm-spin{width:16px;height:16px;border-radius:50%;border:2px solid rgba(56,189,248,.3);border-top-color:#38bdf8;animation:cpm-spin .8s linear infinite}
@keyframes cpm-spin{to{transform:rotate(360deg)}}
.cpm-trigger:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}
.cpm-empty{margin:0;padding:22px 16px;text-align:center;font-size:14px;color:#8a92aa}
.cpm-foot{display:flex;gap:14px;flex-wrap:wrap;padding:10px 16px;font-size:12px;color:#8a92aa;border-top:1px solid rgba(255,255,255,.08)}
.cpm-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);margin:0}
.cpm-item-text{display:flex;flex-direction:column;min-width:0}
.cpm-item-label{font-size:14px}
.cpm-item-hint{font-size:12px;color:#8a92aa}
@media (prefers-reduced-motion:reduce){.cpm *{transition:none!important}.cpm-spin{animation-duration:2.4s}}
@media (max-width:420px){.cpm-backdrop{padding-top:6vh}.cpm-foot{display:none}}
`;
