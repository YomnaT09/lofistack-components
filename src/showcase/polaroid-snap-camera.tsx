"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { runLook, type PhotoLook } from "./polaroid-looks";

export type PolaroidStyle = "original" | PhotoLook;

export interface PolaroidSnapCameraProps {
  /** Look the photo prints in. The user can switch it after printing. */
  defaultStyle?: PolaroidStyle;
  /** Text written under the photo. The user can edit it. */
  defaultCaption?: string;
  /** How long the print takes to develop, in ms. Shaking the photo speeds it up. */
  developMs?: number;
  /** Print the built-in sample photo as soon as the camera appears. */
  autoSample?: boolean;
  /** Play a small shutter click (made with Web Audio). */
  sound?: boolean;
  /** Called once a print has fully developed, with its style. */
  onPrint?: (style: PolaroidStyle) => void;
  className?: string;
}

type Phase = "idle" | "printing" | "developing" | "done";

const STYLES: { id: PolaroidStyle; tag: string; name: string }[] = [
  { id: "glow", tag: "1", name: "Dreamy Glow" },
  { id: "halftone", tag: "2", name: "Pop Dots" },
  { id: "bw", tag: "3", name: "B&W Film" },
  { id: "original", tag: "○", name: "Original" },
];

// The photo is processed at this size (about 2.6x the size it is shown at), cropped to fill.
const PW = 576;
const PH = 480;
const HAND = `"Segoe Print", "Bradley Hand", "Comic Sans MS", "Chalkboard SE", cursive`;

// A little drawn lofi desk, used for "Try a sample". Drawn here so the repo ships no third-party photos.
const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 250"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b7fc4"/><stop offset="1" stop-color="#f0b48a"/></linearGradient><radialGradient id="l"><stop offset="0" stop-color="#ffe7a8" stop-opacity=".9"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></radialGradient></defs><rect width="300" height="250" fill="#6b4c3b"/><rect x="30" y="20" width="160" height="130" fill="url(#s)"/><path d="M30 150 L30 110 L60 95 L90 115 L120 90 L160 112 L190 100 L190 150Z" fill="#3e5a4a"/><circle cx="150" cy="55" r="14" fill="#fff3d0"/><rect x="30" y="20" width="160" height="130" fill="none" stroke="#e9dcc4" stroke-width="8"/><line x1="110" y1="20" x2="110" y2="150" stroke="#e9dcc4" stroke-width="6"/><rect x="0" y="180" width="300" height="70" fill="#a57452"/><circle cx="240" cy="110" r="70" fill="url(#l)"/><path d="M225 70 L255 70 L265 100 L215 100Z" fill="#e8a33d"/><rect x="238" y="100" width="4" height="80" fill="#333"/><ellipse cx="240" cy="182" rx="22" ry="5" fill="#333"/><rect x="60" y="160" width="40" height="34" rx="4" fill="#f4efe6"/><path d="M100 168 q14 2 0 18" fill="none" stroke="#f4efe6" stroke-width="5"/><rect x="130" y="170" width="70" height="40" rx="3" fill="#2c2c3a" transform="rotate(-4 165 190)"/><rect x="134" y="173" width="62" height="30" fill="#5fd3c2" opacity=".6" transform="rotate(-4 165 190)"/><path d="M20 196 q10 -26 30 -16 q8 -20 24 -6 q4 16 -10 26Z" fill="#4f8a5b"/></svg>`;
const SAMPLE_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SAMPLE_SVG)}`;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image"));
    img.src = src;
  });
}

/** Draws the image cropped to fill PW x PH and returns its pixels. */
function cropToFill(img: HTMLImageElement): ImageData {
  const c = document.createElement("canvas");
  c.width = PW;
  c.height = PH;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const iw = img.naturalWidth || PW, ih = img.naturalHeight || PH;
  const s = Math.max(PW / iw, PH / ih);
  ctx.drawImage(img, (PW - iw * s) / 2, (PH - ih * s) / 2, iw * s, ih * s);
  return ctx.getImageData(0, 0, PW, PH);
}

function toUrl(data: ImageData) {
  const c = document.createElement("canvas");
  c.width = data.width;
  c.height = data.height;
  c.getContext("2d")!.putImageData(data, 0, 0);
  return c.toDataURL("image/png");
}

