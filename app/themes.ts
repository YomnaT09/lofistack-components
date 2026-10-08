// Three looks for the gallery home page. Only class names live here, so one set of components can wear any of them.
export type GalleryVariant = "aurora" | "neon" | "paper";

export interface GalleryTheme {
  root: string;
  eyebrow: string;
  title: [string, string];
  titleA: string;
  titleB: string;
  lead: string;
  primary: string;
  secondary: string;
  stat: string;
  statValue: string;
  statLabel: string;
  track: string;
  fill: string;
  h2: string;
  chipOn: string;
  chipOff: string;
  chipCount: [string, string]; // [on, off]
  search: string;
  muted: string;
  card: string;
  cardTitle: string;
  cardDesc: string;
  cardFoot: string;
  cardLink: string;
  stage: string;
  stageGrid: string;
  num: string;
  badge: string;
  footer: string;
  footerLink: string;
  header: string;
  headerPill: string;
  emptyBox: string;
  clear: string;
  focus: string;
}

export const THEMES: Record<GalleryVariant, GalleryTheme> = {
  aurora: {
    root: "text-white",
    eyebrow: "border border-white/15 bg-white/5 text-white/80 backdrop-blur",
    title: ["Interactive UI components,", "built by hand."],
    titleA: "bg-gradient-to-r from-white via-indigo-200 to-fuchsia-300 bg-clip-text text-transparent",
    titleB: "text-white/90",
    lead: "text-white/75",
    primary: "bg-gradient-to-r from-indigo-400 to-fuchsia-400 text-slate-950 shadow-[0_12px_40px_-10px_rgba(168,85,247,.8)] hover:brightness-110 rounded-full",
    secondary: "border border-white/25 bg-white/5 text-white hover:bg-white/10 rounded-full",
    stat: "rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur",
    statValue: "text-white",
    statLabel: "text-white/75",
    track: "bg-white/10",
    fill: "bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300",
    h2: "text-white",
    chipOn: "border-white bg-white text-slate-900",
    chipOff: "border-white/15 bg-white/5 text-white/80 hover:bg-white/10",
    chipCount: ["text-slate-600", "text-white/60"],
    search: "rounded-full border border-white/15 bg-white/5 text-white placeholder:text-white/60",
    muted: "text-white/70",
    card: "rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] hover:-translate-y-1.5 hover:border-indigo-300/50 hover:shadow-[0_28px_70px_-24px_rgba(129,140,248,.65)]",
    cardTitle: "text-white",
    cardDesc: "text-white/70",
    cardFoot: "border-white/10 text-white/65",
    cardLink: "text-indigo-300",
    stage: "rounded-2xl bg-[radial-gradient(ellipse_at_top,#2d2670_0%,#0b0b1c_72%)]",
    stageGrid: "bg-[radial-gradient(rgba(255,255,255,.09)_1px,transparent_1px)] [background-size:18px_18px]",
    num: "bg-black/40 text-white/80 backdrop-blur rounded-full",
    badge: "",
    footer: "border-white/10 text-white/65",
    footerLink: "text-indigo-300",
    header: "",
    headerPill: "",
    emptyBox: "border-white/20 text-white/75",
    clear: "text-indigo-300",
    focus: "focus-visible:outline-indigo-300",
  },
  neon: {
    root: "bg-[#05050c] text-cyan-50",
    eyebrow: "border border-cyan-400/60 bg-cyan-400/10 font-mono uppercase tracking-widest text-cyan-200 rounded-md",
    title: ["Component", "Arcade"],
    titleA: "uppercase tracking-tight text-cyan-300 [text-shadow:0_0_24px_rgba(34,211,238,.7)]",
    titleB: "uppercase tracking-tight text-pink-400 [text-shadow:0_0_24px_rgba(244,114,182,.7)]",
    lead: "font-mono text-cyan-100/80",
    primary: "bg-pink-500 text-white shadow-[0_0_30px_-4px_rgba(236,72,153,.9)] hover:bg-pink-400 rounded-md uppercase tracking-wider font-mono",
    secondary: "border-2 border-cyan-400 text-cyan-200 hover:bg-cyan-400/10 rounded-md uppercase tracking-wider font-mono",
    stat: "rounded-lg border-2 border-cyan-400/50 bg-black/60 shadow-[0_0_24px_-10px_rgba(34,211,238,.8)]",
    statValue: "text-pink-300 font-mono",
    statLabel: "text-cyan-100/80 font-mono uppercase text-xs tracking-wider",
    track: "bg-cyan-400/10 rounded-sm",
    fill: "bg-gradient-to-r from-cyan-400 to-pink-500 rounded-sm",
    h2: "font-mono uppercase tracking-widest text-cyan-200",
    chipOn: "border-pink-400 bg-pink-500 text-white rounded-md font-mono uppercase tracking-wider",
    chipOff: "border-cyan-400/50 bg-black/50 text-cyan-100 hover:bg-cyan-400/10 rounded-md font-mono uppercase tracking-wider",
    chipCount: ["text-pink-100", "text-cyan-200/70"],
    search: "rounded-md border-2 border-cyan-400/50 bg-black/60 font-mono text-cyan-50 placeholder:text-cyan-200/60",
    muted: "text-cyan-100/70 font-mono",
    card: "rounded-xl border-2 border-cyan-400/60 bg-black/60 shadow-[0_0_0_1px_rgba(236,72,153,.35),0_0_30px_-10px_rgba(34,211,238,.7)] hover:-translate-y-1 hover:border-pink-400 hover:shadow-[0_0_0_1px_rgba(236,72,153,.8),0_0_44px_-6px_rgba(236,72,153,.75)]",
    cardTitle: "text-cyan-50 uppercase tracking-wide",
    cardDesc: "text-cyan-100/75",
    cardFoot: "border-cyan-400/30 text-cyan-200/75 font-mono uppercase",
    cardLink: "text-pink-300 font-mono",
    stage: "rounded-lg bg-[#0a0820]",
    stageGrid: "bg-[linear-gradient(rgba(34,211,238,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.12)_1px,transparent_1px)] [background-size:22px_22px]",
    num: "bg-pink-500 text-white font-mono rounded-sm",
    badge: "border-cyan-300 bg-cyan-400/10 text-cyan-200 font-mono uppercase rounded-sm",
    footer: "border-cyan-400/30 text-cyan-200/75 font-mono",
    footerLink: "text-pink-300",
    header: "border-cyan-400/40 bg-[#05050c]/90 text-cyan-50",
    headerPill: "border-pink-400/60 text-pink-200 font-mono uppercase rounded-sm",
    emptyBox: "border-cyan-400/40 text-cyan-100 font-mono",
    clear: "text-pink-300",
    focus: "focus-visible:outline-pink-400",
  },
  paper: {
    root: "bg-[#f6f2ff] text-slate-800",
    eyebrow: "border border-violet-200 bg-white text-violet-700 shadow-sm rounded-full",
    title: ["A tidy shelf of", "hand-built components."],
    titleA: "text-slate-900",
    titleB: "bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent",
    lead: "text-slate-600",
    primary: "bg-violet-600 text-white shadow-[0_12px_30px_-10px_rgba(109,40,217,.7)] hover:bg-violet-500 rounded-full",
    secondary: "border border-violet-300 bg-white text-violet-700 hover:bg-violet-50 rounded-full",
    stat: "rounded-3xl border border-violet-100 bg-white shadow-[0_10px_40px_-18px_rgba(88,60,180,.35)]",
    statValue: "text-slate-900",
    statLabel: "text-slate-600",
    track: "bg-violet-100",
    fill: "bg-gradient-to-r from-violet-500 to-fuchsia-400",
    h2: "text-slate-900",
    chipOn: "border-violet-600 bg-violet-600 text-white",
    chipOff: "border-violet-200 bg-white text-slate-700 hover:bg-violet-50",
    chipCount: ["text-violet-100", "text-slate-500"],
    search: "rounded-full border border-violet-200 bg-white text-slate-800 placeholder:text-slate-500",
    muted: "text-slate-600",
    card: "rounded-[28px] border border-violet-100 bg-white shadow-[0_14px_44px_-20px_rgba(88,60,180,.4)] hover:-translate-y-1.5 hover:shadow-[0_26px_60px_-22px_rgba(88,60,180,.55)]",
    cardTitle: "text-slate-900",
    cardDesc: "text-slate-600",
    cardFoot: "border-violet-100 text-slate-500",
    cardLink: "text-violet-700",
    stage: "rounded-[20px] bg-[radial-gradient(ellipse_at_top,#2d2670_0%,#0b0b1c_75%)]",
    stageGrid: "bg-[radial-gradient(rgba(255,255,255,.09)_1px,transparent_1px)] [background-size:18px_18px]",
    num: "bg-white/90 text-violet-700 rounded-full",
    badge: "border-violet-200 bg-violet-50 text-violet-700",
    footer: "border-violet-200 text-slate-600",
    footerLink: "text-violet-700",
    header: "border-violet-100 bg-[#f6f2ff]/85 text-slate-900",
    headerPill: "border-violet-200 bg-white text-violet-700 rounded-full",
    emptyBox: "border-violet-300 text-slate-600",
    clear: "text-violet-700",
    focus: "focus-visible:outline-violet-600",
  },
};
