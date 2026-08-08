import Link from "next/link";
import { getCommandFeatureFlagsOverview } from "@dg/platform-core";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";
import { FeatureFlagsAdmin } from "@/components/command/FeatureFlagsAdmin";

export default async function CommandFlagsPage() {
  const data = process.env.DATABASE_URL
    ? await getCommandFeatureFlagsOverview()
    : null;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Feature flags</h1>
        <p className="mt-1 text-sm text-slate-400">
          Cross-tenant rollout controls stored on organisation settings.
        </p>
      </header>
      <main className="flex-1 space-y-8 p-6 md:p-8">
        <CommandCentreNav active="flags" />
        {!data ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Database not configured — flags unavailable.
          </div>
        ) : (
          <FeatureFlagsAdmin
            known={data.known}
            initialOrgs={data.orgs}
          />
        )}
      </main>
    </>
  );
}
