// Look of the gallery home page (Neon Arcade). Only class names live here.
export type GalleryVariant = "neon";

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
};
