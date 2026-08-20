import { Outfit, Syne } from "next/font/google";
import type { Metadata } from "next";
import Link from "next/link";

import { WantdIcon, WantdWordmark } from "@/components/websites/WantdPublicArt";
import { publicSiteIcons } from "@/lib/brand";
import { getPublicSiteBrand } from "@dg/platform-core";

import "./wantd.css";

const wantdDisplay = Syne({
  subsets: ["latin"],
  variable: "--font-wantd-display",
  display: "swap",
  weight: ["700", "800"],
});

const wantdSans = Outfit({
  subsets: ["latin"],
  variable: "--font-wantd-sans",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getPublicSiteBrand("wantd");
  return {
    title: "Wantd",
    applicationName: "Wantd",
    appleWebApp: {
      capable: true,
      title: "Wantd",
      statusBarStyle: "default",
    },
    icons: publicSiteIcons("wantd", brand?.iconUrl),
  };
}

export default function WantdLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`wantd-root wantd-theme-light ${wantdDisplay.variable} ${wantdSans.variable}`}
    >
      <header className="wantd-header">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-6">
          <Link href="/wantd" aria-label="wantd">
            <WantdWordmark className="wantd-wordmark" />
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-5" aria-label="Wantd">
            <Link href="/wantd/property" className="wantd-nav-link">
              Tell us what you want
            </Link>
            <Link href="/wantd/property" className="wantd-nav-link">
              Property
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="wantd-footer">
        <Link href="/wantd" className="wantd-footer-icon" aria-label="wantd">
          <WantdIcon />
        </Link>
        <p className="wantd-muted text-xs">© {new Date().getFullYear()} Wantd</p>
      </footer>
    </div>
  );
}
