import Link from "next/link";

import { ConnectedServicesCatalog } from "@/components/settings/ConnectedServicesCatalog";
import { GoogleBusinessProfileLocationSelector } from "@/components/settings/GoogleBusinessProfileLocationSelector";
import { ResolutionAction } from "@/components/ui/ResolutionAction";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function ConnectedServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string; message?: string }>;
}) {
  const { google: googleFlash, message: flashMessage } = await searchParams;
  const { session } = await getPlatformPageContext();

  if (!session?.organisationId) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Connected Services</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-500">Sign in to continue.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="dg-page-header">
        <Link href="/dashboard/settings" className="text-sm text-sky-400 hover:underline">
          ← Settings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Connect your business</h1>
        <p className="mt-1 text-sm text-slate-400">
          Connect the systems you already use. DigitalGate brings them together so{" "}
          {session.organisationName} can operate as one connected system.
        </p>
      </header>
      <main className="dg-page-main max-w-2xl space-y-6">
        {googleFlash === "connected" ? (
          <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 px-4 py-4 text-sm text-emerald-100">
            <p>Google Business Profile connected.</p>
            <p className="mt-1 text-xs text-emerald-100/70">
              Choose the Business Profile locations for this organisation below. Only selected locations feed its reviews, Reputation and business intelligence.
            </p>
          </div>
        ) : null}
        {googleFlash === "error" ? (
          <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 px-4 py-4 text-sm text-amber-100">
            <p>Google connect failed{flashMessage ? `: ${flashMessage}` : "."}</p>
            <p className="mt-1 text-xs text-amber-100/70">
              You can retry the connection now. If it still fails, Advisor can guide you without needing connector or API knowledge.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <ResolutionAction
                href="/api/connectors/google/connect?returnTo=/dashboard/settings/connected-services"
                mode="guided"
                label="Try Google again"
              />
              <ResolutionAction href="/dashboard/advisor" mode="guided" label="Help me connect it" />
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Connection status and resource assignments are scoped to {session.organisationName}.
          </p>
          <Link
            href="/dashboard/settings/connected-services"
            className="inline-flex min-h-11 items-center text-sm font-medium text-sky-400 hover:underline"
          >
            Refresh statuses →
          </Link>
        </div>

        <GoogleBusinessProfileLocationSelector />
        <ConnectedServicesCatalog />

        <div className="rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-3 text-sm text-slate-400">
          Not sure which service to connect or why something is not syncing?{" "}
          <Link href="/dashboard/advisor" className="font-medium text-sky-400 hover:underline">
            Ask AI Advisor for help →
          </Link>
        </div>
      </main>
    </>
  );
}
