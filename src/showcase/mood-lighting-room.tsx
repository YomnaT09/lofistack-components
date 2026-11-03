"use client";

import { useId, useState } from "react";
import screenImg from "@/assets/laptop-screen-chimp.jpg";

export type RoomLight = "lamp" | "fairy" | "laptop" | "ceiling";
export type RoomTime = "day" | "night";
export type RoomLights = Record<RoomLight, boolean>;

export interface MoodRoomState {
  lights: RoomLights;
  time: RoomTime;
  /** 0 = cool blue light, 100 = warm golden light. */
  warmth: number;
  /** Short name of the mood the room is in right now. */
  mood: string;
}

export interface MoodLightingRoomProps {
  /** Which lights are on at the start. Missing ones use the defaults. */
  defaultLights?: Partial<RoomLights>;
  /** Day or night outside the window at the start. */
  defaultTime?: RoomTime;
  /** Start colour of the lights, 0 (cool) to 100 (warm). */
  defaultWarmth?: number;
  /** Show the Study / Chill / Sleep / Sunny preset buttons. */
  showPresets?: boolean;
  /** Called every time a light, the time or the warmth changes. */
  onChange?: (state: MoodRoomState) => void;
  className?: string;
}

const DEFAULT_LIGHTS: RoomLights = { lamp: true, fairy: true, laptop: true, ceiling: false };

const LIGHT_LABELS: { key: RoomLight; label: string }[] = [
  { key: "lamp", label: "Floor lamp" },
  { key: "fairy", label: "Fairy lights" },
  { key: "laptop", label: "Laptop glow" },
  { key: "ceiling", label: "Ceiling light" },
];

type Preset = { name: string; lights: RoomLights; time: RoomTime; warmth: number };
const PRESETS: Preset[] = [
  { name: "Study", lights: { lamp: true, fairy: false, laptop: true, ceiling: false }, time: "night", warmth: 35 },
  { name: "Chill", lights: { lamp: true, fairy: true, laptop: false, ceiling: false }, time: "night", warmth: 85 },
  { name: "Sleep", lights: { lamp: false, fairy: false, laptop: false, ceiling: false }, time: "night", warmth: 60 },
  { name: "Sunny", lights: { lamp: false, fairy: false, laptop: true, ceiling: false }, time: "day", warmth: 50 },
];

// Fairy light bulbs, sitting on the two sagging wire curves.
const BULBS = [
  [40, 44], [85, 54], [130, 52], [175, 42], [265, 44], [310, 53], [355, 52], [400, 42],
];

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function mix(a: string, b: string, t: number) {
  const A = hex(a), B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
}

export function getMood(lights: RoomLights, time: RoomTime): string {
  const on = (Object.keys(lights) as RoomLight[]).filter((k) => lights[k]);
  if (lights.ceiling) return time === "day" ? "Bright & busy" : "Cleaning-up mode";
  if (time === "day") return on.length ? "Sunny work session" : "Lazy sunny afternoon";
  if (!on.length) return "Lights out, sleepy time";
  if (lights.laptop && !lights.fairy) return "Late-night study";
  if (lights.fairy && lights.lamp && !lights.laptop) return "Cozy lofi evening";
  if (lights.fairy && !lights.lamp && !lights.laptop) return "Dreamy fairy glow";
  if (lights.laptop) return "Night owl coding";
  return "Warm reading corner";
}

