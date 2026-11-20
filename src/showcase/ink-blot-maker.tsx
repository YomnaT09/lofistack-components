"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

export type InkTool = "pen" | "blow" | "brush" | "rainbow" | "drop" | "spray" | "splat" | "eraser";
export type FoldMode = "v" | "h" | "q";

export interface InkBlotMakerProps {
  /** Ink colours in the palette. A rainbow button for any custom colour is always added. */
  colors?: string[];
  /** Paper colours to choose from. The first one is used at the start. */
  papers?: string[];
  /** Tool selected at the start. */
  defaultTool?: InkTool;
  /** Fold selected at the start: v = left/right, h = top/bottom, q = four ways. */
  defaultMode?: FoldMode;
  /** Start with a folded example blot on the paper. */
  showExample?: boolean;
  /** Show the framed gallery under the studio. */
  showGallery?: boolean;
  /** Keep the gallery in localStorage under this key. Empty string turns saving off. */
  storageKey?: string;
  /** Initials on the signature seal when no title is typed. */
  signature?: string;
  /** Paper, ink and squeak sounds made with Web Audio. */
  sound?: boolean;
  /** Called when a picture is added to the gallery. */
  onSave?: (picture: { name: string; dataUrl: string }) => void;
  className?: string;
}

const DEFAULT_COLORS = ["#1d1a2e", "#3b1f5a", "#7a1f2e", "#e63946", "#ff8c42", "#ffb703", "#2a9d8f", "#1d70b8", "#e56bb5", "#ffffff"];
const DEFAULT_PAPERS = ["#f6efe2", "#ffffff", "#c9a77c", "#17151c"];
const PAPER_NAMES: Record<string, string> = { "#f6efe2": "Cream", "#ffffff": "White", "#c9a77c": "Kraft", "#17151c": "Black" };

const TOOLS: { id: InkTool; icon: string; name: string; key: string }[] = [
  { id: "pen", icon: "✒️", name: "Pen", key: "p" },
  { id: "brush", icon: "🖌️", name: "Brush", key: "b" },
  { id: "rainbow", icon: "🌈", name: "Rainbow", key: "r" },
  { id: "drop", icon: "💧", name: "Ink drop", key: "d" },
  { id: "blow", icon: "🌬️", name: "Straw blow", key: "w" },
  { id: "spray", icon: "🌫️", name: "Spray", key: "s" },
  { id: "splat", icon: "💥", name: "Splatter", key: "x" },
  { id: "eraser", icon: "🧽", name: "Eraser", key: "e" },
];
const MODES: { id: FoldMode; icon: string; label: string }[] = [
  { id: "v", icon: "↔", label: "Fold left and right" },
  { id: "h", icon: "↕", label: "Fold top and bottom" },
  { id: "q", icon: "✚", label: "Fold four ways" },
];
const GUESSES = ["a butterfly 🦋", "two cats face to face 🐈", "a robot face 🤖", "a flower 🌸", "a bat 🦇", "two dancers 💃", "an owl 🦉", "a mask 🎭", "a water lily 🪷", "a jellyfish 🪼", "a rocket 🚀"];
const LINES = ["Hi! I'm your blot 👋", "Put me in the gallery?", "Am I a butterfly or a cat? 🤔", "This ink is cold…", "More colours please!", "Do I look cute? 🥺"];

const W = 1200;
const H = 746;
type P = [number, number];
type Picture = { name: string; img: string; paper: string; date: string };

// Tiny Web Audio helpers so the component needs no sound files.
let actx: AudioContext | null = null;
function audio() {
  actx ??= new AudioContext();
  if (actx.state === "suspended") void actx.resume();
  return actx;
}
function rustle(dur = 0.15, vol = 0.05) {
  try {
    const a = audio();
    const b = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = a.createBufferSource();
    const g = a.createGain();
    g.gain.value = vol;
    s.buffer = b;
    s.connect(g).connect(a.destination);
    s.start();
  } catch {
    /* audio is optional */
  }
}
function chirp() {
  try {
    const a = audio();
    const o = a.createOscillator();
    const g = a.createGain();
    const t = a.currentTime;
    o.type = "triangle";
    o.frequency.setValueAtTime(500, t);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.12);
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + 0.22);
  } catch {
    /* audio is optional */
  }
}

type Cfg = { tool: InkTool; color: string; size: number; mode: FoldMode; mirror: boolean; paper: string; sound: boolean };
type Hooks = { guess: (s: string) => void; flap: (f: "v" | "h" | null) => void; replay: (s: string | null) => void };

