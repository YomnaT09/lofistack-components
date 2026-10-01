import Link from "next/link";
import { notFound } from "next/navigation";
import { getItem, registry } from "@/lib/registry";

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
  const { name, type, week, description, Component } = item;
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/" className="text-sm text-white/50 hover:text-white">
        ← All components
      </Link>
      <div className="mt-4 flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{type}</span>
      </div>
      <p className="mt-1 text-white/60">{description}</p>
      <p className="mt-1 text-xs text-white/35">Week {String(week).padStart(2, "0")}</p>
      <div className="mt-8 flex min-h-[420px] items-center overflow-hidden justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950 to-slate-900 p-8">
        <Component />
      </div>
    </main>
  );
}
