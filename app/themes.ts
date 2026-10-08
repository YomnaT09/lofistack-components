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
    root: "bg-[#05050c] text-acc1-soft",
    eyebrow: "border border-acc1/60 bg-acc1/10 font-mono uppercase tracking-widest text-acc1-soft rounded-md",
    title: ["Component", "Arcade"],
    titleA: "uppercase tracking-tight text-acc1 [text-shadow:0_0_24px_rgb(var(--acc1)/.7)]",
    titleB: "uppercase tracking-tight text-acc2 [text-shadow:0_0_24px_rgba(244,114,182,.7)]",
    lead: "font-mono text-acc1-soft/80",
    primary: "bg-acc2 text-[rgb(var(--on-acc2))] shadow-[0_0_30px_-4px_rgb(var(--acc2)/.9)] hover:bg-acc2 rounded-md uppercase tracking-wider font-mono",
    secondary: "border-2 border-acc1 text-acc1-soft hover:bg-acc1/10 rounded-md uppercase tracking-wider font-mono",
    stat: "rounded-lg border-2 border-acc1/50 bg-black/60 shadow-[0_0_24px_-10px_rgb(var(--acc1)/.8)]",
    statValue: "text-acc2 font-mono",
    statLabel: "text-acc1-soft/80 font-mono uppercase text-xs tracking-wider",
    track: "bg-acc1/10 rounded-sm",
    fill: "bg-gradient-to-r from-acc1 to-acc2 rounded-sm",
    h2: "font-mono uppercase tracking-widest text-acc1-soft",
    chipOn: "border-acc2 bg-acc2 text-[rgb(var(--on-acc2))] rounded-md font-mono uppercase tracking-wider",
    chipOff: "border-acc1/50 bg-black/50 text-acc1-soft hover:bg-acc1/10 rounded-md font-mono uppercase tracking-wider",
    chipCount: ["text-acc2-soft", "text-acc1-soft/70"],
    search: "rounded-md border-2 border-acc1/50 bg-black/60 font-mono text-acc1-soft placeholder:text-acc1-soft/60",
    muted: "text-acc1-soft/70 font-mono",
    card: "rounded-xl border-2 border-acc1/60 bg-black/60 shadow-[0_0_0_1px_rgb(var(--acc2)/.35),0_0_30px_-10px_rgb(var(--acc1)/.7)] hover:-translate-y-1 hover:border-acc2 hover:shadow-[0_0_0_1px_rgb(var(--acc2)/.8),0_0_44px_-6px_rgb(var(--acc2)/.75)]",
    cardTitle: "text-acc1-soft uppercase tracking-wide",
    cardDesc: "text-acc1-soft/75",
    cardFoot: "border-acc1/30 text-acc1-soft/75 font-mono uppercase",
    cardLink: "text-acc2 font-mono",
    stage: "rounded-lg bg-[#0a0820]",
    stageGrid: "bg-[linear-gradient(rgb(var(--acc1)/.12)_1px,transparent_1px),linear-gradient(90deg,rgb(var(--acc1)/.12)_1px,transparent_1px)] [background-size:22px_22px]",
    num: "bg-acc2 text-[rgb(var(--on-acc2))] font-mono rounded-sm",
    badge: "border-acc1 bg-acc1/10 text-acc1-soft font-mono uppercase rounded-sm",
    footer: "border-acc1/30 text-acc1-soft/75 font-mono",
    footerLink: "text-acc2",
    header: "border-acc1/40 bg-[#05050c]/90 text-acc1-soft",
    headerPill: "border-acc2/60 text-acc2-soft font-mono uppercase rounded-sm",
    emptyBox: "border-acc1/40 text-acc1-soft font-mono",
    clear: "text-acc2",
    focus: "focus-visible:outline-acc2",
  },
};
