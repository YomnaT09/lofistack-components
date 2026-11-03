"use client";

// Bug Fixer: a tiny shooter that plays in the hero sky. Press start, move the rocket,
// shoot the falling bugs before they reach the grass. Three lives, a new wave every 10 bugs.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type HudItem = { label: string; value: string };
type Phase = "idle" | "playing" | "over";
type Stats = { fixed: number; lives: number; wave: number; best: number };

const BEST_KEY = "lofistack-bug-fixer-best";
const PX = 5; // size of one sprite pixel in CSS px
const INK = "#0b0b18";

// Sprites: one character per pixel, "." is transparent.
const BUG = [".k...k.", "..k.k..", "..kkk..", ".kgggk.", "kgkgkgk", "kgggggk", "kgkgkgk", ".kgggk.", "..kkk.."];
const SHIP = ["...w...", "..wcw..", ".wcccw.", "wwcccww", "w.r.r.w"];
const BUG_COLORS = ["#ff6b9a", "#9ccc65", "#4fc3ff", "#ff9f43"];

type Bug = { x: number; y: number; vy: number; phase: number; color: string };
type Shot = { x: number; y: number };
type Pop = { x: number; y: number; t: number; text: string };

function drawSprite(ctx: CanvasRenderingContext2D, rows: string[], pal: Record<string, string>, x: number, y: number, px = PX) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = row[i];
      if (c === ".") continue;
      ctx.fillStyle = pal[c];
      ctx.fillRect(Math.round(x + i * px), Math.round(y + j * px), px, px);
    }
  });
}

const readBest = () => {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
};