export default function MoodLightingRoom({
  defaultLights,
  defaultTime = "night",
  defaultWarmth = 70,
  showPresets = true,
  onChange,
  className = "",
}: MoodLightingRoomProps) {
  const [lights, setLights] = useState<RoomLights>({ ...DEFAULT_LIGHTS, ...defaultLights });
  const [time, setTime] = useState<RoomTime>(defaultTime);
  const [warmth, setWarmth] = useState(Math.max(0, Math.min(100, defaultWarmth)));
  const id = useId().replace(/:/g, "");

  const mood = getMood(lights, time);

  const update = (next: Partial<{ lights: RoomLights; time: RoomTime; warmth: number }>) => {
    const s = { lights, time, warmth, ...next };
    if (next.lights) setLights(next.lights);
    if (next.time) setTime(next.time);
    if (next.warmth !== undefined) setWarmth(next.warmth);
    onChange?.({ ...s, mood: getMood(s.lights, s.time) });
  };
  const toggle = (k: RoomLight) => update({ lights: { ...lights, [k]: !lights[k] } });
  const activePreset = PRESETS.find(
    (p) => p.time === time && p.warmth === warmth && LIGHT_LABELS.every(({ key }) => p.lights[key] === lights[key]),
  )?.name;

  // How dark the room is: night starts dark and each light pushes the dark back.
  const night = time === "night";
  const dark = night
    ? Math.max(0, 0.68 - (lights.lamp ? 0.16 : 0) - (lights.fairy ? 0.1 : 0) - (lights.laptop ? 0.06 : 0) - (lights.ceiling ? 0.6 : 0))
    : 0;
  const t = warmth / 100;
  const warm = mix("#9fd8ff", "#ffb547", t);
  const ceilingColor = mix("#e0f2fe", "#fde68a", t);
  const g = (name: string) => `${id}-${name}`;

  return (
    <div className={`cmr ${night ? "is-night" : "is-day"} ${className}`}>
      <style>{CSS}</style>
      <div className="cmr-room">
        <span className="cmr-mood" aria-live="polite">
          <small>Mood</small>
          {mood} ✦
        </span>
        <svg viewBox="0 0 440 410" role="img" aria-label={`A cozy room at ${time}. Mood: ${mood}.`}>
          <defs>
            <radialGradient id={g("lamp")}>
              <stop offset="0" stopColor={warm} stopOpacity=".6" />
              <stop offset="1" stopColor={warm} stopOpacity="0" />
            </radialGradient>
            <radialGradient id={g("screen")}>
              <stop offset="0" stopColor="#38bdf8" stopOpacity=".5" />
              <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={g("ceil")} cy=".1">
              <stop offset="0" stopColor={ceilingColor} stopOpacity=".55" />
              <stop offset="1" stopColor={ceilingColor} stopOpacity="0" />
            </radialGradient>
            <radialGradient id={g("bulb")}>
              <stop offset="0" stopColor={warm} stopOpacity=".9" />
              <stop offset="1" stopColor={warm} stopOpacity="0" />
            </radialGradient>
            <linearGradient id={g("sky")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={night ? "#0b1240" : "#38bdf8"} />
              <stop offset="1" stopColor={night ? "#1e1b4b" : "#bae6fd"} />
            </linearGradient>
            <clipPath id={g("scr")}>
              <rect x="263" y="217" width="60" height="38" rx="3" />
            </clipPath>
            <clipPath id={g("win")}>
              <rect x="50" y="40" width="130" height="150" rx="65" />
            </clipPath>
          </defs>

          {/* walls and floor */}
          <rect className="cmr-fill" width="440" height="290" style={{ fill: night ? "#1d1433" : "#3d2f63" }} />
          <rect className="cmr-fill" y="290" width="440" height="120" style={{ fill: night ? "#2a1c3f" : "#6b4a35" }} />
          <g stroke={night ? "#21162f" : "#5a3d2b"} strokeWidth="2">
            <line x1="0" y1="320" x2="440" y2="320" />
            <line x1="0" y1="352" x2="440" y2="352" />
            <line x1="0" y1="386" x2="440" y2="386" />
          </g>

          {/* window */}
          <g clipPath={`url(#${g("win")})`}>
            <rect x="50" y="40" width="130" height="150" fill={`url(#${g("sky")})`} />
            <g className="cmr-fade" style={{ opacity: night ? 1 : 0 }}>
              <circle cx="140" cy="85" r="14" fill="#fef3c7" />
              <circle cx="134" cy="81" r="12" fill="#0b1240" />
              <g fill="#fff" className="cmr-stars">
                <circle cx="80" cy="80" r="1.5" /><circle cx="100" cy="130" r="1.2" />
                <circle cx="150" cy="150" r="1.5" /><circle cx="70" cy="160" r="1" /><circle cx="115" cy="60" r="1.1" />
              </g>
            </g>
            <g className="cmr-fade" style={{ opacity: night ? 0 : 1 }}>
              <circle cx="135" cy="82" r="18" fill="#fde047" />
              <g fill="#fff">
                <circle cx="80" cy="140" r="12" /><circle cx="96" cy="134" r="15" /><circle cx="112" cy="142" r="11" />
              </g>
            </g>
          </g>
          <rect x="50" y="40" width="130" height="150" rx="65" fill="none" stroke="#312e81" strokeWidth="5" />
          <line x1="115" y1="40" x2="115" y2="190" stroke="#312e81" strokeWidth="3" />
          {/* sunbeam on the floor */}
          <polygon className="cmr-fade" points="60,190 180,190 300,410 120,410" fill="#fef9c3" style={{ opacity: night ? 0 : 0.14 }} />

          {/* ceiling pendant (wire + shade) */}
          <line x1="330" y1="0" x2="330" y2="26" stroke="#9ca3af" strokeWidth="2" />
          <path d="M314 40 h32 l-6 -14 h-20z" fill="#4b5563" onClick={() => toggle("ceiling")} className="cmr-hit" />

          {/* fairy light wire */}
          <path d="M10 30 Q110 70 220 30 Q320 70 430 30" fill="none" stroke="#6b7280" strokeWidth="1.2" />

          {/* rug, desk, laptop body, mug */}
          <ellipse cx="290" cy="375" rx="120" ry="20" fill="#0ea5e9" opacity=".35" />
          <rect x="210" y="260" width="200" height="12" rx="3" fill="#7c3aed" />
          <rect x="222" y="272" width="10" height="70" fill="#5b21b6" />
          <rect x="388" y="272" width="10" height="70" fill="#5b21b6" />
          <path d="M252 260 l8 -48 h66 l8 48z" fill="#1f2937" onClick={() => toggle("laptop")} className="cmr-hit" />
          <path d="M370 260 q0 -14 10 -14 h12 q8 0 8 8 q0 6 -8 6" fill="#fb7185" />
          <path className="cmr-steam" d="M376 244 q2 -8 0 -12 M384 244 q3 -8 0 -14" stroke="#9ca3af" fill="none" />

          {/* floor lamp stand */}
          <line x1="90" y1="250" x2="90" y2="360" stroke="#d4d4d8" strokeWidth="4" />
          <ellipse cx="90" cy="362" rx="24" ry="6" fill="#a1a1aa" />

          {/* beanbag + cat */}
          <ellipse cx="180" cy="350" rx="52" ry="34" fill="#fb7185" />
          <ellipse cx="180" cy="336" rx="36" ry="16" fill="#fda4af" />
          <g className="cmr-cat">
            <ellipse cx="180" cy="330" rx="20" ry="10" fill="#1f2937" />
            <circle cx="196" cy="322" r="9" fill="#1f2937" />
            <path d="M191 316 l2 -8 l4 6 M199 315 l3 -7 l2 8" fill="#1f2937" />
            <path className="cmr-tail" d="M161 333 q-14 2 -12 -10" stroke="#1f2937" strokeWidth="4" fill="none" strokeLinecap="round" />
          </g>

          {/* plant */}
          <path d="M420 340 q-20 -50 0 -90 q20 40 0 90" fill="#22c55e" />
          <path d="M420 340 q-26 -24 -18 -52 q16 20 18 52" fill="#16a34a" />
          <rect x="408" y="340" width="24" height="30" rx="4" fill="#c2410c" />

          {/* darkness + warm tint */}
          <rect className="cmr-fade" width="440" height="410" fill="#04020c" style={{ opacity: dark }} pointerEvents="none" />
          <rect
            className="cmr-fade" width="440" height="410" fill={warm} pointerEvents="none"
            style={{ opacity: night && (lights.lamp || lights.fairy) ? 0.04 + 0.08 * t : 0, mixBlendMode: "soft-light" }}
          />

          {/* light glows */}
          <g pointerEvents="none" style={{ mixBlendMode: "screen" }}>
            <circle className="cmr-fade" cx="330" cy="40" r="300" fill={`url(#${g("ceil")})`} style={{ opacity: lights.ceiling ? 1 : 0 }} />
            <circle className="cmr-fade" cx="90" cy="250" r="140" fill={`url(#${g("lamp")})`} style={{ opacity: lights.lamp ? 1 : 0 }} />
            <circle className="cmr-fade" cx="292" cy="236" r="110" fill={`url(#${g("screen")})`} style={{ opacity: lights.laptop ? (night ? 1 : 0.4) : 0 }} />
          </g>

          {/* light sources (drawn above the dark so they shine) */}
          <circle cx="330" cy="42" r="5" style={{ fill: lights.ceiling ? ceilingColor : "#52525b" }} className="cmr-fill" pointerEvents="none" />
          <path
            d="M62 252 h56 l-12 -40 h-32z" className="cmr-fill cmr-hit"
            style={{ fill: lights.lamp ? mix("#e0f2fe", "#fde68a", t) : "#6b6375" }}
            onClick={() => toggle("lamp")}
          />
          <rect x="263" y="217" width="60" height="38" rx="3" className="cmr-fill cmr-hit" style={{ fill: lights.laptop ? "#38bdf8" : "#111827" }} onClick={() => toggle("laptop")} />
          <image
            href={screenImg.src} x="263" y="217" width="60" height="38" preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${g("scr")})`} className="cmr-fade cmr-hit" style={{ opacity: lights.laptop ? 1 : 0 }}
            onClick={() => toggle("laptop")}
          />
          <g className={`cmr-hit${lights.fairy ? " cmr-twinkle" : ""}`} onClick={() => toggle("fairy")}>
            {BULBS.map(([x, y], i) => (
              <g key={i} style={{ animationDelay: `${(i % 4) * 0.35}s` }}>
                {lights.fairy && <circle cx={x} cy={y} r="13" fill={`url(#${g("bulb")})`} />}
                <circle cx={x} cy={y} r="3.5" className="cmr-fill" style={{ fill: lights.fairy ? "#fff7d6" : "#52525b" }} />
              </g>
            ))}
          </g>

          {/* cat eyes glow in the dark */}
          <g className="cmr-fade" style={{ opacity: dark > 0.45 ? 1 : 0 }} pointerEvents="none">
            <circle cx="193" cy="321" r="1.8" fill="#facc15" />
            <circle cx="200" cy="321" r="1.8" fill="#facc15" />
          </g>
        </svg>
      </div>

      <div className="cmr-panel">
        <p className="cmr-head">Lights &amp; mood</p>
        {LIGHT_LABELS.map(({ key, label }) => (
          <div className="cmr-row" key={key}>
            <span id={g(`lbl-${key}`)}>{label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={lights[key]}
              aria-labelledby={g(`lbl-${key}`)}
              className={`cmr-switch sw-${key}`}
              onClick={() => toggle(key)}
            >
              <span />
            </button>
          </div>
        ))}

        <p className="cmr-label">Time</p>
        <div className="cmr-seg" role="radiogroup" aria-label="Time of day">
          {(["day", "night"] as RoomTime[]).map((tm) => (
            <button key={tm} type="button" role="radio" aria-checked={time === tm} onClick={() => update({ time: tm })}>
              {tm === "day" ? "☀ Day" : "☾ Night"}
            </button>
          ))}
        </div>

        <label className="cmr-label" htmlFor={g("warmth")}>
          Warmth <b>{warmth < 34 ? "Cool" : warmth < 67 ? "Neutral" : "Warm"}</b>
        </label>
        <input
          id={g("warmth")}
          className="cmr-range"
          type="range"
          min={0}
          max={100}
          value={warmth}
          onChange={(e) => update({ warmth: Number(e.target.value) })}
        />

        {showPresets && (
          <>
            <p className="cmr-label">Presets</p>
            <div className="cmr-presets">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  aria-pressed={activePreset === p.name}
                  onClick={() => update({ lights: { ...p.lights }, time: p.time, warmth: p.warmth })}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const CSS = `
.cmr{font-family:var(--font-lexend),system-ui,sans-serif;color:#e7e7ef;display:flex;flex-wrap:wrap;gap:14px;width:100%;max-width:720px;align-items:stretch}
.cmr *{box-sizing:border-box}
.cmr-room{position:relative;display:flex;flex-direction:column;flex:1 1 320px;min-width:0;border-radius:16px;overflow:hidden;background:#0b0b16;border:1px solid #262640}
.cmr-room svg{display:block;width:100%;height:auto}
.cmr-fill{transition:fill .6s ease}
.cmr-fade{transition:opacity .6s ease}
.cmr-hit{cursor:pointer}
.cmr-mood{display:flex;align-items:baseline;gap:10px;padding:10px 14px;border-bottom:1px solid #262640;font-size:14px;font-weight:600;color:#fda4af}
.cmr-mood small{font-size:10px;font-weight:400;color:#9ca3af;letter-spacing:.08em;text-transform:uppercase}
.cmr-panel{flex:1 1 180px;max-width:100%;display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:16px;background:#11111f;border:1px solid #262640}
.cmr-head{margin:0 0 4px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#9ca3af}
.cmr-row{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:14px}
.cmr-switch{position:relative;flex:none;width:42px;height:24px;border-radius:999px;border:0;background:#374151;cursor:pointer;transition:background .25s;padding:0}
.cmr-switch span{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#9ca3af;transition:transform .25s,background .25s}
.cmr-switch[aria-checked="true"]{background:#fbbf24}
.cmr-switch.sw-laptop[aria-checked="true"]{background:#38bdf8}
.cmr-switch.sw-ceiling[aria-checked="true"]{background:#fb7185}
.cmr-switch[aria-checked="true"] span{transform:translateX(18px);background:#fff}
.cmr-label{margin:8px 0 0;font-size:14px;display:flex;justify-content:space-between}
.cmr-label b{font-weight:500;color:#fda4af;font-size:12px}
.cmr-seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:3px;border-radius:10px;background:#1f1f38}
.cmr-seg button,.cmr-presets button{font:inherit;font-size:13px;border:0;border-radius:8px;padding:6px 4px;cursor:pointer;background:transparent;color:#9ca3af;transition:background .2s,color .2s}
.cmr-seg button[aria-checked="true"]{background:#fb7185;color:#111;font-weight:600}
.cmr-range{width:100%;height:6px;border-radius:3px;appearance:none;-webkit-appearance:none;background:linear-gradient(90deg,#38bdf8,#fbbf24);cursor:pointer;margin:6px 0}
.cmr-range::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#fff;border:0;box-shadow:0 0 0 3px rgba(0,0,0,.4)}
.cmr-range::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#fff;border:0}
.cmr-presets{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.cmr-presets button{background:#1f1f38;color:#e7e7ef}
.cmr-presets button:hover,.cmr-seg button:hover{color:#fff}
.cmr-presets button[aria-pressed="true"]{background:#38bdf8;color:#111;font-weight:600}
.cmr button:focus-visible,.cmr-range:focus-visible{outline:2px solid #fb7185;outline-offset:2px}
.cmr-twinkle > g{animation:cmr-tw 2.4s ease-in-out infinite}
@keyframes cmr-tw{0%,100%{opacity:1}50%{opacity:.55}}
.cmr-tail{transform-origin:161px 333px;animation:cmr-tail 3s ease-in-out infinite}
@keyframes cmr-tail{0%,100%{transform:rotate(0)}50%{transform:rotate(14deg)}}
.cmr-steam{animation:cmr-steam 2.5s ease-in-out infinite}
@keyframes cmr-steam{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:.9;transform:translateY(-3px)}}
@media (prefers-reduced-motion:reduce){.cmr *{animation:none!important;transition:none!important}}
`;
