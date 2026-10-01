import Link from "next/link";
import { registry } from "@/lib/registry";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Component Gallery</h1>
      <p className="mt-2 max-w-xl text-white/60">
        {registry.length} components so far. Each one has its own direct link.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {registry.map(({ slug, name, type, week, description, Component, previewScale }) => (
          <Link
            key={slug}
            href={`/components/${slug}`}
            className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/25"
          >
            <div className="pointer-events-none flex h-48 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-950 to-slate-900">
              <div style={{ transform: `scale(${previewScale ?? 0.6})` }}>
                <Component />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <h2 className="font-medium">{name}</h2>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{type}</span>
            </div>
            <p className="mt-1 text-sm text-white/55">{description}</p>
            <p className="mt-3 text-xs text-white/35">Week {String(week).padStart(2, "0")}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
