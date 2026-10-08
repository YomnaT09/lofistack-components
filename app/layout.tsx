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
        <header className="sticky top-0 z-40 border-b border-acc1/40 bg-[#05050c]/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
            <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-300">
              <span aria-hidden className="h-3.5 w-3.5 rounded-full bg-gradient-to-br from-acc1 to-acc2 shadow-[0_0_14px_rgb(var(--acc1)/.9)]" />
              LofiStack Gallery
            </Link>
            <span className="hidden rounded-sm border border-acc2/60 px-3 py-1 font-mono text-xs uppercase text-acc2-soft sm:inline">90 day build challenge</span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
