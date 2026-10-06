"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface ContrastResult {
  foreground: string;
  background: string;
  /** Contrast ratio, e.g. 4.62 means 4.62:1. */
  ratio: number;
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
  /** Meets 3:1, the WCAG minimum for icons, borders and other UI parts. */
  ui: boolean;
}

export interface ColorContrastCheckerProps {
  /** Text color, as a 3 or 6 digit hex value. */
  foreground?: string;
  /** Background color, as a 3 or 6 digit hex value. */
  background?: string;
  /** Text shown in the live preview. */
  sampleText?: string;
  /** Heading of the card. */
  title?: string;
  /** Disable every control. */
  disabled?: boolean;
  /** Show a skeleton and disable the card, e.g. while colors load. */
  loading?: boolean;
  /** Called with the full result whenever either color changes. */
  onChange?: (result: ContrastResult) => void;
  className?: string;
}

type RGB = [number, number, number];

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export const parseHex = (value: string): RGB | null => {
  const m = HEX.exec(value.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
};

const toHex = (rgb: RGB) => "#" + rgb.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("");

// WCAG 2.x relative luminance and contrast ratio.
const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: RGB) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: RGB, b: RGB) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const rgbToHsl = ([r, g, b]: RGB): [number, number, number] => {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
};
const hslToRgb = (h: number, s: number, l: number): RGB => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
};

/** Nudge the text color's lightness (keeping its hue) until it reaches `target`, or give up. */
const suggestForeground = (fg: RGB, bg: RGB, target: number): string | null => {
  const [h, s, l] = rgbToHsl(fg);
  const dir = luminance(bg) > 0.179 ? -1 : 1; // darken on light backgrounds, lighten on dark ones
  for (let step = 1; step <= 100; step++) {
    const nl = l + (dir * step) / 100;
    if (nl < 0 || nl > 1) break;
    const rgb = hslToRgb(h, s, nl);
    if (contrast(rgb, bg) >= target) return toHex(rgb);
  }
  return null;
};

const buildResult = (fg: RGB, bg: RGB): ContrastResult => {
  const ratio = contrast(fg, bg);
  return {
    foreground: toHex(fg),
    background: toHex(bg),
    ratio: Math.floor(ratio * 100) / 100,
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
    ui: ratio >= 3,
  };
};

// Show the ratio truncated (not rounded) so 4.499 never reads as a passing 4.50.
const show = (n: number) => (Math.floor(n * 100) / 100).toFixed(2);