export default function BugFixerHero({ idleHud, repo, children }: { idleHud: HudItem[]; repo: string; children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stats, setStats] = useState<Stats>({ fixed: 0, lives: 3, wave: 1, best: 0 });
  const phaseRef = useRef<Phase>("idle");
  // On short screens (phones) the hero is taller than the window, so while playing we hide the
  // text and shrink the play area to the visible part of the screen.
  const [playHeight, setPlayHeight] = useState<number | null>(null);
  const startRef = useRef<() => void>(() => {});

  useEffect(() => setStats((s) => ({ ...s, best: readBest() })), []);

  const stop = useCallback(() => {
    phaseRef.current = "idle";
    setPhase("idle");
    setPlayHeight(null);
  }, []);

  const start = () => {
    const wrap = wrapRef.current;
    if (wrap) {
      const header = 72;
      const room = window.innerHeight - header;
      const r = wrap.getBoundingClientRect();
      setPlayHeight(r.height > room ? Math.max(420, room) : null);
      window.scrollTo({ top: Math.max(0, r.top + window.scrollY - header) });
    }
    // Let the layout settle (and the canvas resize) before the first frame.
    requestAnimationFrame(() => requestAnimationFrame(() => startRef.current()));
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;
    let w = 0;
    let h = 0;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const shipW = SHIP[0].length * PX;
    const bugW = BUG[0].length * PX;
    const bugH = BUG.length * PX;
    let shipX = 0;
    let bugs: Bug[] = [];
    let shots: Shot[] = [];
    let pops: Pop[] = [];
    let fixed = 0;
    let lives = 3;
    let wave = 1;
    let spawnIn = 0;
    let cooldown = 0;
    let hurt = 0;
    const keys = new Set<string>();
    let firing = false;
    let pointerX: number | null = null;
    let raf = 0;
    let last = 0;

    const shipY = () => h - 34 - SHIP.length * PX - 12;
    const push = () => setStats((s) => ({ ...s, fixed, lives, wave }));

    startRef.current = () => {
      shipX = w / 2 - shipW / 2;
      bugs = [];
      shots = [];
      pops = [];
      fixed = 0;
      lives = 3;
      wave = 1;
      spawnIn = 0.4;
      cooldown = 0;
      hurt = 0;
      keys.clear();
      firing = false;
      pointerX = null;
      phaseRef.current = "playing";
      setPhase("playing");
      push();
      last = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    };

    const end = () => {
      phaseRef.current = "over";
      setPhase("over");
      const best = Math.max(readBest(), fixed);
      try {
        localStorage.setItem(BEST_KEY, String(best));
      } catch {
        /* storage blocked: best score lasts for this visit only */
      }
      setStats({ fixed, lives: 0, wave, best });
      setPlayHeight(null);
    };

    const fire = () => {
      if (cooldown > 0) return;
      shots.push({ x: shipX + shipW / 2 - 3, y: shipY() - 10 });
      cooldown = 0.22;
    };

    function loop(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      if (phaseRef.current !== "playing") return;

      // Move the rocket: keyboard, or follow the finger/mouse while it is down.
      const speed = 420;
      if (keys.has("ArrowLeft") || keys.has("a")) shipX -= speed * dt;
      if (keys.has("ArrowRight") || keys.has("d")) shipX += speed * dt;
      if (pointerX !== null) shipX += (pointerX - shipW / 2 - shipX) * Math.min(1, dt * 14);
      shipX = Math.max(8, Math.min(w - shipW - 8, shipX));

      cooldown -= dt;
      if (firing || keys.has(" ")) fire();

      // Spawn bugs, faster and quicker on every wave.
      spawnIn -= dt;
      if (spawnIn <= 0) {
        bugs.push({
          x: 16 + Math.random() * (w - bugW - 32),
          y: -bugH,
          vy: 38 + wave * 12 + Math.random() * 20,
          phase: Math.random() * Math.PI * 2,
          color: BUG_COLORS[Math.floor(Math.random() * BUG_COLORS.length)],
        });
        spawnIn = Math.max(0.45, 1.5 - wave * 0.15) * (0.7 + Math.random() * 0.6);
      }

      shots = shots.filter((s) => (s.y -= 560 * dt) > -20);
      const groundY = shipY() + SHIP.length * PX;
      for (const b of bugs) {
        b.y += b.vy * dt;
        b.phase += dt * 3;
      }

      // Hits.
      for (const s of shots) {
        for (const b of bugs) {
          const bx = b.x + Math.sin(b.phase) * 14;
          if (b.y !== Infinity && s.x + 6 > bx && s.x < bx + bugW && s.y < b.y + bugH && s.y + 18 > b.y) {
            pops.push({ x: bx - 10, y: b.y, t: 0.8, text: "FIXED! +1" });
            b.y = Infinity;
            s.y = -Infinity;
            fixed++;
            if (fixed % 10 === 0) {
              wave++;
              pops.push({ x: w / 2 - 40, y: h / 2, t: 1.4, text: `WAVE ${wave}` });
            }
            push();
            break;
          }
        }
      }
      shots = shots.filter((s) => s.y !== -Infinity);
      const escaped = bugs.filter((b) => b.y !== Infinity && b.y > groundY);
      bugs = bugs.filter((b) => b.y !== Infinity && b.y <= groundY);
      if (escaped.length) {
        lives -= escaped.length;
        hurt = 0.4;
        push();
        if (lives <= 0) {
          end();
          ctx.clearRect(0, 0, w, h);
          return;
        }
      }

      // Draw.
      ctx.fillStyle = "#ffd23f";
      for (const s of shots) ctx.fillRect(Math.round(s.x), Math.round(s.y), 6, 18);
      for (const b of bugs) drawSprite(ctx, BUG, { k: INK, g: b.color }, b.x + Math.sin(b.phase) * 14, b.y);
      if (!(hurt > 0 && Math.floor(hurt * 20) % 2)) {
        drawSprite(ctx, SHIP, { w: "#e8f1ff", c: "#4fc3ff", r: "#ff6b3d" }, shipX, shipY());
      }
      hurt -= dt;
      ctx.font = "10px var(--font-press-start), monospace";
      pops = pops.filter((p) => (p.t -= dt) > 0);
      for (const p of pops) {
        ctx.globalAlpha = Math.min(1, p.t * 2);
        ctx.fillStyle = INK;
        ctx.fillText(p.text, p.x + 2, p.y - (0.8 - p.t) * 30 + 2);
        ctx.fillStyle = "#ffd23f";
        ctx.fillText(p.text, p.x, p.y - (0.8 - p.t) * 30);
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(loop);
    }

    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== "playing") return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === "Escape") {
        cancelAnimationFrame(raf);
        ctx.clearRect(0, 0, w, h);
        stop();
        return;
      }
      if (["ArrowLeft", "ArrowRight", " ", "a", "d", "ArrowUp", "ArrowDown"].includes(k)) {
        e.preventDefault();
        if (e.type === "keydown") keys.add(k);
        else keys.delete(k);
      }
    };
    const local = (e: PointerEvent) => e.clientX - canvas.getBoundingClientRect().left;
    const onDown = (e: PointerEvent) => {
      if (phaseRef.current !== "playing") return;
      canvas.setPointerCapture(e.pointerId);
      pointerX = local(e);
      firing = true;
    };
    const onMove = (e: PointerEvent) => {
      if (phaseRef.current === "playing" && pointerX !== null) pointerX = local(e);
    };
    const onUp = () => {
      pointerX = null;
      firing = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [stop]);

  const playing = phase === "playing";
  const hud: HudItem[] =
    phase === "idle"
      ? idleHud
      : [
          { label: "BUGS FIXED", value: String(stats.fixed).padStart(2, "0") },
          { label: "LIVES", value: "♥".repeat(Math.max(0, stats.lives)) + "♡".repeat(3 - Math.max(0, stats.lives)) },
          { label: "WAVE", value: String(stats.wave) },
          { label: "BEST", value: String(Math.max(stats.best, stats.fixed)).padStart(2, "0") },
        ];

  return (
    <div ref={wrapRef} className="relative mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pb-28" style={playHeight ? { height: playHeight } : undefined}>
      <dl role="group" aria-label={phase === "idle" ? "Challenge progress" : "Bug Fixer score"} aria-live="polite" className="relative z-20 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {hud.map((item) => (
          <div key={item.label}>
            <dt className="pq-outline font-[family-name:var(--font-pixel)] text-[10px] sm:text-xs">{item.label}</dt>
            <dd className={`pq-outline mt-2 font-[family-name:var(--font-pixel)] text-xs sm:text-sm ${phase === "idle" ? "" : "text-pq-coin"}`}>{item.value}</dd>
          </div>
        ))}
      </dl>

      <div className={`transition-opacity duration-200 ${playing ? "pointer-events-none opacity-30" : ""} ${playing && playHeight ? "hidden" : ""}`} aria-hidden={playing}>
        {children}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={start}
            className="pq-press inline-flex items-center gap-3 bg-pq-coin px-5 py-3.5 font-[family-name:var(--font-pixel)] text-xs text-pq-ink focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-pq-coin"
          >
            <span aria-hidden className="pq-blink">▶</span> {phase === "over" ? "PLAY AGAIN" : "PRESS START"}
          </button>
          <a
            href="#gallery"
            className="pq-press bg-pq-card px-5 py-3.5 font-[family-name:var(--font-pixel)] text-xs text-pq-card-ink focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-pq-coin"
          >
            SEE THE LEVELS ▼
          </a>
          <a
            href={repo}
            target="_blank"
            rel="noreferrer"
            className="pq-press bg-pq-card px-5 py-3.5 font-[family-name:var(--font-pixel)] text-xs text-pq-card-ink focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-pq-coin"
          >
            GITHUB
          </a>
        </div>
        <p className="pq-outline mt-6 text-center font-[family-name:var(--font-pixel)] text-[10px] leading-relaxed sm:text-xs">
          {phase === "over" ? (
            <span className="text-pq-coin">GAME OVER · {stats.fixed} BUGS FIXED · BEST {stats.best}</span>
          ) : (
            "BUG FIXER: ARROW KEYS TO MOVE · SPACE TO SHOOT · OR DRAG ON PHONE"
          )}
        </p>
      </div>

      <canvas
        ref={canvasRef}
        aria-label="Bug Fixer game. Move with the arrow keys and shoot with space, or drag with a finger. Press Escape to quit."
        className={`absolute inset-0 z-10 ${playing ? "cursor-crosshair touch-none" : "pointer-events-none"}`}
      />

      {playing && (
        <button
          type="button"
          onClick={() => {
            stop();
            canvasRef.current?.getContext("2d")?.clearRect(0, 0, 9999, 9999);
          }}
          className="absolute right-4 top-[190px] z-20 border-2 sm:right-6 sm:top-[118px] border-white bg-pq-ink px-3 py-2 font-[family-name:var(--font-pixel)] text-[9px] text-white"
        >
          QUIT (ESC)
        </button>
      )}
    </div>
  );
}