function shutterClick() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ac = new AC();
    const len = Math.floor(ac.sampleRate * 0.09);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3) * (i < len * 0.35 || i > len * 0.5 ? 1 : 0.2);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 2400;
    const g = ac.createGain();
    g.gain.value = 0.5;
    src.connect(f).connect(g).connect(ac.destination);
    src.start();
    src.onended = () => ac.close();
  } catch {
    /* sound is optional */
  }
}

export default function PolaroidSnapCamera({
  defaultStyle = "glow",
  defaultCaption = "",
  developMs = 4200,
  autoSample = false,
  sound = true,
  onPrint,
  className = "",
}: PolaroidSnapCameraProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [style, setStyle] = useState<PolaroidStyle>(defaultStyle);
  const [busyStyle, setBusyStyle] = useState<PolaroidStyle | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [caption, setCaption] = useState(defaultCaption);
  const [flash, setFlash] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const source = useRef<ImageData | null>(null);
  const cache = useRef<Partial<Record<PolaroidStyle, string>>>({});
  const job = useRef(0);
  const printRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dev = useRef(0);
  const raf = useRef(0);
  const reduced = useRef(false);
  const styleRef = useRef(style);
  styleRef.current = style;
  const onPrintRef = useRef(onPrint);
  onPrintRef.current = onPrint;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = mq.matches;
    const on = () => (reduced.current = mq.matches);
    mq.addEventListener("change", on);
    return () => {
      mq.removeEventListener("change", on);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  const setDev = (v: number) => {
    dev.current = v;
    printRef.current?.style.setProperty("--dev", v.toFixed(3));
  };

  const render = useCallback(async (s: PolaroidStyle) => {
    const hit = cache.current[s];
    if (hit) return hit;
    const src = source.current!;
    const url = s === "original" ? toUrl(src) : toUrl(await runLook(src, s));
    cache.current[s] = url;
    return url;
  }, []);

  const develop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    if (reduced.current) {
      setDev(1);
      setPhase("done");
      setStatus("Your print is ready.");
      onPrintRef.current?.(styleRef.current);
      return;
    }
    setPhase("developing");
    setStatus("Developing. Shake the photo to speed it up.");
    let last = performance.now();
    const step = (t: number) => {
      const next = Math.min(1, dev.current + (t - last) / developMs);
      last = t;
      setDev(next);
      if (next < 1) raf.current = requestAnimationFrame(step);
      else {
        setPhase("done");
        setStatus("Your print is ready.");
        onPrintRef.current?.(styleRef.current);
      }
    };
    raf.current = requestAnimationFrame(step);
  }, [developMs]);

  const print = useCallback(
    async (url: string, revoke?: boolean) => {
      const id = ++job.current;
      setError("");
      cancelAnimationFrame(raf.current);
      try {
        const img = await loadImage(url);
        if (revoke) URL.revokeObjectURL(url);
        source.current = cropToFill(img);
      } catch {
        setError("That file could not be opened. Try a JPG or PNG photo.");
        return;
      }
      cache.current = {};
      setPhoto(null);
      setDev(0);
      setPhase("printing");
      setStatus("Printing your photo.");
      setFlash((f) => f + 1);
      if (sound) shutterClick();
      // Let the print slide out while the filter works, then start developing when both are done.
      const eject = new Promise((r) => setTimeout(r, reduced.current ? 0 : 1300));
      const result = await render(styleRef.current);
      await eject;
      if (id !== job.current) return;
      setPhoto(result);
      develop();
    },
    [develop, render, sound],
  );

  const pickFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    print(URL.createObjectURL(file), true);
  };

  const changeStyle = async (s: PolaroidStyle) => {
    setStyle(s);
    if (!source.current || phase === "printing") return;
    const id = job.current;
    setBusyStyle(s);
    const url = await render(s);
    if (id !== job.current) return;
    setBusyStyle(null);
    setPhoto(url);
  };

  useEffect(() => {
    if (autoSample) print(SAMPLE_URL);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSample]);

  // Paste a photo with Ctrl/Cmd+V while the camera is on screen.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith("image/"));
      if (f) pickFile(f);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  const shake = (e: React.PointerEvent) => {
    if (phase !== "developing") return;
    const boost = Math.min(0.02, (Math.abs(e.movementX) + Math.abs(e.movementY)) / 4000);
    if (boost > 0) setDev(Math.min(0.999, dev.current + boost));
  };

  const download = async () => {
    if (!photo) return;
    const img = await loadImage(photo);
    const k = 1.5, w = PW, h = PH, pad = 30 * k, bottom = 96 * k;
    const c = document.createElement("canvas");
    c.width = w + pad * 2;
    c.height = h + pad + bottom;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fbf8f1";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, pad, pad, w, h);
    ctx.strokeStyle = "rgba(0,0,0,.08)";
    ctx.strokeRect(pad + 0.5, pad + 0.5, w - 1, h - 1);
    if (caption.trim()) {
      ctx.fillStyle = "#3b3346";
      ctx.font = `${30 * k}px ${HAND}`;
      ctx.textBaseline = "middle";
      ctx.fillText(caption.trim(), pad + 8, h + pad + bottom / 2, w - 16);
    }
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `polaroid-${style}.png`;
    a.click();
  };

  const reset = () => {
    job.current++;
    cancelAnimationFrame(raf.current);
    source.current = null;
    cache.current = {};
    setPhoto(null);
    setDev(0);
    setPhase("idle");
    setStatus("");
  };

  const printed = phase !== "idle";
  const ready = phase === "done" || phase === "developing";

  return (
    <div className={`ppc ${className}`}>
      <style>{CSS}</style>
      <div className="ppc-wrap">
        <div className="ppc-stage">
          <div className="ppc-cam" aria-hidden>
            <div className="ppc-rainbow" />
            <div className="ppc-viewfinder" />
            <div key={flash} className={`ppc-flash${flash ? " is-fired" : ""}`} />
            <div className="ppc-lens"><div className="ppc-glint" /></div>
            <div className="ppc-brand">lofi·snap</div>
            <div className="ppc-slot" />
          </div>
          <button
            type="button"
            className="ppc-shutter"
            aria-label={printed ? "Take another photo" : "Choose a photo to print"}
            onClick={() => fileRef.current?.click()}
          />
          <div className="ppc-tray">
            {printed ? (
              <div
                key={flash}
                ref={printRef}
                className={`ppc-print${phase === "printing" ? " is-ejecting" : ""}`}
                onPointerMove={shake}
                style={{ ["--dev" as string]: dev.current }}
              >
                <div className="ppc-photo">
                  {photo && <img src={photo} alt={`Your photo in the ${STYLES.find((s) => s.id === style)?.name} look`} draggable={false} />}
                  {busyStyle && <div className="ppc-busy">redrawing…</div>}
                </div>
                <div className="ppc-cap">{caption || " "}</div>
                {phase === "developing" && <div className="ppc-hint">↔ shake me</div>}
              </div>
            ) : (
              <div className="ppc-empty">
                <span>📷</span>
                Press the red button or drop a photo here
              </div>
            )}
          </div>
        </div>

        <div className="ppc-panel">
          <label
            className={`ppc-drop${dragging ? " is-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
          >
            <input ref={fileRef} type="file" accept="image/*" className="ppc-sr" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
            <span className="ppc-btn ppc-btn-main">{printed ? "Upload another photo" : "Upload a photo"}</span>
            <small>or drag & drop, or paste</small>
          </label>
          <button type="button" className="ppc-link" onClick={() => print(SAMPLE_URL)}>Try a sample photo</button>

          <div className="ppc-group" role="radiogroup" aria-label="Photo look">
            <div className="ppc-label">Look</div>
            <div className="ppc-styles">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={style === s.id}
                  className={`ppc-style${style === s.id ? " is-on" : ""}`}
                  onClick={() => changeStyle(s.id)}
                >
                  <b>{s.tag}</b>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <label className="ppc-group">
            <span className="ppc-label">Caption</span>
            <input className="ppc-input" value={caption} maxLength={28} placeholder="write something cute…" onChange={(e) => setCaption(e.target.value)} />
          </label>

          <div className="ppc-actions">
            <button type="button" className="ppc-btn" disabled={!ready || !photo} onClick={download}>⬇ Download PNG</button>
            <button type="button" className="ppc-btn ppc-btn-ghost" disabled={!printed} onClick={reset}>Clear</button>
          </div>
          {error && <p className="ppc-error" role="alert">{error}</p>}
          <p className="ppc-note">Your photo stays in your browser. Nothing is uploaded.</p>
          <p className="ppc-sr" aria-live="polite">{status}</p>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.ppc{--ink:#2b2236;--paper:#fbf8f1;--accent:#ff7a59;--panel:#1b1626;--line:#352c48;--text:#efe9fb;--muted:#a79fc0;
  font-family:var(--font-lexend),system-ui,sans-serif;color:var(--text);container-type:inline-size;width:min(760px,92vw);margin:0 auto}
.ppc *{box-sizing:border-box}
.ppc-wrap{display:grid;grid-template-columns:minmax(0,320px) minmax(0,1fr);gap:28px;align-items:start;background:radial-gradient(120% 90% at 20% 0%,#2a2140,#14101d);border:1px solid var(--line);border-radius:24px;padding:28px}
@container (max-width:620px){.ppc-wrap{grid-template-columns:1fr;padding:20px 16px;gap:22px}.ppc-stage{margin:0 auto}}
.ppc-stage{position:relative;width:300px;max-width:100%}
.ppc-cam{position:relative;z-index:2;height:176px;border-radius:26px;background:linear-gradient(#f6efe2,#e7dcc8);box-shadow:0 8px 0 #c6b79d,0 18px 30px #0008}
.ppc-rainbow{position:absolute;left:22px;top:22px;width:70px;height:10px;border-radius:3px;background:linear-gradient(90deg,#e0533f 0 25%,#f2a33a 0 50%,#5bbf6a 0 75%,#3d8fe0 0)}
.ppc-viewfinder{position:absolute;left:22px;top:44px;width:42px;height:28px;border-radius:6px;background:#2d2733;box-shadow:inset 0 0 0 4px #d8cdb8}
.ppc-flash{position:absolute;right:24px;top:22px;width:46px;height:30px;border-radius:6px;background:linear-gradient(#fffdf0,#efe6c8);box-shadow:inset 0 0 0 3px #d8cdb8}
.ppc-flash.is-fired{animation:ppc-flash .7s ease-out}
@keyframes ppc-flash{0%{box-shadow:0 0 0 0 #fff,0 0 80px 60px #fffbe6;background:#fff}100%{box-shadow:inset 0 0 0 3px #d8cdb8}}
.ppc-lens{position:absolute;left:50%;top:50%;width:96px;height:96px;transform:translate(-50%,-52%);border-radius:50%;background:radial-gradient(circle,#4a6d92 0 16%,#0d0d12 26%,#2b2b33 46%,#16161b 58%,#3a3a44 64%,#1b1b22 70%);box-shadow:0 0 0 6px #d9cfbd,0 4px 10px #0006}
.ppc-glint{position:absolute;left:30%;top:24%;width:16px;height:10px;border-radius:50%;background:#fff9;transform:rotate(-30deg)}
.ppc-brand{position:absolute;left:22px;bottom:22px;font-size:11px;letter-spacing:2px;color:#8f826b;font-weight:600}
.ppc-slot{position:absolute;left:34px;right:34px;bottom:12px;height:7px;border-radius:4px;background:#2a2320}
.ppc-shutter{position:absolute;z-index:3;right:30px;top:-10px;width:40px;height:16px;border:0;border-radius:6px 6px 2px 2px;background:var(--accent);box-shadow:0 3px 0 #b8432a;cursor:pointer;transition:transform .1s}
.ppc-shutter:hover{filter:brightness(1.1)}.ppc-shutter:active{transform:translateY(3px);box-shadow:0 0 0 #b8432a}
.ppc-shutter:focus-visible{outline:3px solid #ffd27a;outline-offset:3px}
.ppc-tray{position:relative;z-index:1;margin-top:-14px;padding-top:14px;height:278px;overflow:hidden;display:flex;justify-content:center}
.ppc-print{--dev:0;width:248px;height:fit-content;background:var(--paper);padding:14px 14px 0;border-radius:3px;box-shadow:0 10px 22px #000a;transform:rotate(-2deg);transform-origin:top center;touch-action:none;position:relative}
.ppc-print.is-ejecting{animation:ppc-eject 1.3s cubic-bezier(.3,.1,.3,1) both}
@keyframes ppc-eject{0%{transform:translateY(-102%) rotate(0)}70%{transform:translateY(-6%) rotate(0)}100%{transform:translateY(0) rotate(-2deg)}}
.ppc-photo{position:relative;width:220px;height:183px;background:#d7d3cb;overflow:hidden}
.ppc-photo img{display:block;width:100%;height:100%;object-fit:cover;opacity:calc(.12 + var(--dev) * .88);
  filter:brightness(calc(1 + (1 - var(--dev)) * 1.3)) saturate(var(--dev)) sepia(calc((1 - var(--dev)) * .6)) blur(calc((1 - var(--dev)) * 3px));animation:ppc-fade .35s}
@keyframes ppc-fade{from{opacity:.4}}
.ppc-busy{position:absolute;inset:0;display:grid;place-items:center;background:#0005;color:#fff;font-size:13px;letter-spacing:1px}
.ppc-cap{min-height:52px;padding:10px 4px 12px;font-family:${HAND};font-size:17px;color:#3b3346;line-height:1.2;word-break:break-word}
.ppc-hint{position:absolute;right:10px;bottom:-4px;transform:translateY(100%);font-size:11px;color:var(--muted);animation:ppc-wiggle 1s ease-in-out infinite}
@keyframes ppc-wiggle{50%{transform:translate(4px,100%)}}
.ppc-empty{margin-top:22px;width:248px;height:220px;border:2px dashed #ffffff26;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--muted);font-size:13px;text-align:center;padding:20px}
.ppc-empty span{font-size:30px}
.ppc-panel{display:flex;flex-direction:column;gap:16px;min-width:0}
.ppc-drop{display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;border:2px dashed #ff7a5966;border-radius:16px;background:#ff7a590d;cursor:pointer;text-align:center;transition:background .2s,border-color .2s}
.ppc-drop.is-over,.ppc-drop:hover{background:#ff7a591f;border-color:var(--accent)}
.ppc-drop:focus-within{outline:3px solid #ffd27a;outline-offset:2px}
.ppc-drop small{color:var(--muted);font-size:12px}
.ppc-link{align-self:center;margin-top:-8px;background:none;border:0;color:#ffd27a;font:inherit;font-size:13px;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.ppc-group{display:flex;flex-direction:column;gap:8px}
.ppc-label{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--muted)}
.ppc-styles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.ppc-style{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:var(--panel);color:var(--text);font:inherit;font-size:14px;cursor:pointer;text-align:left;transition:border-color .2s,background .2s}
.ppc-style b{display:grid;place-items:center;width:22px;height:22px;border-radius:6px;background:#ffffff14;font-size:12px;flex:none}
.ppc-style.is-on{border-color:var(--accent);background:#ff7a5922}.ppc-style.is-on b{background:var(--accent);color:#1a1020}
.ppc-style:focus-visible,.ppc-btn:focus-visible,.ppc-link:focus-visible{outline:3px solid #ffd27a;outline-offset:2px}
.ppc-input{width:100%;padding:11px 12px;border-radius:12px;border:1px solid var(--line);background:var(--panel);color:var(--text);font:inherit;font-size:14px}
.ppc-input:focus{outline:none;border-color:var(--accent)}
.ppc-actions{display:flex;gap:10px;flex-wrap:wrap}
.ppc-btn{padding:10px 16px;border-radius:12px;border:0;background:#ffd27a;color:#1a1020;font:inherit;font-weight:600;font-size:14px;cursor:pointer}
.ppc-btn-main{background:var(--accent);color:#1a1020}
.ppc-btn-ghost{background:transparent;color:var(--text);border:1px solid var(--line)}
.ppc-btn:disabled{opacity:.4;cursor:not-allowed}
.ppc-error{margin:0;color:#ff9a8a;font-size:13px}
.ppc-note{margin:0;color:var(--muted);font-size:12px}
.ppc-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (prefers-reduced-motion:reduce){.ppc-print.is-ejecting,.ppc-flash.is-fired,.ppc-hint,.ppc-photo img{animation:none}}
`;
