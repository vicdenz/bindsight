import type { Metadata } from "next";
import { Commissioner, Petrona } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

const commissioner = Commissioner({
  subsets: ["latin"],
  variable: "--font-work",
  display: "swap",
});

const petrona = Petrona({
  subsets: ["latin"],
  variable: "--font-editorial",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BindSight",
    template: "%s | BindSight",
  },
  description: "Evidence-backed underwriting triage",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${commissioner.variable} ${petrona.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">Skip to underwriting workspace</a>
        <div className="app-frame">
          <header className="site-header">
            <Link href="/" className="brand" aria-label="BindSight decision queue">
              <span>BindSight</span>
              <small>Underwriting workbench</small>
            </Link>
            <nav className="primary-nav" aria-label="Primary navigation">
              <Link href="/">Decision queue</Link>
              <Link href="/appetite">Appetite Studio</Link>
            </nav>
            <p className="rail-note">Evidence in.<br />Decisions made legible.</p>
          </header>
          <main id="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
