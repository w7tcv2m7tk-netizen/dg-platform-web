import type { Metadata } from "next";
import Link from "next/link";

import { WantdPropertyWantForm } from "@/components/wantd/WantdPropertyWantForm";

export const metadata: Metadata = {
  title: "Tell us what you want | Wantd",
  description:
    "Demand-first property matching — tell Wantd what you want and we’ll help you find it.",
};

export default function WantdPropertyWantPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--wantd-ink-muted)]">
        Property
      </p>
      <h1 className="wantd-display mt-3 text-3xl font-semibold text-[var(--wantd-black)] sm:text-4xl">
        Tell us what you want.
      </h1>
      <p className="wantd-muted mt-3 text-base">
        A few short questions. Then we look. You don&apos;t scroll listings.
      </p>
      <div className="wantd-card mt-8 rounded-[1.35rem] p-5 sm:p-7">
        <WantdPropertyWantForm />
      </div>
      <p className="wantd-muted mt-8 text-center text-xs">
        <Link href="/wantd" className="hover:text-[var(--wantd-ink)]">
          ← Home
        </Link>
      </p>
    </main>
  );
}
