"use client";

import { useState } from "react";

export default function CodeViewer({
  code,
  filename,
  href,
  defaultOpen = false,
}: {
  code: string;
  filename: string;
  href: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const lines = code.split("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d17]">
      <div className="flex items-center justify-between gap-3 bg-white/[0.03] px-4 py-2.5">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <span className={`text-base leading-none text-white/50 transition-transform ${open ? "rotate-90" : ""}`}>›</span>
          <span className="truncate font-mono text-sm text-white/80">{filename}</span>
          <span className="shrink-0 text-xs text-white/35">{lines.length} lines</span>
        </button>
        <div className="flex shrink-0 items-center gap-2 text-xs">
          <a href={href} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-3 py-1 text-white/70 transition hover:bg-white/10 hover:text-white">
            GitHub
          </a>
          <button
            onClick={copy}
            className={`rounded-full px-3 py-1 font-medium transition ${copied ? "bg-emerald-400 text-slate-900" : "bg-white text-slate-900 hover:bg-white/85"}`}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      {open && (
        <>
          <pre
            className="overflow-auto border-t border-white/10 p-4 font-mono text-[12.5px] leading-6 text-slate-200"
            style={{ maxHeight: expanded ? "none" : 420 }}
            tabIndex={0}
          >
            <code>
              {lines.map((l, i) => (
                <div key={i} className="flex">
                  <span className="w-10 shrink-0 select-none pr-4 text-right text-white/25">{i + 1}</span>
                  <span className="whitespace-pre">{l || " "}</span>
                </div>
              ))}
            </code>
          </pre>
          {lines.length > 20 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="w-full border-t border-white/10 bg-white/[0.03] py-2 text-xs text-white/60 transition hover:text-white"
            >
              {expanded ? "Show less" : `Show all ${lines.length} lines`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
