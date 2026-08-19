import type { Metadata } from "next";
import Link from "next/link";

import { WantdPropertyWantForm } from "@/components/wantd/WantdPropertyWantForm";

export const metadata: Metadata = {
  title: "Post a property Want | Wantd",
  description:
    "Demand-first property matching — describe what you want and Wantd finds relevant supply.",
};

/** Public MVP capture — also available on wantd.co.nz /post-a-want. */
export default function WantdPropertyWantPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--wantd-gold)]">
        Property
      </p>
      <h1 className="wantd-display mt-3 text-3xl font-semibold tracking-tight text-[var(--wantd-black)] sm:text-4xl">
        Tell us what property you want.
      </h1>
      <p className="wantd-muted mt-3 text-base">
        Buyers lead. Suppliers respond. Skip endless scrolling — describe the home, acreage, or
        investment you want and we match relevant supply.
      </p>
      <div className="wantd-card mt-10 rounded-2xl p-5 sm:p-7">
        <WantdPropertyWantForm />
      </div>
      <p className="wantd-muted mt-8 text-center text-xs">
        <Link href="/wantd" className="text-[var(--wantd-tan)] hover:text-[var(--wantd-gold)]">
          ← Wantd home
        </Link>
        {" · "}
        Powered by DigitalGate ·{" "}
        <a
          href="https://wantd.co.nz"
          className="text-[var(--wantd-tan)] hover:text-[var(--wantd-gold)]"
        >
          wantd.co.nz
        </a>
      </p>
    </main>
  );
}
