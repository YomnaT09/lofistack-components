import Link from "next/link";
import { registry } from "@/lib/registry";
import { REPO } from "@/lib/source";
import GalleryGrid from "./gallery-grid";
import { THEMES, type GalleryVariant } from "./themes";

const TOTAL = 30;

function Background({ variant }: { variant: GalleryVariant }) {
  if (variant === "neon")
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[620px] bg-[linear-gradient(rgba(34,211,238,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.1)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="absolute -left-20 top-0 h-[380px] w-[380px] rounded-full bg-cyan-500/20 blur-[110px]" />
        <div className="absolute -right-20 top-24 h-[380px] w-[380px] rounded-full bg-pink-600/25 blur-[110px]" />
      </div>
    );
  if (variant === "paper")
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-violet-300/40 blur-[110px]" />
        <div className="absolute -right-24 top-10 h-[360px] w-[360px] rounded-full bg-pink-300/40 blur-[110px]" />
        <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(rgba(109,40,217,.12)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      </div>
    );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-indigo-600/30 blur-[120px]" />
      <div className="absolute -right-24 top-10 h-[360px] w-[360px] rounded-full bg-fuchsia-600/20 blur-[120px]" />
      <div className="absolute inset-x-0 top-0 h-[560px] bg-[linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
    </div>
  );
}

export default function GalleryPage({ variant }: { variant: GalleryVariant }) {
  const t = THEMES[variant];
  const built = registry.length;
  const types = new Set(registry.map((c) => c.type)).size;
  const weeks = new Set(registry.map((c) => c.week)).size;
  const pct = Math.round((built / TOTAL) * 100);
  const stats = [
    { label: "Components built", value: String(built) },
    { label: "Different types", value: String(types) },
    { label: "Weeks so far", value: String(weeks) },
  ];
  const own = variant !== "aurora"; // the other looks bring their own header, so hide the shared one

  return (
    <main className={`relative min-h-screen overflow-hidden ${t.root}`}>
      {own && <style>{`body > header { display: none }${variant === "paper" ? " body { background: #f6f2ff }" : variant === "neon" ? " body { background: #05050c }" : ""}`}</style>}
      {own && (
        <header className={`sticky top-0 z-40 border-b backdrop-blur-xl ${t.header}`}>
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
            <Link href="/" className={`flex items-center gap-2.5 font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${t.focus}`}>
              <span aria-hidden className="h-3.5 w-3.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500" />
              LofiStack Gallery
            </Link>
            <span className={`hidden border px-3 py-1 text-xs sm:inline ${t.headerPill}`}>90 day build challenge</span>
          </div>
        </header>
      )}
      <Background variant={variant} />

      <section className="relative mx-auto max-w-6xl px-6 pb-10 pt-16 sm:pt-24">
        <p className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium ${t.eyebrow}`}>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> LofiStack 90 day build challenge
        </p>
        <h1 className="mt-6 max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
          <span className={t.titleA}>{t.title[0]}</span> <span className={t.titleB}>{t.title[1]}</span>
        </h1>
        <p className={`mt-6 max-w-2xl text-lg leading-relaxed ${t.lead}`}>
          Every component has its own page with a live preview, a how-to, the props table and the full source. Try them, then copy the code.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
          <a href="#gallery" className={`px-6 py-3 font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${t.focus} ${t.primary}`}>
            Browse components
          </a>
          <a href={REPO} target="_blank" rel="noreferrer" className={`px-6 py-3 font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${t.focus} ${t.secondary}`}>
            Source on GitHub
          </a>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className={`p-5 ${t.stat}`}>
            <div className="flex items-baseline justify-between gap-2">
              <p className={`text-sm font-medium ${t.statLabel}`}>Challenge progress</p>
              <p className={`text-sm font-semibold ${t.statValue}`}>
                {built} <span className={t.statLabel}>/ {TOTAL}</span>
              </p>
            </div>
            <div role="progressbar" aria-label="Components built" aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={built} className={`mt-4 h-2.5 overflow-hidden rounded-full ${t.track}`}>
              <div className={`h-full rounded-full ${t.fill}`} style={{ width: `${pct}%` }} />
            </div>
            <p className={`mt-3 text-xs ${t.statLabel}`}>{pct}% done, Oct 1 to Dec 29</p>
          </div>
          {stats.map((s) => (
            <div key={s.label} className={`p-5 ${t.stat}`}>
              <p className={`text-4xl font-bold tracking-tight ${t.statValue}`}>{s.value}</p>
              <p className={`mt-1 text-sm ${t.statLabel}`}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="gallery" className="relative mx-auto max-w-6xl scroll-mt-20 px-6 pb-24 pt-6">
        <h2 className={`mb-6 text-2xl font-semibold tracking-tight ${t.h2}`}>The gallery</h2>
        <GalleryGrid variant={variant} />
      </section>

      <footer className={`relative border-t ${t.footer}`}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm sm:flex-row">
          <p>Built for the LofiStack 90 day challenge.</p>
          <a href={REPO} target="_blank" rel="noreferrer" className={`font-medium underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 ${t.focus} ${t.footerLink}`}>
            View the repo
          </a>
        </div>
      </footer>
    </main>
  );
}
