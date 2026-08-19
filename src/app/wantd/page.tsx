import type { Metadata } from "next";
import Link from "next/link";
import { WANTD_HERO_PROMPT, WANTD_SUPPORTING } from "@dg/platform-core";

import { WantdHomeSearch } from "@/components/wantd/WantdHomeSearch";

export const metadata: Metadata = {
  title: "Wantd — Tell us what you want",
  description:
    "Demand-first marketplace. Tell Wantd what you want — we’ll help you find it. Property first.",
};

export default function WantdHomePage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 pb-20 pt-6">
      <h1 className="wantd-display text-center text-5xl font-extrabold tracking-tight text-[var(--wantd-black)] sm:text-6xl md:text-7xl">
        {WANTD_HERO_PROMPT}
      </h1>
      <p className="wantd-muted mx-auto mt-4 max-w-md text-center text-base sm:text-lg">
        Looking for property? Start with what you want. {WANTD_SUPPORTING}
      </p>
      <div className="mt-10 w-full max-w-2xl">
        <WantdHomeSearch />
      </div>
      <p className="mt-6 text-center text-sm">
        <Link href="/wantd/property" className="font-semibold text-[var(--wantd-ink)] underline-offset-4 hover:underline">
          See how it works
        </Link>
      </p>
    </main>
  );
}
