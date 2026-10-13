"use client";

import { useEffect, useId, useState } from "react";

export interface DonutSegment {
  id: string;
  label: string;
  value: number;
  /** Any CSS colour. A palette colour is used when left out. */
  color?: string;
}

export interface AnimatedDonutChartProps {
  data?: DonutSegment[];
  title?: string;
  /** Unit written after values, for example "hrs". */
  unit?: string;
  /** Text under the total in the centre when nothing is hovered. */
  totalLabel?: string;
  /** Diameter in px. The chart shrinks to fit narrow screens. */
  size?: number;
  /** Draw the segments in on mount. */
  animate?: boolean;
  /** Let people hide segments by clicking the legend. */
  toggleable?: boolean;
  loading?: boolean;
  emptyText?: string;
  onSegmentClick?: (segment: DonutSegment, percent: number) => void;
  className?: string;
}

const PALETTE = ["#fb7185", "#38bdf8", "#a3e635", "#fbbf24", "#a78bfa", "#2dd4bf"];
const DEFAULT_DATA: DonutSegment[] = [
  { id: "focus", label: "Focus", value: 14 },
  { id: "study", label: "Study", value: 9 },
  { id: "rest", label: "Rest", value: 6 },
  { id: "play", label: "Play", value: 4 },
];

const R = 70;
const C = 2 * Math.PI * R;
const GAP = 3; // px gap between segments

