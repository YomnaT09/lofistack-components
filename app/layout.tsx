import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import "./globals.css";

// Lexend (SIL Open Font License, see src/fonts/OFL.txt). Used by the gallery components.
const lexend = localFont({
  src: "../src/fonts/Lexend-Variable.ttf",
  variable: "--font-lexend",
  weight: "100 900",
  fallback: ["system-ui", "sans-serif"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LofiStack Component Gallery",
  description: "A growing gallery of UI components, one direct link each.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={lexend.variable}>
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0b12]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
            <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-300">
              <span aria-hidden className="h-3.5 w-3.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500 shadow-[0_0_14px_rgba(129,140,248,.9)]" />
              LofiStack Gallery
            </Link>
            <span className="hidden rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/75 sm:inline">90 day build challenge</span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
