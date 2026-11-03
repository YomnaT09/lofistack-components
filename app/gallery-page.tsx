import { registry } from "@/lib/registry";
import { REPO } from "@/lib/source";
import BugFixerHero from "./bug-fixer";
import GalleryGrid from "./gallery-grid";
import { THEMES, type GalleryVariant } from "./themes";

const TOTAL = 30;
const END_LABEL = "DEC 29";

// Day sky gets blocky clouds, night sky gets stars and a moon (CSS toggles them by theme).
function Sky() {
  // Placed in the empty space around the text: the first four on wider screens, the last two at the bottom on phones.
  const clouds = [
    { pos: { left: "4%", top: 190 }, scale: 2.2, cls: "hidden sm:block" },
    { pos: { left: "80%", top: 200 }, scale: 2.6, cls: "hidden sm:block" },
    { pos: { left: "88%", top: 370 }, scale: 1.3, cls: "hidden lg:block" },
    { pos: { left: "3%", top: 420 }, scale: 1.2, cls: "hidden lg:block" },
    { pos: { left: "6%", bottom: 34 }, scale: 1.6, cls: "sm:hidden" },
    { pos: { right: "12%", bottom: 64 }, scale: 1, cls: "sm:hidden" },
  ];
  const stars = [
    [6, 80], [14, 210], [22, 120], [31, 300], [44, 70], [52, 330], [63, 140], [71, 260], [84, 200], [92, 110], [96, 320], [38, 190],
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="pq-day">
        {clouds.map((c, i) => (
          <div key={i} className={`pq-cloud absolute origin-top-left ${c.cls}`} style={{ ...c.pos, transform: `scale(${c.scale})` }} />
        ))}
      </div>
      <div className="pq-night">
        {stars.map(([x, y], i) => (
          <div key={i} className="pq-star absolute" style={{ left: `${x}%`, top: y }} />
        ))}
        <div className="absolute right-[9%] top-24 h-16 w-16 border-4 border-pq-ink bg-[#fff1b8] shadow-[inset_-12px_-8px_0_#f2d77a]" />
      </div>
    </div>
  );
}

export default function GalleryPage({ variant = "pixel" }: { variant?: GalleryVariant }) {
  const t = THEMES[variant];
  const built = registry.length;
  const types = new Set(registry.map((c) => c.type)).size;
  const weeks = new Set(registry.map((c) => c.week)).size;
  const pad = (n: number, w = 4) => String(n).padStart(w, "0");
  const hud = [
    { label: "BUILT", value: `${pad(built)}/${pad(TOTAL)}` },
    { label: "TYPES", value: `× ${types}` },
    { label: "WORLD", value: `1-${weeks}` },
    { label: "TIME", value: END_LABEL },
  ];

  return (
    <main className={`relative min-h-screen overflow-hidden ${t.root}`}>
      <section className="pq-sky relative">
        <Sky />
        <BugFixerHero idleHud={hud} repo={REPO}>
          <div className="mt-14 text-center sm:mt-16">
            <h1 className="text-[34px] leading-[1.35] sm:text-6xl sm:leading-[1.3]">
              <span className={t.titleA}>{t.title[0]}</span>
              <br />
              <span className={t.titleB}>{t.title[1]}</span>
            </h1>
            <p className={`mx-auto mt-6 max-w-3xl text-lg leading-snug sm:text-2xl ${t.lead}`}>
              A hand-built component adventure. Every level has a live preview, a how-to, the props table and the full source.
            </p>
            <p className={`mt-4 text-[10px] sm:text-xs ${t.muted}`}>
              {Math.round((built / TOTAL) * 100)}% CLEAR · OCT 1 TO DEC 29
            </p>
          </div>
        </BugFixerHero>
      </section>

      <section id="gallery" className="pq-ground relative scroll-mt-16 border-t-[6px] border-pq-ink">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-14 sm:px-6">
          <h2 className={`mb-6 text-base leading-relaxed sm:text-xl ${t.h2}`}>
            WORLD 1 · ALL {built} LEVELS
          </h2>
          <GalleryGrid variant={variant} />
        </div>
      </section>

      <footer className={`relative border-t-4 ${t.footer}`}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-center sm:flex-row sm:text-left">
          <p>BUILT FOR THE LOFISTACK 90 DAY CHALLENGE</p>
          <a href={REPO} target="_blank" rel="noreferrer" className={`underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 ${t.focus} ${t.footerLink}`}>
            VIEW THE REPO →
          </a>
        </div>
      </footer>
    </main>
  );
}