export default function AnimatedDonutChart({
  data = DEFAULT_DATA,
  title = "Time this week",
  unit = "hrs",
  totalLabel = "total",
  size = 200,
  animate = true,
  toggleable = true,
  loading = false,
  emptyText = "No data yet",
  onSegmentClick,
  className = "",
}: AnimatedDonutChartProps) {
  const [ready, setReady] = useState(!animate);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<string | null>(null);
  const titleId = useId();

  // Start the segments at zero length, then let them grow on the next frame.
  useEffect(() => {
    if (!animate) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => cancelAnimationFrame(id);
  }, [animate]);

  const items = data.map((d, i) => ({ ...d, color: d.color ?? PALETTE[i % PALETTE.length] }));
  const shown = items.filter((d) => !hidden.has(d.id) && d.value > 0);
  const total = shown.reduce((s, d) => s + d.value, 0);
  const fmt = (n: number) => `${Math.round(n * 10) / 10}`;
  const pct = (v: number) => (total ? (v / total) * 100 : 0);

  let start = 0;
  const arcs = items.map((d) => {
    const visible = !hidden.has(d.id) && d.value > 0 && total > 0;
    const frac = visible ? d.value / total : 0;
    const len = ready ? Math.max(0, frac * C - (shown.length > 1 ? GAP : 0)) : 0;
    const arc = { ...d, len, offset: start, visible };
    start += frac * C;
    return arc;
  });

  const active = items.find((d) => d.id === hover && !hidden.has(d.id) && d.value > 0);
  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const summary = shown.map((d) => `${d.label} ${fmt(d.value)} ${unit}, ${fmt(pct(d.value))} percent`).join("; ");

  return (
    <figure className={`adc ${className}`} aria-labelledby={titleId}>
      <style>{CSS}</style>
      <figcaption id={titleId} className="adc-title">{title}</figcaption>

      {loading ? (
        <div className="adc-state" role="status">
          <span className="adc-skel" style={{ width: size, height: size, maxWidth: "100%" }} aria-hidden />
          Loading chart...
        </div>
      ) : total === 0 && hidden.size === 0 ? (
        <p className="adc-state" role="status">{emptyText}</p>
      ) : (
        <div className="adc-body">
          <div className="adc-chart" style={{ width: size, maxWidth: "100%" }}>
            <svg viewBox="0 0 200 200" role="img" aria-label={`${title}. ${summary || "All segments hidden"}`} className="adc-svg">
              <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="26" />
              <g transform="rotate(-90 100 100)">
                {arcs.map((a, i) => (
                  <circle
                    key={a.id}
                    cx="100"
                    cy="100"
                    r={R}
                    fill="none"
                    stroke={a.color}
                    strokeWidth={hover === a.id ? 32 : 26}
                    strokeDasharray={`${a.len} ${C}`}
                    strokeDashoffset={-a.offset}
                    opacity={hover && hover !== a.id ? 0.35 : 1}
                    className="adc-arc"
                    style={{ transitionDelay: animate && !ready ? "0s" : `${animate ? Math.min(i, 6) * 60 : 0}ms` }}
                    onMouseEnter={() => a.visible && setHover(a.id)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => a.visible && onSegmentClick?.(a, pct(a.value))}
                  />
                ))}
              </g>
            </svg>
            <div className="adc-centre" aria-hidden>
              <span className="adc-big">{active ? fmt(pct(active.value)) + "%" : fmt(total)}</span>
              <span className="adc-small">{active ? active.label : `${unit} ${totalLabel}`}</span>
            </div>
          </div>

          <ul className="adc-legend">
            {items.map((d) => {
              const off = hidden.has(d.id);
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    className={`adc-item${off ? " is-off" : ""}${hover === d.id ? " is-hover" : ""}`}
                    aria-pressed={toggleable ? !off : undefined}
                    disabled={!toggleable}
                    onClick={() => toggle(d.id)}
                    onMouseEnter={() => !off && setHover(d.id)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => !off && setHover(d.id)}
                    onBlur={() => setHover(null)}
                  >
                    <span className="adc-dot" style={{ background: d.color }} aria-hidden />
                    <span className="adc-name">{d.label}</span>
                    <span className="adc-val">{off ? "hidden" : `${fmt(d.value)} ${unit}`}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <p className="adc-sr" role="status">{hidden.size ? `${shown.length} of ${items.length} segments shown` : ""}</p>
    </figure>
  );
}

const CSS = `
.adc{margin:0;font-family:var(--font-lexend),system-ui,sans-serif;color:#e8ebf5;width:100%;max-width:520px;padding:20px;border-radius:18px;border:1px solid rgba(56,189,248,.35);background:#0f1226;box-shadow:0 0 40px -18px rgba(251,113,133,.6)}
.adc *{box-sizing:border-box}
.adc-title{font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#7dd3fc;margin-bottom:16px}
.adc-body{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:20px}
.adc-chart{position:relative;flex:0 1 auto;aspect-ratio:1}
.adc-svg{display:block;width:100%;height:100%}
.adc-arc{cursor:pointer;transition:stroke-dasharray .9s cubic-bezier(.2,.8,.2,1),stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1),stroke-width .15s,opacity .15s}
.adc-centre{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;text-align:center}
.adc-big{font-size:30px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums}
.adc-small{font-size:12px;color:#9aa2b8;margin-top:2px}
.adc-legend{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;flex:1 1 170px;min-width:0}
.adc-item{display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border:0;border-radius:9px;background:transparent;color:inherit;font:inherit;font-size:14px;text-align:left;cursor:pointer}
.adc-item:hover,.adc-item.is-hover{background:rgba(255,255,255,.07)}
.adc-item:focus-visible{outline:2px solid #38bdf8;outline-offset:1px}
.adc-item:disabled{cursor:default}
.adc-item.is-off{opacity:.5}.adc-item.is-off .adc-name{text-decoration:line-through}
.adc-dot{width:11px;height:11px;border-radius:3px;flex:none}
.adc-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.adc-val{font-size:12px;color:#9aa2b8;font-variant-numeric:tabular-nums;white-space:nowrap}
.adc-state{display:flex;flex-direction:column;align-items:center;gap:12px;padding:30px 0;margin:0;font-size:14px;color:#9aa2b8}
.adc-skel{display:block;border-radius:50%;border:26px solid rgba(255,255,255,.08);animation:adc-pulse 1.4s ease-in-out infinite}
@keyframes adc-pulse{50%{opacity:.4}}
.adc-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);margin:0}
@media (prefers-reduced-motion:reduce){.adc-arc{transition:none}.adc-skel{animation:none}}
`;
