import Link from "next/link";
import { notFound } from "next/navigation";
import { getItem, registry } from "@/lib/registry";
import { REPO } from "@/lib/source";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import CodeViewer from "@/ui/code-viewer";

export function generateStaticParams() {
  return registry.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const item = getItem((await params).slug);
  return { title: item ? `${item.name} | LofiStack Gallery` : "Not found", description: item?.description };
}

const read = (file: string) => readFileSync(join(process.cwd(), "src", "showcase", file), "utf8");

export default async function ComponentPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const item = getItem(slug);
  if (!item) notFound();
  const { name, type, week, date, summary, features, howToUse, tech, Component, previewProps, props, usage } = item;
  const files = item.files ?? [`${slug}.tsx`];
  const idx = registry.findIndex((c) => c.slug === slug);
  const prev = registry[idx - 1];
  const next = registry[idx + 1];
  const wk = String(week).padStart(2, "0");

  const details: [string, string][] = [
    ["Type", type],
    ["Week", wk],
    ["Added", date],
    ["Built with", tech.join(", ")],
    ["Direct link", `/components/${slug}`],
    ["Source files", String(files.length)],
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm text-ink/50 transition hover:text-ink">
        ← All components
      </Link>

      <p className="mt-6 text-sm text-acc2">Week {wk} · {date}</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="bg-gradient-to-r from-ink to-acc2 bg-clip-text text-4xl font-semibold tracking-tight text-transparent">
          {name}
        </h1>
        <span className="rounded-full border border-acc2/40 bg-acc2/10 px-2.5 py-0.5 text-xs text-acc2">{type}</span>
      </div>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink/65">{summary}</p>

      <div className="relative mt-8 flex min-h-[420px] sm:min-h-[460px] items-center justify-center overflow-hidden rounded-3xl border border-acc1/30 bg-[radial-gradient(ellipse_at_top,#2a2468_0%,#0b0b1c_60%)] p-3 sm:p-8">
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
          <Component {...previewProps} />
        </div>
      </div>

      <h2 className="mb-4 mt-12 text-xl font-semibold">Details</h2>
      <dl className="grid gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10 sm:grid-cols-2">
        {details.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 bg-page px-4 py-3">
            <dt className="text-sm text-ink/45">{k}</dt>
            <dd className="text-right text-sm font-medium text-ink/90">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section>
          <h3 className="mb-3 font-semibold">What it does</h3>
          <ul className="space-y-2 text-sm text-ink/65">
            {features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-acc1" />
                {f}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-3 font-semibold">How to use it</h3>
          <ol className="space-y-2 text-sm text-ink/65">
            {howToUse.map((h, i) => (
              <li key={h} className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink/10 text-[11px] text-ink/80">{i + 1}</span>
                {h}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <h2 className="mb-4 mt-12 text-xl font-semibold">Usage</h2>
      <CodeViewer code={usage} filename="Example.tsx" href={`${REPO}/blob/main/src/showcase/${files[0]}`} defaultOpen />

      <h2 className="mb-4 mt-12 text-xl font-semibold">Props</h2>
      <div className="overflow-x-auto rounded-2xl border border-ink/10">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead className="bg-ink/[0.04] text-ink/70">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Prop</th>
              <th scope="col" className="px-4 py-3 font-medium">Type</th>
              <th scope="col" className="px-4 py-3 font-medium">Default</th>
              <th scope="col" className="px-4 py-3 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {props.map((p) => (
              <tr key={p.name} className="align-top">
                <td className="px-4 py-3 font-mono text-[13px] text-acc2">{p.name}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-ink/75">{p.type}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-ink/75">{p.default}</td>
                <td className="px-4 py-3 text-ink/75">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-4 mt-12 text-xl font-semibold">Source</h2>
      <div className="space-y-3">
        {files.map((f, i) => (
          <CodeViewer key={f} code={read(f)} filename={f} href={`${REPO}/blob/main/src/showcase/${f}`} defaultOpen={i === 0} />
        ))}
      </div>

      <nav className="mt-12 grid gap-4 border-t border-ink/10 pt-6 sm:grid-cols-2">
        {prev ? (
          <Link href={`/components/${prev.slug}`} className="rounded-xl border border-ink/10 p-4 transition hover:border-acc2/60">
            <span className="text-xs text-ink/40">← Previous</span>
            <span className="mt-1 block font-medium">{prev.name}</span>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/components/${next.slug}`} className="rounded-xl border border-ink/10 p-4 text-right transition hover:border-acc2/60">
            <span className="text-xs text-ink/40">Next →</span>
            <span className="mt-1 block font-medium">{next.name}</span>
          </Link>
        ) : <span />}
      </nav>
    </main>
  );
}
