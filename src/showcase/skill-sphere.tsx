"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";

export type SphereShape = "sphere" | "ring" | "helix" | "heart";

export interface Skill {
  emoji: string;
  name: string;
  category: string;
  /** 0 to 100. */
  level: number;
  experience?: string;
  description?: string;
  /** Names of related skills. Lines are drawn to them when this skill is selected. */
  related?: string[];
}

export interface SkillSphereProps {
  /** Skills shown on the sphere. */
  skills?: Skill[];
  /** Category name to colour. Order sets the filter buttons. */
  categories?: Record<string, string>;
  title?: string;
  /** Shape at the start. */
  defaultShape?: SphereShape;
  /** Spin slowly on its own. */
  autoRotate?: boolean;
  /** Show the form that lets visitors add their own skill. */
  allowAdd?: boolean;
  /** Keep added skills in localStorage under this key. Empty string turns saving off. */
  storageKey?: string;
  /** Height of the 3D stage in px. */
  height?: number;
  /** Small pings made with Web Audio. */
  sound?: boolean;
  /** Called when a skill is selected, or with null when the card closes. */
  onSelect?: (skill: Skill | null) => void;
  /** Called when a visitor adds a skill. */
  onAdd?: (skill: Skill) => void;
  className?: string;
}

const DEFAULT_CATEGORIES: Record<string, string> = { Frontend: "#7fd6c2", Design: "#ff7a90", Tools: "#a98bff", Fun: "#ffb86b" };

const s = (emoji: string, name: string, category: string, level: number, experience: string, description: string, related: string[]): Skill =>
  ({ emoji, name, category, level, experience, description, related });

export const DEFAULT_SKILLS: Skill[] = [
  s("⚛️", "React", "Frontend", 90, "2 years", "Building UI out of small components. This whole gallery is React.", ["Next.js", "TypeScript", "JavaScript"]),
  s("🟨", "JavaScript", "Frontend", 88, "3 years", "The heart of everything: canvas, audio, DOM.", ["TypeScript", "React", "Canvas"]),
  s("🔷", "TypeScript", "Frontend", 75, "1 year", "Fewer bugs, more peace.", ["JavaScript", "React"]),
  s("▲", "Next.js", "Frontend", 80, "1 year", "Static export, deployed on Vercel.", ["React", "Vercel"]),
  s("🎨", "CSS", "Frontend", 85, "3 years", "Layout, animation and a little glass.", ["Tailwind", "Motion", "HTML"]),
  s("🌬", "Tailwind", "Frontend", 78, "1 year", "Fast styling with utility classes.", ["CSS", "Next.js"]),
  s("🌐", "HTML", "Frontend", 95, "4 years", "Where it all starts.", ["CSS", "Accessibility"]),
  s("♿", "Accessibility", "Frontend", 65, "1 year", "Keyboard, screen readers and contrast.", ["HTML", "Responsive"]),
  s("📱", "Responsive", "Frontend", 82, "2 years", "Looks good on a phone too.", ["CSS", "Accessibility"]),
  s("🖌", "Figma", "Design", 80, "2 years", "Design first, code second.", ["UI Design", "Color"]),
  s("🧩", "UI Design", "Design", 76, "2 years", "Cards, buttons and layouts that feel right.", ["Figma", "Motion", "Color"]),
  s("🌈", "Color", "Design", 70, "2 years", "Palettes, contrast and mood.", ["UI Design", "Figma"]),
  s("✨", "Motion", "Design", 72, "1 year", "Smooth, bouncy animation.", ["CSS", "Canvas"]),
  s("🖼", "Canvas", "Tools", 70, "1 year", "Physics, particles and ink blots.", ["JavaScript", "Motion", "Web Audio"]),
  s("🔊", "Web Audio", "Tools", 60, "6 months", "Beeps, noise and tiny songs.", ["Canvas", "JavaScript"]),
  s("🐙", "GitHub", "Tools", 85, "2 years", "Commits, pull requests and reviews every day.", ["Git", "Vercel"]),
  s("🌿", "Git", "Tools", 80, "2 years", "Branch, merge, rebase.", ["GitHub"]),
  s("🚀", "Vercel", "Tools", 75, "1 year", "Deploy in one push.", ["Next.js", "GitHub"]),
  s("🧪", "Playwright", "Tools", 55, "6 months", "Browser tests and screenshots.", ["JavaScript"]),
  s("🎧", "Lofi", "Fun", 100, "always", "Always on while working.", ["Coffee", "Cats"]),
  s("☕", "Coffee", "Fun", 100, "always", "Fuel. +10 energy.", ["Lofi", "Late nights"]),
  s("🐱", "Cats", "Fun", 90, "forever", "Best coworkers.", ["Lofi", "Games"]),
  s("🎮", "Games", "Fun", 70, "since childhood", "Making and playing small games.", ["Canvas", "Cats"]),
  s("🌙", "Late nights", "Fun", 85, "90 days", "A 90 day challenge means late nights.", ["Coffee", "Lofi"]),
];

