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
        <header className="border-b border-white/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-semibold tracking-tight">
              LofiStack Gallery
            </Link>
            <span className="text-sm text-white/50">90 day build challenge</span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
