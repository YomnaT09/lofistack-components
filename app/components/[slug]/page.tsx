import Link from "next/link";
import { notFound } from "next/navigation";
import { getItem, registry } from "@/lib/registry";
import { getSource, sourceUrl } from "@/lib/source";
import CodeViewer from "@/ui/code-viewer";

export function generateStaticParams() {
  return registry.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const item = getItem((await params).slug);
  return { title: item ? `${item.name} | LofiStack Gallery` : "Not found" };
}

export default async function ComponentPage({ params }: { params: Promise<{ slug: string }> }) {
  const item = getItem((await params).slug);
  if (!item) notFound();
  const { slug, name, type, week, description, Component } = item;
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/" className="text-sm text-white/50 transition hover:text-white">
        ← All components
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
          {name}
        </h1>
        <span className="rounded-full border border-indigo-400/40 bg-indigo-400/10 px-2.5 py-0.5 text-xs text-indigo-200">{type}</span>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/60">Week {String(week).padStart(2, "0")}</span>
      </div>
      <p className="mt-2 max-w-2xl text-white/60">{description}</p>

      <div className="relative mt-8 flex min-h-[460px] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_top,#2a2468_0%,#0b0b1c_60%)] p-8">
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,.35) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
        <div className="relative">
          <Component />
        </div>
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold">Code</h2>
      <CodeViewer code={getSource(slug)} filename={`${slug}.tsx`} href={sourceUrl(slug)} />
    </main>
  );
}