const SHAPES: { id: SphereShape; label: string }[] = [
  { id: "sphere", label: "🌐 Globe" },
  { id: "ring", label: "🪐 Ring" },
  { id: "helix", label: "🧬 DNA" },
  { id: "heart", label: "💜 Heart" },
];

type V3 = [number, number, number];
type Node = { p: V3; t: V3; vis: number; sx: number; sy: number; z: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function heartPoints(n: number): [number, number][] {
  const H = (t: number): [number, number] => [
    (1.25 * 16 * Math.sin(t) ** 3) / 17,
    (-(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17) * 1.1 + 0.05,
  ];
  const pts: [number, number][] = [];
  const len = [0];
  for (let k = 0; k <= 600; k++) {
    pts.push(H((k / 600) * Math.PI * 2));
    if (k) len.push(len[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  }
  const out: [number, number][] = [];
  let k = 0;
  for (let i = 0; i < n; i++) {
    const want = (i / n) * len[600];
    while (len[k] < want) k++;
    out.push(pts[k]);
  }
  return out;
}

function shapePoints(shape: SphereShape | "scatter", n: number): V3[] {
  const heart = shape === "heart" ? heartPoints(n) : [];
  return Array.from({ length: n }, (_, i): V3 => {
    if (shape === "sphere") {
      const y = n > 1 ? 1 - (i / (n - 1)) * 2 : 0;
      const r = Math.sqrt(1 - y * y);
      const th = Math.PI * (3 - Math.sqrt(5)) * i;
      return [Math.cos(th) * r, y, Math.sin(th) * r];
    }
    if (shape === "ring") {
      const inner = i % 3 === 0;
      const a = (i / n) * Math.PI * 2 * (inner ? 3 : 1.5) + (inner ? 0.3 : 0);
      return inner ? [Math.cos(a) * 0.35, (i / n - 0.5) * 0.7, Math.sin(a) * 0.35] : [Math.cos(a) * 1.05, Math.sin(a) * 0.13, Math.sin(a) * 1.05];
    }
    if (shape === "helix") {
      const a = i * 0.75 + (i % 2 ? Math.PI : 0);
      return [Math.cos(a) * 0.55, n > 1 ? -1.1 + (2.2 * i) / (n - 1) : 0, Math.sin(a) * 0.55];
    }
    if (shape === "heart") return [heart[i][0], heart[i][1], i % 2 ? 0.12 : -0.12];
    return [(Math.random() - 0.5) * 3.4, (Math.random() - 0.5) * 2.6, (Math.random() - 0.5) * 2];
  });
}

function loadAdded(key: string): Skill[] {
  if (!key) return [];
  try {
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? v.filter((x) => x && typeof x.name === "string") : [];
  } catch {
    return [];
  }
}

export default function SkillSphere({
  skills = DEFAULT_SKILLS,
  categories = DEFAULT_CATEGORIES,
  title = "✨ My Skills",
  defaultShape = "sphere",
  autoRotate = true,
  allowAdd = true,
  storageKey = "skill-sphere:v1",
  height = 480,
  sound = true,
  onSelect,
  onAdd,
  className = "",
}: SkillSphereProps) {
  const [added, setAdded] = useState<Skill[]>([]);
  const [cat, setCat] = useState("All");
  const [query, setQuery] = useState("");
  const [selName, setSelName] = useState<string | null>(null);
  const [shape, setShapeState] = useState<SphereShape>(defaultShape);
  const [auto, setAuto] = useState(autoRotate);
  const [soundOn, setSoundOn] = useState(sound);
  const [form, setForm] = useState({ emoji: "🚀", name: "", category: Object.keys(categories)[0] ?? "Other", level: 60 });

  const all = useMemo(() => {
    const seen = new Set<string>();
    return [...skills, ...added].filter((k) => (seen.has(k.name.toLowerCase()) ? false : (seen.add(k.name.toLowerCase()), true)));
  }, [skills, added]);
  const selected = all.find((k) => k.name === selName) ?? null;
  const colorOf = (c: string) => categories[c] ?? "#a69dc0";

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tagRefs = useRef(new Map<string, HTMLButtonElement>());
  const live = useRef({ all, shape, cat, query, sel: selName, auto, zoom: 1, sound: soundOn, categories, scatter: 0 });
  live.current = { ...live.current, all, shape, cat, query: query.trim().toLowerCase(), sel: selName, auto, sound: soundOn, categories };
  const audio = useRef<AudioContext | null>(null);
  const clickEmpty = useRef(() => {});

  const beep = (f: number, d = 0.12, type: OscillatorType = "sine", v = 0.06, wait = 0) => {
    if (!live.current.sound || typeof window === "undefined") return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audio.current) audio.current = new Ctx();
      const a = audio.current;
      if (a.state === "suspended") a.resume();
      const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + wait;
      o.type = type;
      o.frequency.value = f;
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g).connect(a.destination);
      o.start(t);
      o.stop(t + d);
    } catch {
      /* audio is optional */
    }
  };

  useEffect(() => setAdded(loadAdded(storageKey)), [storageKey]);
  useEffect(() => () => void audio.current?.close(), []);

  const select = (name: string | null) => {
    setSelName(name);
    const k = name ? live.current.all.find((x) => x.name === name) ?? null : null;
    onSelect?.(k);
    if (k) {
      const i = live.current.all.indexOf(k);
      beep(520 + (i % 8) * 60, 0.12);
      beep(1040 + (i % 8) * 120, 0.18, "sine", 0.03, 0.06);
    }
  };

  const setShape = (sh: SphereShape) => {
    setShapeState(sh);
    beep(440, 0.1);
    beep(660, 0.12, "sine", 0.05, 0.08);
  };

  const scatter = () => {
    live.current.scatter = performance.now();
    [200, 260, 330, 420].forEach((f, i) => beep(f, 0.12, "triangle", 0.05, i * 0.05));
    window.setTimeout(() => [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.15, "sine", 0.05, i * 0.07)), 1300);
  };

  const addSkill = (e: FormEvent) => {
    e.preventDefault();
    const name = form.name.trim().slice(0, 24);
    if (!name || all.some((k) => k.name.toLowerCase() === name.toLowerCase())) return;
    const k: Skill = {
      emoji: form.emoji.trim() || "⭐", name, category: form.category, level: form.level, experience: "new!",
      description: "Added by you.", related: all.filter((x) => x.category === form.category).slice(0, 2).map((x) => x.name),
    };
    const next = [...added, k];
    setAdded(next);
    setForm((f) => ({ ...f, name: "" }));
    if (storageKey) {
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* storage is optional */ }
    }
    onAdd?.(k);
    [660, 880, 1320].forEach((f, i) => beep(f, 0.12, "sine", 0.05, i * 0.06));
    window.setTimeout(() => select(k.name), 700);
  };

  clickEmpty.current = () => select(null);

  /* animation engine: reads the latest state through `live`, writes transforms straight to the DOM */
  useEffect(() => {
    const stage = stageRef.current, cv = canvasRef.current;
    if (!stage || !cv) return;
    const x = cv.getContext("2d");
    if (!x) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = new Map<string, Node>();
    let ax = 0.25, ay = 0, vx = 0.002, vy = 0.005, tx: number | null = null, ty: number | null = null;
    let tilt: [number, number] = [0, 0], hover = false, W = 0, H = 0, raf = 0, started = false;
    let drag: { x: number; y: number; moved: number } | null = null;
    let lastKey = "", lastSel: string | null = null, lastScatter = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const fit = () => {
      W = stage.clientWidth;
      H = stage.clientHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);

    const retarget = (sh: SphereShape | "scatter") => {
      const list = live.current.all;
      const pts = shapePoints(sh, list.length);
      list.forEach((k, i) => {
        let n = nodes.get(k.name);
        if (!n) {
          const p: V3 = started ? [0, 0, 0] : [(Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3];
          n = { p, t: pts[i], vis: 1, sx: 0, sy: 0, z: 0 };
          nodes.set(k.name, n);
        }
        n.t = pts[i];
      });
    };

    const focus = (name: string | null) => {
      const n = name ? nodes.get(name) : null;
      if (!n) { tx = ty = null; return; }
      const [X, Y, Z] = n.t, r = Math.hypot(X, Z) || 1e-3;
      ty = ay + wrapAngle(Math.atan2(-X, Z) - ay);
      tx = ax + wrapAngle(Math.atan2(Y, r) - ax);
      vx = vy = 0;
    };

    const local = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5] as [number, number];
    };
    const isUi = (t: EventTarget | null) => t instanceof Element && !!t.closest(".ssp-tag,.ssp-ui,.ssp-card");
    const down = (e: PointerEvent) => {
      if (isUi(e.target)) return;
      drag = { x: e.clientX, y: e.clientY, moved: 0 };
      stage.setPointerCapture(e.pointerId);
      stage.classList.add("is-grab");
      tx = ty = null;
    };
    const move = (e: PointerEvent) => {
      tilt = local(e);
      hover = e.pointerType === "mouse";
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      vy = dx * 0.004;
      vx = -dy * 0.004;
      ay += dx * 0.006;
      ax -= dy * 0.006;
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const up = () => {
      if (drag && drag.moved < 4 && live.current.sel) clickEmpty.current();
      drag = null;
      stage.classList.remove("is-grab");
    };
    const leave = () => { hover = false; tilt = [0, 0]; };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      live.current.zoom = Math.min(1.6, Math.max(0.6, live.current.zoom - e.deltaY * 0.001));
    };
    const key = (e: globalThis.KeyboardEvent) => {
      if (e.target !== stage) return;
      const k: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [1, 0], ArrowDown: [-1, 0] };
      if (k[e.key]) {
        e.preventDefault();
        tx = ty = null;
        vx += k[e.key][0] * 0.015;
        vy += k[e.key][1] * 0.015;
      }
    };
    stage.addEventListener("pointerdown", down);
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);
    stage.addEventListener("pointerleave", leave);
    stage.addEventListener("wheel", wheel, { passive: false });
    stage.addEventListener("keydown", key);

    const frame = (t: number) => {
      const L = live.current;
      const k = L.shape + "|" + L.all.map((a) => a.name).join(",");
      if (L.scatter && L.scatter !== lastScatter) {
        lastScatter = L.scatter;
        retarget("scatter");
        vx += (Math.random() - 0.5) * 0.08;
        vy += (Math.random() - 0.5) * 0.08;
        tx = ty = null;
      }
      const scattering = !!L.scatter && t - L.scatter < 1300;
      if (L.scatter && !scattering) {
        L.scatter = 0;
        lastScatter = 0;
        lastKey = "";
      }
      if (!scattering && k !== lastKey) {
        lastKey = k;
        retarget(L.shape);
        if (L.sel) focus(L.sel);
      }
      started = true;
      if (L.sel !== lastSel) { lastSel = L.sel; focus(L.sel); }

      if (tx !== null && ty !== null) { ax = lerp(ax, tx, 0.08); ay = lerp(ay, ty, 0.08); }
      else if (!drag) {
        if (L.shape === "heart" && !scattering) {
          ay = lerp(ay, (reduce ? 0 : Math.sin(t / 1200) * 0.35) + tilt[0] * 0.6, 0.05);
          ax = lerp(ax, tilt[1] * 0.4, 0.05);
          vx = vy = 0;
        } else {
          vx *= 0.96; vy *= 0.96;
          const base = L.auto && !reduce ? (hover ? 0.0015 : 0.004) : 0;
          ay += vy + base + tilt[0] * 0.006;
          ax += vx + tilt[1] * 0.004;
        }
      }

      const R = Math.min(W, H) * 0.36 * L.zoom, cx = W / 2, cy = H / 2 - 8;
      const ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(ay), sb = Math.sin(ay);
      const selSkill = L.all.find((a) => a.name === L.sel);
      const colorFor = (c: string) => L.categories[c] ?? "#a69dc0";
      x.clearRect(0, 0, W, H);
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, R * 1.3);
      g.addColorStop(0, (selSkill ? colorFor(selSkill.category) : "#a98bff") + "30");
      g.addColorStop(1, "#00000000");
      x.fillStyle = g;
      x.fillRect(0, 0, W, H);

      const order: Node[] = [];
      L.all.forEach((sk) => {
        const n = nodes.get(sk.name), el = tagRefs.current.get(sk.name);
        if (!n || !el) return;
        const speed = scattering ? 0.09 : 0.07;
        for (let i = 0; i < 3; i++) n.p[i] = lerp(n.p[i], n.t[i], speed);
        const [X, Y, Z] = n.p;
        const x1 = X * cb + Z * sb, z1 = -X * sb + Z * cb, y1 = Y * ca - z1 * sa, z2 = Y * sa + z1 * ca;
        const inCat = L.cat === "All" || sk.category === L.cat;
        const hit = !!L.query && (sk.name.toLowerCase().includes(L.query) || sk.category.toLowerCase().includes(L.query));
        n.vis = lerp(n.vis, inCat && (!L.query || hit) ? 1 : 0.12, 0.15);
        const isSel = sk.name === L.sel;
        let sc = (0.62 + (z2 + 1) * 0.27) * (n.vis > 0.5 ? 1 : 0.75) * Math.min(1.25, L.zoom);
        if (isSel) sc *= 1.25;
        n.sx = cx + x1 * R; n.sy = cy + y1 * R; n.z = z2;
        el.style.transform = `translate(-50%,-50%) translate(${(x1 * R).toFixed(1)}px,${(y1 * R - 8).toFixed(1)}px) scale(${sc.toFixed(3)})`;
        el.style.opacity = isSel ? "1" : ((0.25 + (z2 + 1) * 0.375) * n.vis).toFixed(3);
        el.style.zIndex = isSel ? "250" : String(Math.round((z2 + 1) * 100));
        el.style.filter = z2 < -0.35 && !isSel ? "blur(1px)" : "";
        el.classList.toggle("is-hit", hit);
        el.classList.toggle("is-off", n.vis < 0.5);
        el.tabIndex = n.vis < 0.5 ? -1 : 0;
        order.push(n);
      });

      if (!scattering && (L.shape === "heart" || L.shape === "helix") && order.length > 1) {
        x.lineWidth = 1.5;
        if (L.shape === "heart") {
          x.strokeStyle = "#ff7a90"; x.globalAlpha = 0.35; x.shadowColor = "#ff7a90"; x.shadowBlur = 12;
          x.beginPath();
          order.forEach((n, i) => (i ? x.lineTo(n.sx, n.sy) : x.moveTo(n.sx, n.sy)));
          x.closePath(); x.stroke(); x.shadowBlur = 0;
        } else {
          x.strokeStyle = "#7fd6c2";
          for (let i = 0; i + 1 < order.length; i += 2) {
            const a = order[i], b = order[i + 1];
            x.globalAlpha = 0.12 + (0.25 * ((a.z + b.z) / 2 + 1)) / 2;
            x.beginPath(); x.moveTo(a.sx, a.sy); x.lineTo(b.sx, b.sy); x.stroke();
          }
        }
        x.globalAlpha = 1;
      }

      const sn = selSkill && nodes.get(selSkill.name);
      if (selSkill && sn) {
        const c = colorFor(selSkill.category);
        (selSkill.related ?? []).forEach((name, i) => {
          const r = nodes.get(name);
          if (!r || !L.all.some((a) => a.name === name)) return;
          const mx = (sn.sx + r.sx) / 2 + (cy - (sn.sy + r.sy) / 2) * 0.15, my = (sn.sy + r.sy) / 2 - (cx - (sn.sx + r.sx) / 2) * 0.15;
          x.strokeStyle = c; x.globalAlpha = 0.25 + (0.35 * (r.z + 1)) / 2; x.lineWidth = 2;
          x.setLineDash([6, 8]); x.lineDashOffset = reduce ? 0 : -t / 30;
          x.beginPath(); x.moveTo(sn.sx, sn.sy); x.quadraticCurveTo(mx, my, r.sx, r.sy); x.stroke();
          x.setLineDash([]);
          if (!reduce) {
            const q = (t / 1400 + i * 0.3) % 1;
            const px = (1 - q) ** 2 * sn.sx + 2 * (1 - q) * q * mx + q * q * r.sx, py = (1 - q) ** 2 * sn.sy + 2 * (1 - q) * q * my + q * q * r.sy;
            x.globalAlpha = 0.9; x.fillStyle = "#fff"; x.beginPath(); x.arc(px, py, 2.5, 0, Math.PI * 2); x.fill();
          }
        });
        x.globalAlpha = 1;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      stage.removeEventListener("pointerdown", down);
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerup", up);
      stage.removeEventListener("pointercancel", up);
      stage.removeEventListener("pointerleave", leave);
      stage.removeEventListener("wheel", wheel);
      stage.removeEventListener("keydown", key);
    };
  }, []);

  const cats = ["All", ...Object.keys(categories)];
  const avg = all.length ? Math.round(all.reduce((t, k) => t + k.level, 0) / all.length) : 0;
  const top = [...all].sort((a, b) => b.level - a.level)[0];

  return (
    <div className={`ssp ${className}`}>
      <style>{CSS}</style>
      <div className="ssp-top">
        <h3>{title}</h3>
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 Search skills…" aria-label="Search skills" />
        <button type="button" onClick={() => setSoundOn((v) => !v)} aria-pressed={soundOn} aria-label="Sound">{soundOn ? "🔊" : "🔇"}</button>
      </div>
      <div className="ssp-cats">
        {cats.map((c) => (
          <button key={c} type="button" className={cat === c ? "on" : ""} onClick={() => { setCat(c); beep(600, 0.08); if (selected && c !== "All" && selected.category !== c) select(null); }}>
            {c !== "All" && <i style={{ background: colorOf(c) }} />}{c}
          </button>
        ))}
      </div>

      <div ref={stageRef} className="ssp-stage" style={{ height }} tabIndex={0} aria-label="Skill sphere. Drag or use the arrow keys to rotate."
        onKeyDown={(e) => { if (e.key === "Escape") select(null); }}>
        <canvas ref={canvasRef} aria-hidden="true" />
        <span className="ssp-hint">Drag to spin · scroll to zoom</span>
        {all.map((k) => (
          <button key={k.name} type="button" className={`ssp-tag${k.name === selName ? " is-sel" : ""}${selected?.related?.includes(k.name) ? " is-rel" : ""}`}
            ref={(el) => { if (el) tagRefs.current.set(k.name, el); else tagRefs.current.delete(k.name); }}
            style={{ "--c": colorOf(k.category) } as CSSProperties} onClick={() => select(k.name)} aria-pressed={k.name === selName}>
            <i style={{ background: colorOf(k.category) }} />{k.emoji} {k.name}
          </button>
        ))}

        <div className="ssp-ui ssp-zoom">
          <button type="button" aria-label="Zoom in" onClick={() => (live.current.zoom = Math.min(1.6, live.current.zoom + 0.15))}>＋</button>
          <button type="button" aria-label="Zoom out" onClick={() => (live.current.zoom = Math.max(0.6, live.current.zoom - 0.15))}>－</button>
          <button type="button" aria-label={auto ? "Pause rotation" : "Resume rotation"} onClick={() => setAuto((v) => !v)}>{auto ? "⏸" : "▶"}</button>
        </div>

        <div className={`ssp-card${selected ? " on" : ""}`} style={{ "--c": selected ? colorOf(selected.category) : "#3d3256" } as CSSProperties} aria-live="polite">
          {selected && (
            <>
              <button type="button" className="ssp-x" aria-label="Close" onClick={() => select(null)}>✕</button>
              <div className="ssp-em">{selected.emoji}</div>
              <h4>{selected.name}</h4>
              <div className="ssp-cat">{selected.category}</div>
              {selected.description && <p>{selected.description}</p>}
              <div className="ssp-row"><span>Level</span><span>{selected.level}%</span></div>
              <div className="ssp-bar"><b key={selected.name} style={{ width: `${Math.max(0, Math.min(100, selected.level))}%` }} /></div>
              {selected.experience && <div className="ssp-row"><span>Experience</span><span>{selected.experience}</span></div>}
              <div className="ssp-rel">
                {(selected.related ?? []).map((n) => all.find((a) => a.name === n)).filter((a): a is Skill => !!a).map((r) => (
                  <button key={r.name} type="button" onClick={() => select(r.name)}>{r.emoji} {r.name}</button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="ssp-ui ssp-shapes">
          {SHAPES.map((sh) => (
            <button key={sh.id} type="button" className={shape === sh.id ? "on" : ""} aria-pressed={shape === sh.id} onClick={() => setShape(sh.id)}>{sh.label}</button>
          ))}
          <button type="button" onClick={scatter}>💥 Scatter</button>
        </div>
      </div>

      {allowAdd && (
        <form className="ssp-add" onSubmit={addSkill}>
          <input type="text" className="ssp-emoji" value={form.emoji} maxLength={4} aria-label="Emoji" onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
          <input type="text" className="ssp-name" value={form.name} maxLength={24} placeholder="Add your own skill" aria-label="Skill name" onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select value={form.category} aria-label="Category" onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {Object.keys(categories).map((c) => <option key={c}>{c}</option>)}
          </select>
          <label>Level <input type="range" min={10} max={100} value={form.level} onChange={(e) => setForm({ ...form, level: +e.target.value })} /></label>
          <button type="submit">＋ Add</button>
        </form>
      )}

      <div className="ssp-stats">
        <span><b>{all.length}</b> skills</span>
        <span><b>{Object.keys(categories).length}</b> categories</span>
        <span>Average level <b>{avg}%</b></span>
        {top && <span>Top: <b>{top.emoji} {top.name}</b></span>}
      </div>
    </div>
  );
}

const CSS = `
.ssp{--ink:#ece7f6;--mute:#a69dc0;--panel:#18141f;--line:#2f2742;--btn:#2a2238;--btnb:#3d3256;--acc:#ffb86b;--mint:#7fd6c2;
  width:min(820px,90vw);color:var(--ink);font-family:inherit;text-align:left;background:var(--panel);border:1px solid var(--line);border-radius:22px;overflow:hidden;box-shadow:0 20px 50px #0007}
.ssp button,.ssp select,.ssp input{font:inherit}
.ssp button{font-weight:700;font-size:13px;background:var(--btn);color:var(--ink);border:1px solid var(--btnb);border-radius:999px;padding:7px 13px;cursor:pointer;white-space:nowrap;line-height:1.2}
.ssp button:hover{border-color:var(--acc)}
.ssp button.on{background:var(--acc);color:#1a1020;border-color:var(--acc)}
.ssp :focus-visible{outline:2px solid var(--mint);outline-offset:2px}
.ssp input[type=text],.ssp select{font-size:14px;background:var(--btn);color:var(--ink);border:1px solid var(--btnb);border-radius:999px;padding:7px 14px;min-width:0}
.ssp-top{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:14px 16px;border-bottom:1px solid var(--line)}
.ssp-top h3{margin:0 auto 0 0;font-size:22px;font-weight:700}
.ssp-top input{width:190px}
.ssp-cats{display:flex;gap:6px;flex-wrap:wrap;padding:12px 16px 0}
.ssp-cats i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:1px}
.ssp-stage{position:relative;margin:12px;border-radius:16px;overflow:hidden;background:radial-gradient(circle at 50% 46%,#2b2244,#141020 70%);user-select:none;-webkit-user-select:none;touch-action:none;cursor:grab;outline:none}
.ssp-stage:focus-visible{box-shadow:inset 0 0 0 2px var(--mint)}
.ssp-stage.is-grab{cursor:grabbing}
.ssp-stage canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.ssp-hint{position:absolute;left:12px;top:14px;font-size:12px;color:#fffa;z-index:300;pointer-events:none}
.ssp .ssp-tag{position:absolute;left:50%;top:50%;display:flex;align-items:center;gap:6px;font-weight:800;font-size:14px;padding:5px 11px 5px 8px;background:#241d33;will-change:transform,opacity;transition:background .2s,border-color .2s,box-shadow .2s;opacity:0}
.ssp-tag i{width:8px;height:8px;border-radius:50%;flex:none}
.ssp .ssp-tag:hover{border-color:var(--c)}
.ssp .ssp-tag.is-sel{background:var(--c);color:#1a1020;border-color:var(--c);box-shadow:0 0 24px var(--c)}
.ssp .ssp-tag.is-rel{border-color:var(--c);box-shadow:0 0 14px color-mix(in srgb,var(--c) 60%,transparent)}
.ssp .ssp-tag.is-hit{border-color:#fff;box-shadow:0 0 0 2px #fff6}
.ssp-tag.is-off{pointer-events:none}
.ssp-zoom{position:absolute;right:10px;top:10px;display:flex;gap:6px;z-index:300}
.ssp-zoom button{width:34px;height:34px;padding:0;background:#1c1628d9}
.ssp-shapes{position:absolute;left:10px;bottom:10px;display:flex;gap:6px;flex-wrap:wrap;z-index:300;max-width:calc(100% - 20px)}
.ssp-shapes button{background:#1c1628d9;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.ssp-shapes button.on{background:var(--acc)}
.ssp-card{position:absolute;right:12px;top:54px;width:250px;background:#1d1729f2;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid var(--c);border-radius:16px;padding:16px;z-index:400;
  transform:translateX(30px) scale(.95);opacity:0;pointer-events:none;transition:transform .35s cubic-bezier(.3,1.4,.5,1),opacity .25s;box-shadow:0 20px 40px #0008;cursor:default}
.ssp-card.on{transform:none;opacity:1;pointer-events:auto}
.ssp .ssp-x{position:absolute;right:8px;top:8px;width:28px;height:28px;padding:0}
.ssp-em{font-size:38px;line-height:1}
.ssp-card h4{margin:6px 0 0;font-size:22px}
.ssp-cat{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--c)}
.ssp-card p{font-size:13px;color:var(--mute);margin:6px 0 0;line-height:1.45}
.ssp-row{margin-top:10px;font-size:12px;display:flex;justify-content:space-between;color:var(--mute)}
.ssp-bar{height:8px;background:#ffffff18;border-radius:8px;overflow:hidden;margin-top:4px}
.ssp-bar b{display:block;height:100%;background:var(--c);border-radius:8px;animation:ssp-grow .8s cubic-bezier(.2,.8,.2,1)}
@keyframes ssp-grow{from{width:0}}
.ssp-rel{display:flex;gap:5px;flex-wrap:wrap;margin-top:10px}
.ssp-rel button{font-size:11px;padding:3px 9px}
.ssp-add{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:0 16px 14px}
.ssp .ssp-emoji{width:62px;text-align:center}
.ssp .ssp-name{flex:1;min-width:140px}
.ssp-add label{font-size:12px;color:var(--mute);display:flex;align-items:center;gap:6px}
.ssp-add input[type=range]{accent-color:var(--mint)}
.ssp-stats{display:flex;gap:18px;flex-wrap:wrap;padding:12px 16px;border-top:1px solid var(--line);font-size:13px;color:var(--mute)}
.ssp-stats b{color:var(--ink)}
@media (max-width:640px){
  .ssp-top input{width:100%;order:3}
  .ssp-card{left:10px;right:10px;width:auto;top:auto;bottom:56px;transform:translateY(30px)}
  .ssp-card.on{transform:none}
}
@media (prefers-reduced-motion:reduce){.ssp-card{transition:opacity .2s}.ssp-bar b{animation:none}}
`;
