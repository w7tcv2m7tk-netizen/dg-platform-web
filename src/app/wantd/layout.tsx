import { Fraunces, Source_Sans_3 } from "next/font/google";
import Link from "next/link";

import "./wantd.css";

const wantdDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-wantd-display",
  display: "swap",
});

const wantdSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-wantd-sans",
  display: "swap",
});

export default function WantdLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`wantd-root wantd-theme-light ${wantdDisplay.variable} ${wantdSans.variable}`}
    >
      <header className="wantd-header">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link
            href="/wantd"
            className="wantd-display text-xl font-semibold tracking-[0.18em] text-[var(--wantd-cream)]"
          >
            WANTD
          </Link>
          <nav className="flex flex-wrap items-center gap-5" aria-label="Wantd">
            <Link href="/wantd?intent=buy" className="wantd-nav-link">
              Buy
            </Link>
            <Link href="/wantd?intent=sell" className="wantd-nav-link">
              Sell
            </Link>
            <Link href="/wantd?intent=find" className="wantd-nav-link">
              Find
            </Link>
            <Link
              href="/wantd/property"
              className="wantd-btn-wanted rounded-md px-3.5 py-2 text-xs"
            >
              Wanted
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
