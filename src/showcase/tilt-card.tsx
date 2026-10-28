"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

export type HoloFoil = "emerald" | "gold" | "ice";

export interface HoloMove {
  icon: string;
  name: string;
  power: number;
}

export interface TiltCardProps {
  /** Name at the top left of the card. */
  name?: string;
  /** Number shown as "HP" at the top right. */
  hp?: number;
  /** Picture in the art window: an emoji, text or any element. */
  art?: ReactNode;
  /** Rows under the art. */
  moves?: HoloMove[];
  /** Small label at the bottom right. */
  rarity?: string;
  /** Colour of the foil shine. */
  foil?: HoloFoil;
  /** Show buttons under the card to switch the foil. */
  showFoilPicker?: boolean;
  /** Biggest tilt in degrees. */
  maxTilt?: number;
  /** Show the white light glare. */
  glare?: boolean;
  /** Turn the tilt and shine off. */
  disabled?: boolean;
  /** Called with the new foil when it is switched with the picker. */
  onFoilChange?: (foil: HoloFoil) => void;
  className?: string;
}

const DEFAULT_MOVES: HoloMove[] = [
  { icon: "☕", name: "Coffee Nap", power: 30 },
  { icon: "🎧", name: "Beat Drop", power: 60 },
];

const FOILS: HoloFoil[] = ["emerald", "gold", "ice"];

// Keyboard steps: arrow keys move the "pointer" in quarters of the card.
const KEY_STEP = 0.25;
const clamp = (n: number) => Math.max(0, Math.min(1, n));

