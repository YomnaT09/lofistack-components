import { notFound } from "next/navigation";
import GalleryPage from "../../gallery-page";

// Colour pairs to compare for the Neon look. Values are space-separated RGB.
const PALETTES: Record<string, { label: string; acc1: string; acc1Soft: string; acc2: string; acc2Soft: string; on: string }> = {
  lime: { label: "Cyan and Lime", acc1: "34 211 238", acc1Soft: "165 243 252", acc2: "163 230 53", acc2Soft: "217 249 157", on: "15 23 42" },
  violet: { label: "Cyan and Violet", acc1: "34 211 238", acc1Soft: "165 243 252", acc2: "139 92 246", acc2Soft: "221 214 254", on: "255 255 255" },
  amber: { label: "Amber and Teal", acc1: "251 191 36", acc1Soft: "253 230 138", acc2: "45 212 191", acc2Soft: "153 246 228", on: "15 23 42" },
  emerald: { label: "Emerald and Gold", acc1: "52 211 153", acc1Soft: "167 243 208", acc2: "250 204 21", acc2Soft: "254 240 138", on: "15 23 42" },
  blue: { label: "Blue and Orange", acc1: "96 165 250", acc1Soft: "191 219 254", acc2: "251 146 60", acc2Soft: "254 215 170", on: "15 23 42" },
};

export function generateStaticParams() {
  return Object.keys(PALETTES).map((palette) => ({ palette }));
}

export default async function Page({ params }: { params: Promise<{ palette: string }> }) {
  const { palette } = await params;
  const p = PALETTES[palette];
  if (!p) notFound();
  return (
    <>
      <style>{`:root { --acc1: ${p.acc1}; --acc1-soft: ${p.acc1Soft}; --acc2: ${p.acc2}; --acc2-soft: ${p.acc2Soft}; --on-acc2: ${p.on}; }`}</style>
      <GalleryPage />
    </>
  );
}
