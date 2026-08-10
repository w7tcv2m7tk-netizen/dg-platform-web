import type { Metadata } from "next";
import Link from "next/link";
import {
  WANTD_CATEGORIES,
  WANTD_HERO_PROMPT,
  WANTD_TAGLINE,
} from "@dg/platform-core";

import { WantdHomeSearch } from "@/components/wantd/WantdHomeSearch";

export const metadata: Metadata = {
  title: "Wantd — Tell the marketplace what you WANT",
  description:
    "Demand-first marketplace. Search listings or post what you’re looking for — Wantd matches supply to your Want.",
};

export default function WantdHomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-14 sm:pt-20">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-[var(--wantd-gold)]">
        Marketplace
      </p>
      <h1 className="wantd-display mt-4 text-center text-4xl font-semibold tracking-tight text-[var(--wantd-black)] sm:text-5xl md:text-6xl">
        {WANTD_HERO_PROMPT}
      </h1>
      <p className="wantd-muted mx-auto mt-4 max-w-xl text-center text-base sm:text-lg">
        {WANTD_TAGLINE} Search supply — or post a Want and let the right sellers find you.
      </p>

      <div className="mx-auto mt-10 max-w-2xl">
        <WantdHomeSearch />
      </div>

      <section className="mt-14" aria-label="Categories">
        <h2 className="sr-only">Browse categories</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {WANTD_CATEGORIES.map((cat) => (
            <li key={cat.id}>
              <Link
                href={cat.href}
                className="wantd-category flex min-h-[4.5rem] items-center justify-center rounded-xl px-3 py-4 text-center text-sm font-semibold"
              >
                {cat.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12 flex justify-center">
        <Link
          href="/wantd/property"
          className="wantd-btn-wanted inline-flex items-center gap-2 rounded-xl px-6 py-4 text-sm shadow-sm"
        >
          <span aria-hidden>+</span> Post what you&apos;re looking for
        </Link>
      </div>

      <p className="wantd-muted mt-16 text-center text-xs">
        Property Wants live today · more categories rolling out ·{" "}
        <a
          href="https://wantdproperty.com.au"
          className="text-[var(--wantd-tan)] hover:text-[var(--wantd-gold)]"
        >
          wantdproperty.com.au
        </a>
      </p>
    </main>
  );
}