// All drawing lives here, outside React, so strokes stay fast.
function createEngine(cv: HTMLCanvasElement, cfg: () => Cfg, hook: Hooks) {
  const x = cv.getContext("2d")!;
  let hist: HTMLCanvasElement[] = [];
  let rec: HTMLCanvasElement[] = [];
  let hue = 0;
  let busy = false;
  let down = false;
  let last: P | null = null;
  let blowStart: P | null = null;
  const timers: number[] = [];
  const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
  const noise = (d?: number, v?: number) => cfg().sound && rustle(d, v);

  const snap = (w: number, h: number) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")!.drawImage(cv, 0, 0, w, h);
    return c;
  };
  const save = () => {
    hist.push(snap(W, H));
    if (hist.length > 15) hist.shift();
  };
  const frame = () => {
    rec.push(snap(400, 249));
    if (rec.length > 90) rec.splice(1, 1);
  };
  const restore = (c: CanvasImageSource) => {
    x.clearRect(0, 0, W, H);
    x.drawImage(c, 0, 0, W, H);
  };

  const mirrors = (px: number, py: number, force = false): P[] => {
    const { mirror, mode } = cfg();
    const out: P[] = [[px, py]];
    if (!mirror && !force) return out;
    if (mode !== "h") out.push([W - px, py]);
    if (mode !== "v") out.push([px, H - py]);
    if (mode === "q") out.push([W - px, H - py]);
    return out;
  };
  const circle = (px: number, py: number, r: number, a = 1) => {
    x.globalAlpha = a;
    x.beginPath();
    x.arc(px, py, Math.max(0.5, r), 0, Math.PI * 2);
    x.fill();
    x.globalAlpha = 1;
  };
  const blob = (px: number, py: number, r: number, a = 1) => {
    for (let k = 0; k < 16; k++) {
      const t = Math.random() * 6.28, d = Math.random() * r;
      circle(px + Math.cos(t) * d, py + Math.sin(t) * d, r * (0.25 + Math.random() * 0.5), a);
    }
    for (let k = 0; k < 8; k++) {
      const t = Math.random() * 6.28, d = r * (1.1 + Math.random() * 1.3);
      circle(px + Math.cos(t) * d, py + Math.sin(t) * d, 2 + Math.random() * r * 0.12, a);
    }
  };
  const splat = (px: number, py: number, r: number) => {
    blob(px, py, r * 0.7);
    for (let k = 0; k < 22; k++) {
      const a = Math.random() * 6.28, d = r * (1 + Math.random() * 3);
      const ex = px + Math.cos(a) * d, ey = py + Math.sin(a) * d;
      x.lineWidth = 1 + Math.random() * 3;
      x.beginPath();
      x.moveTo(px + Math.cos(a) * r * 0.6, py + Math.sin(a) * r * 0.6);
      x.lineTo(ex, ey);
      x.stroke();
      circle(ex, ey, 2 + Math.random() * 6);
    }
  };
  const spray = (px: number, py: number, r: number) => {
    for (let k = 0; k < 40; k++) {
      const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * r * 2;
      circle(px + Math.cos(a) * d, py + Math.sin(a) * d, 1 + Math.random() * 1.6, 0.8);
    }
  };
  // Wet ink: a drop keeps spreading for a moment, like ink soaking into paper.
  const wetDrop = (px: number, py: number, r: number, c: string) => {
    let k = 0;
    const pts = mirrors(px, py);
    const step = () => {
      x.fillStyle = c;
      pts.forEach(([u, v]) => blob(u, v, r * (0.35 + (0.65 * k) / 10), k < 10 ? 0.35 : 1));
      if (++k <= 10) requestAnimationFrame(step);
      else frame();
    };
    step();
  };
  // Straw blow: ink branches out along the drag direction like blown-ink art.
  const blowFrom = (sx: number, sy: number, ang: number, len: number, c: string) => {
    type Seg = { a: P; b?: P; w: number; d: number };
    const segs: Seg[] = [];
    const br = (px: number, py: number, a: number, l: number, w: number, d: number) => {
      const n = Math.max(3, Math.round(l / 10));
      let cx = px, cy = py, ca = a;
      for (let i = 0; i < n; i++) {
        ca += (Math.random() - 0.5) * 0.35;
        const nx = cx + (Math.cos(ca) * l) / n, ny = cy + (Math.sin(ca) * l) / n;
        segs.push({ a: [cx, cy], b: [nx, ny], w: w * (1 - (i / n) * 0.7), d: d + i });
        cx = nx;
        cy = ny;
        if (d < 3 && Math.random() < 0.16 && l > 30) br(cx, cy, ca + (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.6), l * (0.35 + Math.random() * 0.3), w * 0.6, d + 1);
      }
      segs.push({ a: [cx, cy], w: w * 0.9, d: d + n });
    };
    br(sx, sy, ang, len, Math.max(3, cfg().size * 0.45), 0);
    segs.sort((p, q) => p.d - q.d);
    let i = 0;
    const step = () => {
      x.fillStyle = c;
      x.strokeStyle = c;
      x.lineCap = "round";
      for (let k = 0; k < 6 && i < segs.length; k++, i++) {
        const g = segs[i];
        if (!g.b) mirrors(g.a[0], g.a[1]).forEach(([u, v]) => circle(u, v, g.w));
        else {
          const A = mirrors(g.a[0], g.a[1]), B = mirrors(g.b[0], g.b[1]);
          A.forEach((p, j) => {
            x.lineWidth = g.w;
            x.beginPath();
            x.moveTo(p[0], p[1]);
            x.lineTo(B[j][0], B[j][1]);
            x.stroke();
          });
        }
      }
      if (i < segs.length) requestAnimationFrame(step);
      else frame();
    };
    step();
  };

  const seg = (a: P, b: P) => {
    const { tool, color, size } = cfg();
    const S = size * 2;
    let c = color;
    if (tool === "rainbow") {
      hue = (hue + 4) % 360;
      c = `hsl(${hue} 80% 55%)`;
    }
    x.fillStyle = c;
    x.strokeStyle = c;
    x.lineCap = x.lineJoin = "round";
    x.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (tool === "pen" || tool === "eraser") {
      const w = tool === "pen" ? S * 0.35 : S * 1.4;
      const A = mirrors(a[0], a[1]), B = mirrors(b[0], b[1]);
      A.forEach((p, i) => {
        x.lineWidth = w;
        x.beginPath();
        x.moveTo(p[0], p[1]);
        x.lineTo(B[i][0], B[i][1]);
        x.stroke();
      });
    } else if (tool === "brush" || tool === "rainbow") {
      const steps = Math.max(1, dist / 3);
      const rr = S * 0.5 * Math.max(0.45, 1 - dist / 120);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        mirrors(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t).forEach(([u, v]) => {
          circle(u, v, rr, tool === "rainbow" ? 0.5 : 0.18);
          if (tool === "brush") circle(u + (Math.random() - 0.5) * rr * 0.5, v + (Math.random() - 0.5) * rr * 0.5, rr * 0.6, 0.12);
        });
      }
    } else if (tool === "spray") mirrors(b[0], b[1]).forEach(([u, v]) => spray(u, v, S));
    x.globalCompositeOperation = "source-over";
  };

  const pos = (e: PointerEvent): P => {
    const r = cv.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  };
  const onDown = (e: PointerEvent) => {
    if (busy) return;
    cv.setPointerCapture(e.pointerId);
    e.preventDefault();
    save();
    const p = pos(e);
    const { tool, color, size } = cfg();
    if (tool === "drop") {
      wetDrop(p[0], p[1], size * 1.6, color);
      noise(0.08, 0.04);
      return;
    }
    if (tool === "splat") {
      x.fillStyle = color;
      x.strokeStyle = color;
      mirrors(p[0], p[1]).forEach(([u, v]) => splat(u, v, size * 1.4));
      noise(0.18, 0.07);
      frame();
      return;
    }
    if (tool === "blow") {
      blowStart = p;
      return;
    }
    down = true;
    last = p;
    seg(p, p);
  };
  const onMove = (e: PointerEvent) => {
    if (!down || !last) return;
    const p = pos(e);
    seg(last, p);
    last = p;
  };
  const onUp = (e: PointerEvent) => {
    if (blowStart) {
      const p = pos(e);
      const dx = p[0] - blowStart[0], dy = p[1] - blowStart[1];
      const L = Math.hypot(dx, dy);
      const ang = L < 8 ? -Math.PI / 2 : Math.atan2(dy, dx);
      for (let k = 0; k < 3; k++) blowFrom(blowStart[0], blowStart[1], ang + (k - 1) * 0.35, Math.max(90, Math.min(380, L * 1.1)) * (k === 1 ? 1 : 0.7), cfg().color);
      noise(0.5, 0.035);
      blowStart = null;
    }
    if (down) frame();
    down = false;
  };
  cv.addEventListener("pointerdown", onDown);
  cv.addEventListener("pointermove", onMove);
  cv.addEventListener("pointerup", onUp);
  cv.addEventListener("pointercancel", onUp);

  // Press the wet ink onto the other half (or quarters) of the paper.
  const press = () => {
    const { mode } = cfg();
    const t = document.createElement("canvas");
    t.width = W;
    t.height = H;
    const g = t.getContext("2d")!;
    const flip = (sx: number, sy: number) => {
      g.clearRect(0, 0, W, H);
      g.save();
      g.translate(sx < 0 ? W : 0, sy < 0 ? H : 0);
      g.scale(sx, sy);
      g.drawImage(cv, 0, 0);
      g.restore();
      x.globalAlpha = 0.85;
      x.filter = "blur(1px)";
      x.drawImage(t, 0, 0);
      x.filter = "none";
      x.globalAlpha = 1;
    };
    if (mode !== "h") flip(-1, 1);
    if (mode !== "v") flip(1, -1);
  };
  const fold = () => {
    if (busy) return;
    busy = true;
    save();
    hook.flap(cfg().mode === "h" ? "h" : "v");
    noise(0.35, 0.05);
    later(() => {
      press();
      noise(0.2, 0.04);
    }, 560);
    later(() => {
      hook.flap(null);
      busy = false;
      frame();
      hook.guess(`What do you see? I think… ${GUESSES[Math.floor(Math.random() * GUESSES.length)]}`);
    }, 1200);
  };

  const example = () => {
    x.save();
    x.scale(W / 1800, H / 1120);
    const pts: [number, number, number, number][] = [[760, 330, 70, 0], [700, 470, 58, 0], [810, 600, 52, 1], [640, 640, 40, 1], [780, 800, 46, 0], [700, 880, 26, 1], [600, 420, 28, 1]];
    pts.forEach(([px, py, r, c]) => {
      x.fillStyle = c ? "#1d70b8" : "#3b1f5a";
      blob(px, py, r);
    });
    x.fillStyle = "#ffb703";
    blob(820, 520, 22);
    x.strokeStyle = "#1d1a2e";
    x.lineWidth = 8;
    x.lineCap = "round";
    x.beginPath();
    x.moveTo(880, 250);
    x.quadraticCurveTo(760, 170, 700, 240);
    x.stroke();
    x.restore();
    frame();
    const t = document.createElement("canvas");
    t.width = W;
    t.height = H;
    const g = t.getContext("2d")!;
    g.translate(W, 0);
    g.scale(-1, 1);
    g.drawImage(cv, 0, 0);
    x.globalAlpha = 0.85;
    x.drawImage(t, 0, 0);
    x.globalAlpha = 1;
    frame();
  };

  return {
    isBusy: () => busy,
    fold,
    example,
    undo() {
      const h = hist.pop();
      if (h) {
        restore(h);
        frame();
      }
    },
    clear() {
      save();
      x.clearRect(0, 0, W, H);
      rec = [];
      frame();
    },
    random(palette: string[]) {
      if (busy) return;
      save();
      const { mode } = cfg();
      const pal = [palette[Math.floor(Math.random() * palette.length)], palette[Math.floor(Math.random() * palette.length)]];
      const mx = mode === "h" ? W * 0.9 : W / 2 - 30, my = mode === "v" ? H * 0.85 : H / 2 - 20;
      for (let i = 0; i < 7; i++) {
        x.fillStyle = pal[i % 2];
        x.strokeStyle = pal[i % 2];
        const px = W * 0.12 + Math.random() * (mx - W * 0.12), py = H * 0.12 + Math.random() * (my - H * 0.12);
        if (i % 3 === 2) splat(px, py, 14 + Math.random() * 20);
        else blob(px, py, 20 + Math.random() * 40);
      }
      fold();
    },
    replay() {
      if (busy || rec.length < 2) return;
      busy = true;
      const end = snap(W, H);
      let i = 0;
      const iv = window.setInterval(() => {
        if (i >= rec.length) {
          window.clearInterval(iv);
          restore(end);
          hook.replay(null);
          busy = false;
          return;
        }
        restore(rec[i]);
        hook.replay(`▶ replay ${i + 1}/${rec.length}`);
        i++;
      }, 140);
      timers.push(iv);
    },
    // Tilt the paper: wet ink runs down in drips.
    drip() {
      if (busy) return false;
      const { mode } = cfg();
      const d = x.getImageData(0, 0, W, H).data;
      const seeds: { x: number; y: number; c: string; t: number; len: number; w: number }[] = [];
      const xmax = mode === "h" ? W : W / 2;
      for (let t = 0; t < 6000 && seeds.length < 26; t++) {
        const px = Math.floor(Math.random() * xmax), py = Math.floor(Math.random() * (H - 40));
        const k = (py * W + px) * 4;
        if (d[k + 3] > 200 && d[((py + 6) * W + px) * 4 + 3] < 30) seeds.push({ x: px, y: py, c: `rgb(${d[k]},${d[k + 1]},${d[k + 2]})`, t: 0, len: 30 + Math.random() * 120, w: 3 + Math.random() * 4 });
      }
      if (!seeds.length) return false;
      save();
      busy = true;
      noise(0.6, 0.02);
      const pts = (s: (typeof seeds)[number], y: number): P[] => (mode === "h" ? [[s.x, y]] : [[s.x, y], [W - s.x, y]]);
      let f = 0;
      const run = () => {
        seeds.forEach((s) => {
          if (s.t >= s.len) return;
          x.fillStyle = s.c;
          const w = s.w * (1 - (s.t / s.len) * 0.5);
          pts(s, s.y + s.t).forEach(([u, v]) => circle(u, v, w / 2));
          s.t += 1.5;
        });
        if (++f < 110) requestAnimationFrame(run);
        else {
          seeds.forEach((s) => {
            x.fillStyle = s.c;
            pts(s, s.y + s.len).forEach(([u, v]) => circle(u, v, s.w * 0.8));
          });
          busy = false;
          frame();
        }
      };
      run();
      return true;
    },
    // Red signature seal in the corner.
    seal(initials: string) {
      save();
      const cx = W - 90, cy = H - 80, r = 46;
      x.save();
      x.translate(cx, cy);
      x.rotate(-0.12);
      x.globalAlpha = 0.9;
      x.strokeStyle = x.fillStyle = "#c62828";
      x.lineWidth = 5;
      x.beginPath();
      x.arc(0, 0, r, 0, Math.PI * 2);
      x.stroke();
      x.lineWidth = 2;
      x.beginPath();
      x.arc(0, 0, r - 9, 0, Math.PI * 2);
      x.stroke();
      x.font = "700 34px ui-rounded, system-ui, sans-serif";
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.fillText(initials, 0, -2);
      x.font = "700 9px system-ui, sans-serif";
      x.fillText(`${new Date().getFullYear()} · INK`, 0, 24);
      x.globalCompositeOperation = "destination-out";
      for (let i = 0; i < 70; i++) {
        x.beginPath();
        x.arc((Math.random() - 0.5) * r * 2, (Math.random() - 0.5) * r * 2, Math.random() * 2.2, 0, Math.PI * 2);
        x.fill();
      }
      x.restore();
      noise(0.12, 0.09);
      frame();
    },
    load(src: string) {
      save();
      const im = new Image();
      im.onload = () => {
        restore(im);
        frame();
      };
      im.src = src;
    },
    picture(w: number, h: number, paper: string, type = "image/png") {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d")!;
      g.fillStyle = paper;
      g.fillRect(0, 0, w, h);
      g.drawImage(cv, 0, 0, w, h);
      return c.toDataURL(type, 0.82);
    },
    // Bounding box of the ink, as fractions of the paper.
    inkBox(): [number, number, number, number] | null {
      const d = x.getImageData(0, 0, W, H).data;
      let x0 = W, y0 = H, x1 = 0, y1 = 0;
      for (let py = 0; py < H; py += 4)
        for (let px = 0; px < W; px += 4)
          if (d[(py * W + px) * 4 + 3] > 120) {
            x0 = Math.min(x0, px);
            x1 = Math.max(x1, px);
            y0 = Math.min(y0, py);
            y1 = Math.max(y1, py);
          }
      return x1 > x0 ? [x0 / W, y0 / H, x1 / W, y1 / H] : null;
    },
    destroy() {
      timers.forEach((t) => {
        window.clearTimeout(t);
        window.clearInterval(t);
      });
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onUp);
    },
  };
}

