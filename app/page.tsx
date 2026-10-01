import Link from "next/link";
import { registry } from "@/lib/registry";
import { REPO } from "@/lib/source";

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,.35),transparent_65%)]"
      />
      <section className="relative mx-auto max-w-6xl px-6 pb-6 pt-16">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> LofiStack 90 day build challenge
        </p>
        <h1 className="mt-5 max-w-3xl bg-gradient-to-r from-white via-indigo-200 to-fuchsia-300 bg-clip-text text-5xl font-semibold tracking-tight text-transparent sm:text-6xl">
          Component Gallery
        </h1>
        <p className="mt-4 max-w-xl text-lg text-white/60">
          Hand-built, interactive UI components. Open any one to try it live and copy the code.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full bg-white px-4 py-1.5 font-medium text-slate-900">{registry.length} / 30 components</span>
          <a href={REPO} target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-4 py-1.5 text-white/80 transition hover:bg-white/10">
            Source on GitHub
          </a>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-20 pt-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {registry.map(({ slug, name, type, week, description, Component, previewScale, previewProps }) => (
            <Link
              key={slug}
              href={`/components/${slug}`}
              className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition duration-300 hover:-translate-y-1 hover:border-indigo-400/50 hover:shadow-[0_20px_60px_-20px_rgba(99,102,241,.6)]"
            >
              <div className="pointer-events-none flex h-52 items-center justify-center overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_top,#2a2468_0%,#0b0b1c_70%)]">
                <div style={{ transform: `scale(${previewScale ?? 0.6})` }}>
                  <Component {...previewProps} />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <h2 className="font-medium">{name}</h2>
                <span className="rounded-full border border-indigo-400/40 bg-indigo-400/10 px-2 py-0.5 text-xs text-indigo-200">{type}</span>
              </div>
              <p className="mt-1 text-sm text-white/55">{description}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-white/40">
                <span>Week {String(week).padStart(2, "0")}</span>
                <span className="text-indigo-300 opacity-0 transition group-hover:opacity-100">View live + code →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
