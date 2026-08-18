import Link from "next/link";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";
import { Gate1DogfoodChecklist } from "@/components/command/Gate1DogfoodChecklist";

export default function CommandGate1Page() {
  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/90">
          Internal Alpha
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Gate 1 — close before Founding 10</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Dogfood Roe + CVH, smoke ops, punch list P0/P1 only. Active Founding outreach stays closed
          until this is ticked. Audience and founder content can run in parallel.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommandCentreNav active="gate1" />
        <Gate1DogfoodChecklist />
      </main>
    </>
  );
}
