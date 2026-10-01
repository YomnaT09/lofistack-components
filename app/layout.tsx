import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "LofiStack Component Gallery",
  description: "A growing gallery of UI components, one direct link each.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