const today = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function InkBlotMaker({
  colors = DEFAULT_COLORS,
  papers = DEFAULT_PAPERS,
  defaultTool = "brush",
  defaultMode = "v",
  showExample = true,
  showGallery = true,
  storageKey = "ink-blot-gallery",
  signature = "INK",
  sound = true,
  onSave,
  className = "",
}: InkBlotMakerProps) {
  const [tool, setTool] = useState<InkTool>(defaultTool);
  const [color, setColor] = useState(colors[1] ?? colors[0] ?? "#3b1f5a");
  const [custom, setCustom] = useState(false);
  const [size, setSize] = useState(16);
  const [paper, setPaper] = useState(papers[0] ?? "#f6efe2");
  const [mode, setMode] = useState<FoldMode>(defaultMode);
  const [mirror, setMirror] = useState(false);
  const [guess, setGuess] = useState(showExample ? "Example: a butterfly 🦋. Clear it and paint your own." : "Paint on one side, then fold the paper.");
  const [flap, setFlap] = useState<"v" | "h" | null>(null);
  const [replayTag, setReplayTag] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [gallery, setGallery] = useState<Picture[]>([]);
  const [eyes, setEyes] = useState<{ x: number; y: number; s: number } | null>(null);
  const [talk, setTalk] = useState("");
  const [blink, setBlink] = useState(false);
  const [saved, setSaved] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const engine = useRef<ReturnType<typeof createEngine> | null>(null);
  const cfg = useRef<Cfg>({ tool, color, size, mode, mirror, paper, sound });
  cfg.current = { tool, color, size, mode, mirror, paper, sound };

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const e = createEngine(cv, () => cfg.current, { guess: setGuess, flap: setFlap, replay: setReplayTag });
    engine.current = e;
    if (showExample) e.example();
    let list: Picture[] = [];
    if (storageKey) {
      try {
        list = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as Picture[];
      } catch {
        list = [];
      }
    }
    if (!list.length && showExample) list = [{ name: "Night Butterfly (example)", img: e.picture(450, 280, cfg.current.paper, "image/jpeg"), paper: cfg.current.paper, date: today() }];
    setGallery(list);
    return () => e.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const store = (list: Picture[]) => {
    setGallery(list);
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch {
      /* storage is optional */
    }
  };

  // Living blot: eyes follow the pointer, blink, and the blot talks.
  useEffect(() => {
    if (!eyes) return;
    const say = () => {
      setTalk(LINES[Math.floor(Math.random() * LINES.length)]);
      if (cfg.current.sound) chirp();
    };
    say();
    const t1 = window.setInterval(say, 4200);
    const t2 = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 140);
    }, 2600);
    const look = (ev: globalThis.PointerEvent) => {
      sheetRef.current?.querySelectorAll<HTMLElement>(".ibm-eye").forEach((el) => {
        const r = el.getBoundingClientRect();
        const a = Math.atan2(ev.clientY - r.top - r.height / 2, ev.clientX - r.left - r.width / 2);
        const d = Math.min(r.width * 0.26, Math.hypot(ev.clientX - r.left, ev.clientY - r.top) / 8);
        const pupil = el.querySelector<HTMLElement>("i");
        if (pupil) pupil.style.transform = `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px)`;
      });
    };
    window.addEventListener("pointermove", look);
    return () => {
      window.clearInterval(t1);
      window.clearInterval(t2);
      window.removeEventListener("pointermove", look);
    };
  }, [eyes]);

  const sleep = () => setEyes(null);
  const wake = () => {
    const b = engine.current?.inkBox();
    const w = sheetRef.current?.clientWidth ?? 600;
    if (!b) {
      setGuess("Paint something first, then bring it to life.");
      return;
    }
    const s = Math.max(22, Math.min(70, (b[2] - b[0]) * w * 0.14));
    setEyes({ x: ((b[0] + b[2]) / 2) * 100, y: (b[1] + (b[3] - b[1]) * 0.28) * 100, s });
  };

  const act = (fn: () => void) => () => {
    sleep();
    fn();
  };
  const fold = act(() => engine.current?.fold());
  const initials = () =>
    (title.trim() || signature)
      .split(/\s+/)
      .map((w) => w[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "IN";

  const saveToGallery = () => {
    const e = engine.current;
    if (!e) return;
    const name = title.trim() || `Untitled #${gallery.length + 1}`;
    store([{ name, img: e.picture(450, 280, paper, "image/jpeg"), paper, date: today() }, ...gallery].slice(0, 12));
    onSave?.({ name, dataUrl: e.picture(W, H, paper) });
    setTitle("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1300);
  };
  const download = () => {
    const e = engine.current;
    if (!e) return;
    const a = document.createElement("a");
    a.href = e.picture(W, H, paper);
    a.download = `${(title.trim() || "ink-blot").replace(/[^\w-]+/g, "-").toLowerCase()}.png`;
    a.click();
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (t instanceof HTMLInputElement && t.type === "text") return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === "z") {
      e.preventDefault();
      engine.current?.undo();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const found = TOOLS.find((q) => q.key === k);
    if (found) setTool(found.id);
    else if (k === "f") fold();
    else if (k === "[" || k === "]") setSize((s) => Math.max(2, Math.min(60, s + (k === "]" ? 4 : -4))));
    else return;
    e.preventDefault();
  };

  const dot = Math.max(3, Math.min(30, size * 0.6));

  return (
    <div className={`ibm ${className}`} onKeyDown={onKey}>
      <style>{CSS}</style>
      <div className="ibm-studio">
        <div className="ibm-tools" role="radiogroup" aria-label="Tools">
          {TOOLS.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={tool === t.id} className={tool === t.id ? "on" : ""} onClick={() => setTool(t.id)} title={`${t.name} (${t.key.toUpperCase()})`}>
              <span aria-hidden>{t.icon}</span>
              {t.name}
            </button>
          ))}
        </div>

        <div className="ibm-main">
          <div className="ibm-bar">
            <div className="ibm-group" role="radiogroup" aria-label="Ink colour">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={!custom && color === c}
                  aria-label={`Colour ${c}`}
                  className={`ibm-sw ${!custom && color === c ? "on" : ""}`}
                  style={{ background: c }}
                  onClick={() => {
                    setColor(c);
                    setCustom(false);
                    if (tool === "eraser" || tool === "rainbow") setTool("brush");
                  }}
                />
              ))}
              <label className={`ibm-custom ${custom ? "on" : ""}`} title="Any colour">
                <input
                  type="color"
                  value={color.startsWith("#") && color.length === 7 ? color : "#3b1f5a"}
                  aria-label="Pick any colour"
                  onChange={(e) => {
                    setColor(e.target.value);
                    setCustom(true);
                    if (tool === "eraser" || tool === "rainbow") setTool("brush");
                  }}
                />
              </label>
            </div>
            <label className="ibm-group">
              <span className="ibm-label">Size</span>
              <input type="range" min={2} max={60} value={size} onChange={(e) => setSize(+e.target.value)} />
              <i className="ibm-dot" style={{ width: dot, height: dot, background: tool === "rainbow" ? "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)" : color }} />
            </label>
            <div className="ibm-group" role="radiogroup" aria-label="Paper">
              <span className="ibm-label">Paper</span>
              {papers.map((p) => (
                <button key={p} type="button" role="radio" aria-checked={paper === p} aria-label={`${PAPER_NAMES[p] ?? p} paper`} className={`ibm-paper ${paper === p ? "on" : ""}`} style={{ background: p }} onClick={() => setPaper(p)} />
              ))}
            </div>
            <div className="ibm-group" role="radiogroup" aria-label="Fold">
              <span className="ibm-label">Fold</span>
              <div className="ibm-seg">
                {MODES.map((m) => (
                  <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} aria-label={m.label} title={m.label} className={mode === m.id ? "on" : ""} onClick={() => setMode(m.id)}>
                    {m.icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div ref={sheetRef} className={`ibm-sheet ${eyes ? "is-alive" : ""}`} style={{ background: paper }}>
            <canvas ref={canvasRef} width={W} height={H} tabIndex={0} aria-label="Paper. Paint with the pointer, then fold." />
            {mode !== "h" && <div className="ibm-crease v" />}
            {mode !== "v" && <div className="ibm-crease h" />}
            {flap && <div className={`ibm-flap ${flap}`} style={{ background: paper }} />}
            {replayTag && <div className="ibm-tag">{replayTag}</div>}
            {eyes && (
              <div className="ibm-life" aria-hidden>
                {[-1, 1].map((sd) => (
                  <div key={sd} className={`ibm-eye ${blink ? "blink" : ""}`} style={{ left: `calc(${eyes.x}% + ${sd * eyes.s * 0.75}px)`, top: `${eyes.y}%`, ["--s" as string]: `${eyes.s}px`, ["--lid" as string]: color }}>
                    <b />
                    <i />
                  </div>
                ))}
                {talk && (
                  <div key={talk} className="ibm-talk" style={{ left: `${eyes.x}%`, top: `calc(${eyes.y}% - ${eyes.s}px)` }}>
                    {talk}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="ibm-actions">
            <button type="button" className="ibm-big" onClick={fold}>📄 Fold</button>
            <label className="ibm-toggle">
              <input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} /> Live mirror
            </label>
            <button type="button" onClick={act(() => engine.current?.undo())}>↶ Undo</button>
            <button type="button" onClick={act(() => { engine.current?.clear(); setGuess("Paint on one side, then fold the paper."); })}>🗑 New paper</button>
            <button type="button" onClick={act(() => engine.current?.random(colors.slice(0, -1)))}>🎲 Random blot</button>
            <button type="button" onClick={act(() => engine.current?.replay())}>▶ Replay</button>
            <button type="button" onClick={act(() => setGuess(engine.current?.drip() ? "The ink ran down… even spookier now 😄" : "Drop some ink first, then tilt the paper."))}>↘ Tilt paper</button>
            <button type="button" onClick={() => (eyes ? sleep() : wake())}>{eyes ? "😴 Put to sleep" : "👀 Bring to life"}</button>
            <button type="button" onClick={act(() => engine.current?.seal(initials()))}>🔴 Sign</button>
          </div>
          <p className="ibm-guess" aria-live="polite">{guess}</p>
          <div className="ibm-save">
            <input type="text" value={title} maxLength={28} placeholder="Name your picture" aria-label="Picture name" onChange={(e) => setTitle(e.target.value)} />
            {showGallery && <button type="button" onClick={saveToGallery}>{saved ? "✓ Saved" : "🖼 Add to gallery"}</button>}
            <button type="button" onClick={download}>⬇ PNG</button>
          </div>
          <p className="ibm-keys">
            Keys: <kbd>P</kbd> pen <kbd>B</kbd> brush <kbd>R</kbd> rainbow <kbd>D</kbd> drop <kbd>W</kbd> blow <kbd>S</kbd> spray <kbd>X</kbd> splatter <kbd>E</kbd> eraser <kbd>F</kbd> fold <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo <kbd>[</kbd> <kbd>]</kbd> size
          </p>
        </div>
      </div>

      {showGallery && (
        <section className="ibm-gallery" aria-label="Gallery">
          <h3>My ink gallery</h3>
          {gallery.length ? (
            <div className="ibm-wall">
              {gallery.map((g, i) => (
                <figure key={`${g.name}-${i}`} className="ibm-frame">
                  <button type="button" className="ibm-open" title="Open on the paper" onClick={act(() => { engine.current?.load(g.img); setPaper(g.paper); setGuess(`"${g.name}" is open. Keep painting.`); })}>
                    <span className="ibm-mat"><img src={g.img} alt={g.name} /></span>
                  </button>
                  <figcaption>
                    <b>{g.name}</b>
                    {g.date} · ink on paper
                  </figcaption>
                  <button type="button" className="ibm-del" aria-label={`Remove ${g.name}`} onClick={() => store(gallery.filter((_, j) => j !== i))}>✕</button>
                </figure>
              ))}
            </div>
          ) : (
            <p className="ibm-empty">Nothing here yet. Name your picture and press Add to gallery.</p>
          )}
        </section>
      )}
    </div>
  );
}

const CSS = `
.ibm{--ink:#ece7f6;--mute:#a69dc0;--panel:#18141f;--line:#2f2742;--btn:#2a2238;--btnb:#3d3256;--acc:#ffb86b;--mint:#7fd6c2;
  width:min(820px,90vw);color:var(--ink);font-family:inherit;display:flex;flex-direction:column;gap:16px;text-align:left}
.ibm button{font:inherit;font-weight:700;font-size:13px;background:var(--btn);color:var(--ink);border:1px solid var(--btnb);border-radius:999px;padding:7px 13px;cursor:pointer;line-height:1.2}
.ibm button:hover{border-color:var(--acc)}
.ibm button:focus-visible,.ibm input:focus-visible,.ibm canvas:focus-visible{outline:2px solid var(--mint);outline-offset:2px}
.ibm-studio{background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:14px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;box-shadow:0 20px 50px #0007}
.ibm-tools{display:flex;flex-direction:column;gap:6px}
.ibm-tools button{display:flex;align-items:center;gap:8px;border-radius:12px;padding:8px 12px;min-width:126px;text-align:left}
.ibm-tools button span{width:20px;text-align:center;font-size:16px}
.ibm-tools button.on{background:var(--acc);color:#1a1020;border-color:var(--acc)}
.ibm-main{display:flex;flex-direction:column;gap:12px;min-width:0}
.ibm-bar{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center}
.ibm-group{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.ibm-label{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}
.ibm .ibm-sw{width:26px;height:26px;padding:0;border-radius:50%;border:3px solid transparent;box-shadow:0 0 0 1px #fff3}
.ibm .ibm-sw.on{border-color:#fff}
.ibm-custom{position:relative;width:26px;height:26px;border-radius:50%;overflow:hidden;background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);box-shadow:0 0 0 1px #fff3;cursor:pointer}
.ibm-custom.on{box-shadow:0 0 0 3px #fff}
.ibm-custom input{position:absolute;inset:-8px;width:44px;height:44px;opacity:0;cursor:pointer}
.ibm input[type=range]{accent-color:var(--acc);width:110px}
.ibm-dot{display:block;border-radius:50%;flex:none}
.ibm .ibm-paper{width:24px;height:24px;padding:0;border-radius:6px;border:2px solid #ffffff40}
.ibm .ibm-paper.on{border-color:var(--acc)}
.ibm-seg{display:flex;border:1px solid var(--btnb);border-radius:999px;overflow:hidden}
.ibm .ibm-seg button{border:0;border-radius:0;padding:5px 11px}
.ibm .ibm-seg button.on{background:var(--mint);color:#0d2a26}
.ibm-sheet{position:relative;width:100%;aspect-ratio:1200/746;border-radius:6px;box-shadow:0 14px 30px #0009;perspective:1400px;transition:background .3s}
.ibm-sheet canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:crosshair;border-radius:6px;display:block}
.ibm-crease{position:absolute;pointer-events:none}
.ibm-crease.v{left:50%;top:0;bottom:0;border-left:1px dashed #8884}
.ibm-crease.h{top:50%;left:0;right:0;border-top:1px dashed #8884}
.ibm-flap{position:absolute;pointer-events:none;box-shadow:-3px 0 8px #0003}
.ibm-flap.v{right:0;top:0;width:50%;height:100%;transform-origin:0 50%;border-radius:0 6px 6px 0;animation:ibm-fold 1.2s ease-in-out forwards}
.ibm-flap.h{left:0;bottom:0;width:100%;height:50%;transform-origin:50% 0;border-radius:0 0 6px 6px;animation:ibm-foldh 1.2s ease-in-out forwards}
@keyframes ibm-fold{0%{transform:rotateY(0)}45%,55%{transform:rotateY(-180deg)}100%{transform:rotateY(0)}}
@keyframes ibm-foldh{0%{transform:rotateX(0)}45%,55%{transform:rotateX(180deg)}100%{transform:rotateX(0)}}
.ibm-tag{position:absolute;top:10px;left:10px;background:#000a;color:#fff;font:600 12px ui-monospace,monospace;padding:4px 10px;border-radius:999px;pointer-events:none}
.ibm-life{position:absolute;inset:0;pointer-events:none}
.ibm-eye{position:absolute;width:var(--s);height:var(--s);margin:calc(var(--s) / -2) 0 0 calc(var(--s) / -2);background:#fff;border-radius:50%;box-shadow:0 2px 0 #0004,inset 0 0 0 2px #1d1a2e;overflow:hidden;animation:ibm-pop .4s cubic-bezier(.3,1.6,.5,1)}
.ibm-eye i{position:absolute;left:50%;top:50%;width:46%;height:46%;margin:-23% 0 0 -23%;background:#111;border-radius:50%;transition:transform .08s}
.ibm-eye i::after{content:"";position:absolute;left:20%;top:18%;width:30%;height:30%;background:#fff;border-radius:50%}
.ibm-eye b{position:absolute;left:0;right:0;top:0;height:0;background:var(--lid);transition:height .08s;z-index:1}
.ibm-eye.blink b{height:100%}
.ibm-talk{position:absolute;background:#fff;color:#1d1a2e;font-weight:700;font-size:14px;padding:6px 12px;border-radius:14px;box-shadow:0 4px 10px #0004;white-space:nowrap;transform:translate(-50%,-100%);animation:ibm-pop .4s}
.ibm-talk::after{content:"";position:absolute;left:50%;bottom:-8px;margin-left:-8px;border:8px solid transparent;border-top-color:#fff;border-bottom:0}
.ibm-sheet.is-alive canvas{animation:ibm-breathe 2.4s ease-in-out infinite}
@keyframes ibm-breathe{50%{transform:scale(1.012,.99)}}
@keyframes ibm-pop{from{transform:scale(0)}}
.ibm-actions,.ibm-save{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.ibm .ibm-big{background:var(--acc);color:#1a1020;border-color:var(--acc);font-size:14px;padding:8px 18px}
.ibm-toggle{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:var(--mute);cursor:pointer}
.ibm-toggle input{accent-color:var(--mint);width:17px;height:17px}
.ibm-guess{margin:0;font-weight:700;color:var(--acc);min-height:22px}
.ibm-save input{font:inherit;font-size:14px;background:var(--btn);color:var(--ink);border:1px solid var(--btnb);border-radius:999px;padding:7px 14px;min-width:0;width:200px}
.ibm-keys{margin:0;font-size:12px;color:var(--mute);line-height:2}
.ibm-keys kbd{font:600 11px ui-monospace,monospace;background:var(--btn);border:1px solid var(--btnb);border-radius:4px;padding:1px 5px;color:var(--ink);margin-left:6px}
.ibm-gallery{background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:14px 16px}
.ibm-gallery h3{margin:0 0 12px;font-size:18px}
.ibm-wall{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:18px}
.ibm-frame{position:relative;margin:0;background:#3a2a1e;padding:10px;border-radius:4px;box-shadow:0 8px 16px #0008,inset 0 0 0 2px #5a4230;transition:transform .2s}
.ibm-frame:hover{transform:translateY(-3px) rotate(-.5deg)}
.ibm .ibm-open{display:block;width:100%;padding:0;border:0;border-radius:0;background:none}
.ibm-mat{display:block;padding:7px;background:#efe8da}
.ibm-mat img{display:block;width:100%;aspect-ratio:1200/746}
.ibm-frame figcaption{background:#d9cfb8;color:#3a2a1e;font-size:11px;padding:5px 8px;margin-top:8px;border-radius:2px}
.ibm-frame figcaption b{display:block;font-size:14px}
.ibm .ibm-del{position:absolute;top:-8px;right:-8px;width:24px;height:24px;padding:0;font-size:11px;border-radius:50%}
.ibm-empty{margin:0;color:var(--mute);font-size:14px}
@media (max-width:700px){
  .ibm-studio{grid-template-columns:minmax(0,1fr);padding:12px}
  .ibm-tools{flex-direction:row;flex-wrap:wrap}
  .ibm-tools button{min-width:0;flex:1 1 calc(50% - 6px)}
  .ibm-save input{width:100%}
}
@media (prefers-reduced-motion:reduce){.ibm-flap{animation-duration:.01s}.ibm-sheet.is-alive canvas{animation:none}}
`;