export default function TiltCard({
  name = "Lofi Cat",
  hp = 90,
  art = "🐱",
  moves = DEFAULT_MOVES,
  rarity = "★ HOLO RARE",
  foil: initialFoil = "emerald",
  showFoilPicker = false,
  maxTilt = 16,
  glare = true,
  disabled = false,
  onFoilChange,
  className = "",
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const keyPos = useRef({ x: 0.5, y: 0.5 });
  const [foil, setFoil] = useState<HoloFoil>(initialFoil);
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => setFoil(initialFoil), [initialFoil]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => {
      mq.removeEventListener("change", update);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  const still = disabled || reduced;

  // x and y are 0..1 across the card. Written straight to CSS variables, once per frame, with no re-render.
  const apply = (x: number, y: number) => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = cardRef.current;
      if (!el) return;
      el.style.setProperty("--ry", `${(x - 0.5) * 2 * maxTilt}deg`);
      el.style.setProperty("--rx", `${(0.5 - y) * 2 * maxTilt}deg`);
      el.style.setProperty("--mx", `${x * 100}%`);
      el.style.setProperty("--my", `${y * 100}%`);
      el.style.setProperty("--hyp", String(Math.min(1, Math.hypot(x - 0.5, y - 0.5) * 2)));
    });
  };

  const reset = () => {
    keyPos.current = { x: 0.5, y: 0.5 };
    setActive(false);
    apply(0.5, 0.5);
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (still) return;
    const r = e.currentTarget.getBoundingClientRect();
    setActive(true);
    apply(clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (still) return;
    const p = keyPos.current;
    const dirs: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
      ArrowUp: [0, -KEY_STEP],
      ArrowDown: [0, KEY_STEP],
    };
    if (e.key === "Escape") return reset();
    const d = dirs[e.key];
    if (!d) return;
    e.preventDefault();
    keyPos.current = { x: clamp(p.x + d[0]), y: clamp(p.y + d[1]) };
    setActive(true);
    apply(keyPos.current.x, keyPos.current.y);
  };

  const pickFoil = (f: HoloFoil) => {
    setFoil(f);
    onFoilChange?.(f);
  };

  return (
    <div className={`htc ${className}`}>
      <style>{CSS}</style>
      <div className="htc-scene" onPointerMove={onMove} onPointerLeave={reset} onPointerCancel={reset}>
        <div
          ref={cardRef}
          className={`htc-card foil-${foil}${active ? " is-active" : ""}${still ? " is-still" : ""}`}
          tabIndex={disabled ? -1 : 0}
          role="group"
          aria-roledescription="collector card"
          aria-label={`${name}, HP ${hp}, ${rarity}. ${still ? "" : "Move the pointer over it, or use the arrow keys, to tilt it."}`}
          aria-disabled={disabled || undefined}
          onKeyDown={onKey}
          onBlur={reset}
        >
          <div className="htc-face">
            <div className="htc-top">
              <span className="htc-name">{name}</span>
              <span className="htc-hp">HP {hp}</span>
            </div>
            <div className="htc-art" aria-hidden>
              <span className="htc-art-inner">{art}</span>
            </div>
            <ul className="htc-moves">
              {moves.map((m) => (
                <li key={m.name}>
                  <span><span aria-hidden>{m.icon}</span> {m.name}</span>
                  <b>{m.power}</b>
                </li>
              ))}
            </ul>
            <span className="htc-rarity">{rarity}</span>
          </div>
          <div className="htc-holo" aria-hidden />
          <div className="htc-sparkle" aria-hidden />
          {glare && <div className="htc-glare" aria-hidden />}
        </div>
      </div>
      {showFoilPicker && (
        <div className="htc-picker" role="radiogroup" aria-label="Foil">
          {FOILS.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={foil === f}
              className={`htc-chip chip-${f}`}
              onClick={() => pickFoil(f)}
              disabled={disabled}
            >
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const CSS = `
.htc{font-family:var(--font-lexend),system-ui,sans-serif;color:#e8ebf5;display:flex;flex-direction:column;align-items:center;gap:18px;width:100%;max-width:300px}
.htc *{box-sizing:border-box}
.htc-scene{perspective:900px;padding:12px;width:100%;display:flex;justify-content:center;touch-action:pan-y}
.htc-card{--rx:0deg;--ry:0deg;--mx:50%;--my:50%;--hyp:0;
  --c1:#6ee7b7;--c2:#34d399;--c3:#a7f3d0;--c4:#2dd4bf;--c5:#6ee7b7;--edge:#34d399;--glow:rgba(16,185,129,.5);
  position:relative;width:min(260px,100%);aspect-ratio:13/17;border-radius:20px;overflow:hidden;
  background:#141029;border:2px solid var(--edge);outline:none;
  transform:rotateX(var(--rx)) rotateY(var(--ry)) scale(1);transform-style:preserve-3d;
  box-shadow:calc(var(--ry) * -1.2) calc(var(--rx) * 1.2 + 18px) 40px -8px var(--glow);
  transition:transform .55s cubic-bezier(.2,.8,.2,1),box-shadow .55s ease}
.htc-card.is-active{transform:rotateX(var(--rx)) rotateY(var(--ry)) scale(1.04);transition:transform .08s linear,box-shadow .08s linear}
.htc-card:focus-visible{box-shadow:0 0 0 3px #0f1226,0 0 0 5px #38bdf8,0 18px 40px -8px var(--glow)}
.htc-card.foil-gold{--c1:#fde68a;--c2:#f59e0b;--c3:#fef3c7;--c4:#fb923c;--c5:#fde68a;--edge:#fcd34d;--glow:rgba(245,158,11,.45)}
.htc-card.foil-ice{--c1:#a5f3fc;--c2:#e0f2fe;--c3:#38bdf8;--c4:#c4b5fd;--c5:#7dd3fc;--edge:#7dd3fc;--glow:rgba(56,189,248,.45)}
.htc-face{position:absolute;inset:0;padding:16px;display:flex;flex-direction:column}
.htc-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-weight:700;font-size:16px}
.htc-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.htc-hp{color:#fb7185;flex:none}
.htc-art{margin-top:10px;flex:1 1 auto;min-height:0;border-radius:10px;border:2px solid var(--c2);display:grid;place-items:center;overflow:hidden;
  background:radial-gradient(circle at var(--mx) var(--my),var(--c4),#1e1b4b 70%)}
.htc-art-inner{font-size:64px;line-height:1;transform:translate(calc(var(--ry) * -0.6),calc(var(--rx) * 0.6));transition:transform .55s cubic-bezier(.2,.8,.2,1)}
.htc-card.is-active .htc-art-inner{transition:transform .08s linear}
.htc-moves{list-style:none;margin:10px 0 0;padding:0}
.htc-moves li{display:flex;justify-content:space-between;gap:8px;font-size:13px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.14)}
.htc-rarity{align-self:flex-end;margin-top:auto;padding-top:8px;font-size:11px;letter-spacing:.18em;color:#fde68a}
.htc-holo,.htc-sparkle,.htc-glare{position:absolute;inset:0;pointer-events:none;border-radius:inherit}
.htc-holo{background:linear-gradient(115deg,transparent 36%,var(--c1) 42%,var(--c2) 46%,var(--c3) 50%,var(--c4) 54%,var(--c5) 58%,transparent 64%);
  background-size:220% 220%;background-position:var(--mx) var(--my);mix-blend-mode:screen;opacity:calc(.3 + var(--hyp) * .35);
  transition:opacity .4s ease}
.htc-sparkle{background-image:radial-gradient(circle,rgba(255,255,255,.9) 0 1px,transparent 1.5px),radial-gradient(circle,rgba(255,255,255,.7) 0 1px,transparent 1.5px);
  background-size:23px 29px,37px 31px;background-position:calc(var(--mx) * .3) calc(var(--my) * .3),calc(var(--mx) * -.2) calc(var(--my) * -.2);
  mix-blend-mode:overlay;opacity:calc(var(--hyp) * .9)}
.htc-glare{background:radial-gradient(circle at var(--mx) var(--my),rgba(255,255,255,.55),transparent 45%);mix-blend-mode:soft-light;opacity:0;transition:opacity .4s ease}
.htc-card.is-active .htc-glare{opacity:1}
.htc-card.is-still{transform:none;transition:none}
.htc-card.is-still .htc-holo{opacity:.45}
.htc-card.is-still .htc-sparkle{opacity:.3}
.htc-card[aria-disabled]{filter:grayscale(.7);opacity:.7}
.htc-picker{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.htc-chip{padding:7px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.05);color:#cbd2e6;font:inherit;font-size:13px;cursor:pointer;transition:background .2s,border-color .2s,color .2s}
.htc-chip:hover{background:rgba(255,255,255,.12)}
.htc-chip[aria-checked="true"]{color:#0f1226;font-weight:600;border-color:transparent}
.htc-chip.chip-emerald[aria-checked="true"]{background:linear-gradient(90deg,#6ee7b7,#2dd4bf)}
.htc-chip.chip-gold[aria-checked="true"]{background:linear-gradient(90deg,#fde68a,#f59e0b)}
.htc-chip.chip-ice[aria-checked="true"]{background:linear-gradient(90deg,#a5f3fc,#c4b5fd)}
.htc-chip:focus-visible{outline:2px solid #fb7185;outline-offset:2px}
.htc-chip:disabled{opacity:.5;cursor:not-allowed}
@media (prefers-reduced-motion:reduce){.htc-card,.htc-art-inner,.htc-holo,.htc-glare{transition:none!important}}
`;
