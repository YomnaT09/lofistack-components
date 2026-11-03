import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import "./globals.css";
import ThemeToggle from "./theme-toggle";

// Lexend (SIL Open Font License, see src/fonts/OFL.txt). Used by the gallery components.
const lexend = localFont({
  src: "../src/fonts/Lexend-Variable.ttf",
  variable: "--font-lexend",
  weight: "100 900",
  fallback: ["system-ui", "sans-serif"],
  display: "swap",
});

// Pixel fonts for the Pixel Quest home page (SIL Open Font License, see src/fonts/OFL.txt).
const pressStart = localFont({
  src: "../src/fonts/PressStart2P-Regular.woff2",
  variable: "--font-press-start",
  weight: "400",
  fallback: ["ui-monospace", "monospace"],
  display: "swap",
});
const pixelify = localFont({
  src: "../src/fonts/PixelifySans-Variable.woff2",
  variable: "--font-pixelify",
  weight: "400 700",
  fallback: ["ui-monospace", "monospace"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LofiStack Component Gallery",
  description: "A growing gallery of UI components, one direct link each.",
};

// Runs before paint so a saved "Night" choice never flashes the day sky first.
const NO_FLASH = `try{if(localStorage.getItem("lofistack-theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lexend.variable} ${pressStart.variable} ${pixelify.variable}`} data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-40 border-b-4 border-pq-ink bg-pq-ink text-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-3 font-[family-name:var(--font-pixel)] text-[11px] leading-none tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pq-coin sm:text-xs">
              <span aria-hidden className="grid h-5 w-5 place-items-center border-2 border-white bg-pq-coin text-[9px] text-pq-ink">L</span>
              LOFISTACK
            </Link>
            <div className="flex items-center gap-3">
              <span className="hidden font-[family-name:var(--font-pixel)] text-[10px] uppercase text-pq-coin md:inline">90 day build challenge</span>
              <ThemeToggle />
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
