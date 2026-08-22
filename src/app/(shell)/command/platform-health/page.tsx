import Link from "next/link";
import { getPlatformAlertsCentre } from "@dg/platform-core";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";
import { PlatformAlertsDashboard } from "@/components/command/PlatformAlertsDashboard";

export default async function CommandPlatformAlertsPage() {
  const data = process.env.DATABASE_URL ? await getPlatformAlertsCentre() : null;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-rose-400/90">
          DigitalGate · Platform Operations
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Platform Alerts</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Platform health and issues requiring DigitalGate staff attention — distinct from customer
          business alerts inside each organisation.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommandCentreNav active="health" />
        {!data ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Database not configured — platform alerts unavailable.
          </div>
        ) : (
          <PlatformAlertsDashboard data={data} />
        )}
      </main>
    </>
  );
}
