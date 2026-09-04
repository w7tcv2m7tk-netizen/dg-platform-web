import Link from "next/link";

import { FoundingResellerBriefingRunSheet } from "@/components/command/FoundingResellerBriefingRunSheet";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

export default async function PartnerBriefingPage() {
  await requirePlatformOperatorContext();
  return (
    <>
      <header className="dg-page-header">
        <Link href="/command/partners" className="text-sm text-sky-400 hover:underline">
          ← Partner Operating System
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
          Partner Briefing
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Monday Partner Briefing</h1>
        <p className="mt-1 text-sm text-slate-400">
          Founding Acquisition Partner meeting run-sheet — for Ben. Partners see the playbook at
          /partner/playbook.
        </p>
      </header>
      <main className="dg-page-main">
        <FoundingResellerBriefingRunSheet />
      </main>
    </>
  );
}
