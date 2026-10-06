"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type BillingPeriod = "monthly" | "yearly";

export interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  /** Price per month when billed monthly. */
  monthlyPrice: number;
  /** Price per month when billed yearly. */
  yearlyPrice: number;
  features: string[];
  /** Gives the card a gradient ring and lifts it. */
  highlighted?: boolean;
  /** Small label above the plan name, e.g. "Most popular". */
  badge?: string;
  ctaLabel?: string;
  disabled?: boolean;
}

export interface PricingToggleSectionProps {
  plans?: PricingPlan[];
  title?: string;
  subtitle?: string;
  defaultPeriod?: BillingPeriod;
  onPeriodChange?: (period: BillingPeriod) => void;
  /** ISO currency code used for formatting. */
  currency?: string;
  /** BCP 47 locale used for formatting. */
  locale?: string;
  /** Text of the savings pill. Leave empty to compute "Save up to X%" from the plans. */
  saveLabel?: string;
  /** Called when a plan button is pressed. */
  onSelect?: (plan: PricingPlan, period: BillingPeriod) => void;
  /** Lock the toggle and every plan button. */
  disabled?: boolean;
  /** Show skeleton cards and lock the section. */
  loading?: boolean;
  className?: string;
}

const DEFAULT_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For side projects and trying things out.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: ["1 project", "Community support", "Basic analytics"],
    ctaLabel: "Start free",
  },
  {
    id: "pro",
    name: "Pro",
    description: "For makers who ship every week.",
    monthlyPrice: 29,
    yearlyPrice: 23,
    features: ["Unlimited projects", "Priority support", "Advanced analytics", "Custom domains"],
    highlighted: true,
    badge: "Most popular",
    ctaLabel: "Go Pro",
  },
  {
    id: "team",
    name: "Team",
    description: "For teams that build together.",
    monthlyPrice: 79,
    yearlyPrice: 63,
    features: ["Everything in Pro", "10 seats included", "Roles and permissions", "SSO"],
    ctaLabel: "Start team trial",
  },
];

const PERIODS: { id: BillingPeriod; label: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

/** Counts a number up or down to `target` with an ease-out curve. */
function useTween(target: number, duration = 500) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || from.current === target) {
      from.current = target;
      setValue(target);
      return;
    }
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = start + (target - start) * eased;
      from.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function Price({ amount, format }: { amount: number; format: (n: number) => string }) {
  const shown = useTween(amount);
  return (
    <>
      <span aria-hidden className="tabular-nums">{format(Math.round(shown))}</span>
      <span className="sr-only">{format(amount)}</span>
    </>
  );
}

