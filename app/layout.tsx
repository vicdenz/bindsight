import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "BindSight",
  description: "Evidence-backed underwriting triage",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">BindSight</Link>
          <span>Underwriting triage</span>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
