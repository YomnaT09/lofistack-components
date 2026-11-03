// Look of the gallery home page (Pixel Quest). Only class names live here.
export type GalleryVariant = "pixel";

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

const PIXEL = "font-[family-name:var(--font-pixel)]";
const PIXEL_BODY = "font-[family-name:var(--font-pixel-body)]";

export const THEMES: Record<GalleryVariant, GalleryTheme> = {
  pixel: {
    root: `${PIXEL_BODY} text-white`,
    eyebrow: "",
    title: ["LOFISTACK", "QUEST"],
    titleA: `${PIXEL} pq-title`,
    titleB: `${PIXEL} pq-title`,
    lead: "pq-outline text-white",
    primary: `${PIXEL} pq-press bg-pq-coin text-pq-ink text-xs`,
    secondary: `${PIXEL} pq-press bg-pq-card text-pq-card-ink text-xs`,
    stat: "",
    statValue: `${PIXEL} pq-outline text-white`,
    statLabel: `${PIXEL} pq-outline text-white`,
    track: "",
    fill: "",
    h2: `${PIXEL} pq-outline text-white`,
    chipOn: `${PIXEL} pq-press bg-pq-coin text-pq-ink`,
    chipOff: `${PIXEL} pq-press bg-pq-card text-pq-card-ink`,
    chipCount: ["text-pq-ink/70", "text-pq-label"],
    search: `${PIXEL_BODY} pq-press bg-pq-card text-pq-card-ink placeholder:text-pq-label text-base`,
    muted: `${PIXEL} pq-outline text-white`,
    card: "pq-box bg-pq-card text-pq-card-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[10px_10px_0_rgb(var(--pq-ink))]",
    cardTitle: `${PIXEL_BODY} text-pq-card-ink`,
    cardDesc: `${PIXEL_BODY} text-pq-card-ink/80`,
    cardFoot: `${PIXEL} border-pq-ink/25 text-pq-label`,
    cardLink: `${PIXEL} text-pq-coin-dark`,
    stage: "bg-[#fff1cf] border-b-4 border-pq-ink",
    stageGrid: "bg-[linear-gradient(rgb(26_26_46/.06)_1px,transparent_1px),linear-gradient(90deg,rgb(26_26_46/.06)_1px,transparent_1px)] [background-size:16px_16px]",
    num: `${PIXEL} bg-pq-coin text-pq-ink border-2 border-pq-ink`,
    badge: `${PIXEL} border-2 border-pq-ink bg-white text-pq-card-ink uppercase text-[9px]`,
    footer: `${PIXEL} border-pq-ink bg-pq-ink text-white text-[10px]`,
    footerLink: "text-pq-coin",
    header: "",
    headerPill: "",
    emptyBox: `${PIXEL_BODY} pq-box bg-pq-card text-pq-card-ink`,
    clear: "text-pq-coin-dark",
    focus: "focus-visible:outline-pq-coin",
  },
};