export default function PricingToggleSection({
  plans = DEFAULT_PLANS,
  title = "Simple pricing, no surprises",
  subtitle = "Pick a plan and switch to yearly to save. Cancel any time.",
  defaultPeriod = "monthly",
  onPeriodChange,
  currency = "USD",
  locale = "en-US",
  saveLabel,
  onSelect,
  disabled = false,
  loading = false,
  className = "",
}: PricingToggleSectionProps) {
  const labelId = useId();
  const locked = disabled || loading;
  const [period, setPeriod] = useState<BillingPeriod>(defaultPeriod);
  const [selected, setSelected] = useState<string | null>(null);
  const radios = useRef<Array<HTMLButtonElement | null>>([]);

  const format = useMemo(() => {
    const fmt = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 });
    return (n: number) => fmt.format(n);
  }, [locale, currency]);

  const maxSave = useMemo(
    () =>
      Math.max(
        0,
        ...plans.map((p) => (p.monthlyPrice > 0 ? Math.round((1 - p.yearlyPrice / p.monthlyPrice) * 100) : 0)),
      ),
    [plans],
  );
  const pill = saveLabel ?? (maxSave > 0 ? `Save up to ${maxSave}%` : "");

  const choosePeriod = (next: BillingPeriod) => {
    if (locked || next === period) return;
    setPeriod(next);
    setSelected(null);
    onPeriodChange?.(next);
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % PERIODS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + PERIODS.length) % PERIODS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = PERIODS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    choosePeriod(PERIODS[next].id);
    radios.current[next]?.focus();
  };

  const yearly = period === "yearly";

  return (
    <section
      aria-labelledby={labelId}
      aria-busy={loading}
      style={{ fontFamily: "var(--font-lexend)" }}
      className={`${className} ptg-root w-full max-w-[960px] rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 text-white shadow-[0_30px_80px_-30px_rgba(99,102,241,.5)] backdrop-blur-xl sm:p-8`}
    >
      <style>{`
        @media (prefers-reduced-motion: reduce) { .ptg-root *, .ptg-root { transition-duration: 1ms !important; animation: none !important; } }
      `}</style>

      <header className="mx-auto max-w-xl text-center">
        <h2 id={labelId} className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 text-sm text-white/75 sm:text-base">{subtitle}</p>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <div
            role="radiogroup"
            aria-label="Billing period"
            className="relative grid w-full max-w-[260px] grid-cols-2 rounded-full border border-white/15 bg-white/10 p-1"
          >
            <span
              aria-hidden
              className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 shadow-[0_6px_20px_-4px_rgba(168,85,247,.7)] transition-transform duration-300 ease-[cubic-bezier(.34,1.35,.64,1)] ${
                yearly ? "translate-x-full" : ""
              }`}
            />
            {PERIODS.map((p, i) => {
              const on = p.id === period;
              return (
                <button
                  key={p.id}
                  ref={(el) => {
                    radios.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  disabled={locked}
                  onClick={() => choosePeriod(p.id)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  className={`relative z-10 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:opacity-60 ${
                    on ? "text-white" : "text-white/80 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          {pill && (
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                yearly
                  ? "border-emerald-300/40 bg-emerald-400/20 text-emerald-100"
                  : "border-white/15 bg-white/5 text-white/80"
              }`}
            >
              {pill}
            </span>
          )}
        </div>
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {loading
          ? [0, 1, 2].map((i) => (
              <div key={i} aria-hidden className="h-[360px] animate-pulse rounded-3xl border border-white/10 bg-white/[0.05]" />
            ))
          : plans.map((plan) => {
              const monthly = yearly ? plan.yearlyPrice : plan.monthlyPrice;
              const free = plan.monthlyPrice === 0 && plan.yearlyPrice === 0;
              const isSel = selected === plan.id;
              const off = disabled || plan.disabled;
              return (
                <article
                  key={plan.id}
                  className={`relative flex flex-col rounded-3xl p-5 transition-transform duration-300 ${
                    plan.highlighted
                      ? "bg-gradient-to-b from-indigo-500/25 to-fuchsia-500/15 ring-2 ring-fuchsia-400/70 md:-translate-y-2"
                      : "border border-white/10 bg-white/[0.05]"
                  }`}
                >
                  <div className="flex min-h-6 items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    {plan.badge && (
                      <span className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-2.5 py-0.5 text-[11px] font-semibold">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  {plan.description && <p className="mt-1 text-sm text-white/75">{plan.description}</p>}

                  <div className="mt-4 flex items-baseline gap-1">
                    {free ? (
                      <span className="text-4xl font-bold">Free</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold">
                          <Price amount={monthly} format={format} />
                        </span>
                        <span className="text-sm text-white/75">/ month</span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 min-h-5 text-xs text-white/70">
                    {!free && yearly ? `Billed ${format(plan.yearlyPrice * 12)} per year` : free ? "No card needed" : "Billed monthly"}
                  </p>

                  <ul className="mt-4 flex-1 space-y-2 text-sm text-white/85">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" fill="currentColor">
                          <path d="M8.1 14.2 4.4 10.5l1.4-1.4 2.3 2.3 6-6 1.4 1.4z" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    disabled={locked || off}
                    aria-pressed={isSel}
                    onClick={() => {
                      setSelected(plan.id);
                      onSelect?.(plan, period);
                    }}
                    className={`mt-5 rounded-full px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50 ${
                      isSel
                        ? "bg-emerald-400 text-slate-900"
                        : plan.highlighted
                          ? "bg-white text-slate-900 hover:bg-white/90"
                          : "border border-white/25 bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {isSel ? "Selected" : (plan.ctaLabel ?? "Choose plan")}
                  </button>
                </article>
              );
            })}
      </div>
    </section>
  );
}