export default function ColorContrastChecker({
  foreground = "#e0e7ff",
  background = "#4f46e5",
  sampleText = "The quick brown fox jumps over the lazy dog",
  title = "Color contrast checker",
  disabled = false,
  loading = false,
  onChange,
  className = "",
}: ColorContrastCheckerProps) {
  const uid = useId();
  const locked = disabled || loading;
  const [fgText, setFgText] = useState(foreground);
  const [bgText, setBgText] = useState(background);
  const [copied, setCopied] = useState(false);

  // Keep using the last valid color while someone is mid-typing an invalid hex.
  const lastFg = useRef<RGB>(parseHex(foreground) ?? [255, 255, 255]);
  const lastBg = useRef<RGB>(parseHex(background) ?? [0, 0, 0]);
  const fgParsed = parseHex(fgText);
  const bgParsed = parseHex(bgText);
  if (fgParsed) lastFg.current = fgParsed;
  if (bgParsed) lastBg.current = bgParsed;
  const fg = lastFg.current;
  const bg = lastBg.current;
  const fgHex = toHex(fg);
  const bgHex = toHex(bg);

  const ratio = contrast(fg, bg);
  const result = buildResult(fg, bg);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    onChangeRef.current?.(buildResult(parseHex(fgHex)!, parseHex(bgHex)!));
  }, [fgHex, bgHex]);

  const grade =
    ratio >= 7 ? { label: "Excellent", note: "Passes AAA for all text" }
    : ratio >= 4.5 ? { label: "Good", note: "Passes AA for all text" }
    : ratio >= 3 ? { label: "Large text only", note: "Fails AA for normal text" }
    : { label: "Poor", note: "Fails every text level" };

  const suggestion = !result.aaNormal ? suggestForeground(fg, bg, 4.5) : null;
  const suggestionRatio = suggestion ? contrast(parseHex(suggestion)!, bg) : 0;

  const checks: { label: string; need: string; pass: boolean }[] = [
    { label: "AA normal text", need: "4.5 : 1", pass: result.aaNormal },
    { label: "AA large text", need: "3 : 1", pass: result.aaLarge },
    { label: "AAA normal text", need: "7 : 1", pass: result.aaaNormal },
    { label: "AAA large text", need: "4.5 : 1", pass: result.aaaLarge },
    { label: "UI components", need: "3 : 1", pass: result.ui },
  ];

  const swap = () => {
    setFgText(bgHex);
    setBgText(fgHex);
  };

  const copyCss = async () => {
    try {
      await navigator.clipboard.writeText(`color: ${fgHex};\nbackground-color: ${bgHex};`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const meter = Math.min(1, Math.max(0, (ratio - 1) / 11)); // 1:1 to 12:1
  const markerAt = (n: number) => `${((n - 1) / 11) * 100}%`;

  const field = (
    id: string,
    label: string,
    text: string,
    setText: (v: string) => void,
    parsed: RGB | null,
    hex: string,
  ) => (
    <div className="min-w-0">
      <label htmlFor={id} className="text-[11px] font-medium uppercase tracking-widest text-white/70">
        {label}
      </label>
      <div
        className={`mt-1.5 flex items-center gap-2 rounded-xl border bg-white/[0.06] p-1.5 transition focus-within:ring-2 focus-within:ring-indigo-300 ${
          parsed ? "border-white/15" : "border-rose-400"
        }`}
      >
        <input
          type="color"
          value={hex}
          disabled={locked}
          onChange={(e) => setText(e.target.value)}
          aria-label={`${label} color picker`}
          className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0 disabled:cursor-not-allowed [&::-moz-color-swatch]:rounded-lg [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-0"
        />
        <input
          id={id}
          value={text}
          disabled={locked}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
          aria-invalid={!parsed}
          aria-describedby={parsed ? undefined : `${id}-err`}
          className="w-full min-w-0 bg-transparent font-mono text-sm uppercase text-white outline-none placeholder:text-white/40 disabled:opacity-60"
          placeholder="#000000"
        />
      </div>
      {!parsed && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-[11px] text-rose-300">
          Use a hex color like #1a2b3c
        </p>
      )}
    </div>
  );

  return (
    <div
      style={{ fontFamily: "var(--font-lexend)" }}
      aria-busy={loading}
      className={`${className} ccc-root relative w-full max-w-[460px] overflow-hidden rounded-[1.75rem] border border-white/15 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-4 text-white shadow-[0_30px_70px_-20px_rgba(0,0,0,.9)] sm:p-6 ${
        loading ? "animate-pulse" : ""
      }`}
    >
      <style>{`
        @media (prefers-reduced-motion: reduce) { .ccc-root *, .ccc-root { transition-duration: 1ms !important; animation: none !important; } }
      `}</style>
      <div aria-hidden className="pointer-events-none absolute -left-10 -top-10 h-44 w-44 rounded-full bg-indigo-500/30 blur-3xl" />

      <fieldset disabled={locked} className="relative min-w-0 border-0 p-0">
        <legend className="mb-4 text-lg font-semibold">{title}</legend>

        <div className="grid grid-cols-1 items-end gap-3 min-[400px]:grid-cols-[1fr_auto_1fr]">
          {field(`${uid}-fg`, "Text", fgText, setFgText, fgParsed, fgHex)}
          <button
            type="button"
            onClick={swap}
            aria-label="Swap text and background colors"
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-lg text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 active:rotate-180 disabled:cursor-not-allowed disabled:opacity-50 max-[399px]:rotate-90"
          >
            <span aria-hidden>⇄</span>
          </button>
          {field(`${uid}-bg`, "Background", bgText, setBgText, bgParsed, bgHex)}
        </div>

        {/* live preview */}
        <div
          className="mt-5 rounded-2xl border border-white/15 p-4 transition-colors duration-300"
          style={{ backgroundColor: bgHex, color: fgHex }}
        >
          <p className="text-base leading-snug">{sampleText}</p>
          <p className="mt-2 text-2xl font-bold leading-tight">Large heading text</p>
          <span
            className="mt-3 inline-flex rounded-lg border-2 px-3 py-1 text-sm font-semibold"
            style={{ borderColor: fgHex }}
          >
            UI component
          </span>
        </div>

        {/* result */}
        <div className="mt-5" role="status" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <p className="text-4xl font-bold tabular-nums sm:text-5xl">
              {show(ratio)}
              <span className="text-xl font-medium text-white/70"> : 1</span>
            </p>
            <p className="text-right">
              <span className="block text-sm font-semibold">{grade.label}</span>
              <span className="block text-xs text-white/70">{grade.note}</span>
            </p>
          </div>
          <div className="relative mt-3 h-2.5 rounded-full bg-white/10" aria-hidden>
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-[width] duration-500"
              style={{ width: `${meter * 100}%` }}
            />
            {[3, 4.5, 7].map((n) => (
              <span key={n} className="absolute top-0 h-full w-px bg-white/60" style={{ left: markerAt(n) }}>
                <span className="absolute left-1/2 top-4 -translate-x-1/2 text-[10px] text-white/70">{n}</span>
              </span>
            ))}
          </div>
        </div>

        <ul className="mt-8 grid gap-2 sm:grid-cols-2">
          {checks.map((c) => (
            <li
              key={c.label}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${
                c.pass ? "border-emerald-400/40 bg-emerald-400/10" : "border-rose-400/40 bg-rose-400/10"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate">{c.label}</span>
                <span className="block text-[11px] text-white/70">needs {c.need}</span>
              </span>
              <span className={`shrink-0 font-semibold ${c.pass ? "text-emerald-300" : "text-rose-300"}`}>
                <span aria-hidden>{c.pass ? "✓ " : "✕ "}</span>
                {c.pass ? "Pass" : "Fail"}
              </span>
            </li>
          ))}
        </ul>

        {!result.aaNormal && (
          <div className="mt-4 rounded-xl border border-amber-300/40 bg-amber-300/10 p-3 text-sm">
            {suggestion ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2">
                  <span aria-hidden className="h-5 w-5 rounded-md border border-white/30" style={{ backgroundColor: suggestion }} />
                  Try <b className="font-mono uppercase">{suggestion}</b> for text ({show(suggestionRatio)} : 1)
                </p>
                <button
                  type="button"
                  onClick={() => setFgText(suggestion)}
                  className="rounded-full bg-amber-300 px-3 py-1 text-xs font-semibold text-slate-900 transition hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
                >
                  Use it
                </button>
              </div>
            ) : (
              <p>No shade of this text color reaches 4.5 : 1 on this background. Try changing the background.</p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={copyCss}
          className={`mt-5 w-full rounded-xl py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:opacity-50 ${
            copied ? "bg-emerald-400 text-slate-900" : "bg-white text-slate-900 hover:bg-white/90"
          }`}
        >
          {copied ? "Copied!" : "Copy as CSS"}
        </button>
      </fieldset>
    </div>
  );
}
