import Link from "next/link";

import { ConnectedServicesCatalog } from "@/components/settings/ConnectedServicesCatalog";
import { ConnectedServicesHealthOverview } from "@/components/settings/ConnectedServicesHealthOverview";
import { GoogleBusinessProfileLocationSelector } from "@/components/settings/GoogleBusinessProfileLocationSelector";
import { YouTubeConnectorPanel } from "@/components/settings/YouTubeConnectorPanel";
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
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">Integration Hub</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Connected Services</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Connect the systems {session.organisationName} already uses. DigitalGate brings authorised data and workflows together without forcing you to replace specialist software that still works.
        </p>
      </header>
      <main className="dg-page-main max-w-4xl space-y-6">
        <ConnectedServicesHealthOverview />

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="dg-card">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Connected business</p>
            <p className="mt-2 text-lg font-semibold text-white">One operating layer</p>
            <p className="mt-1 text-xs text-slate-400">Connected services can enrich Business Brain, Advisor, Analytics and automation where authorised.</p>
          </div>
          <div className="dg-card">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Organisation safe</p>
            <p className="mt-2 text-lg font-semibold text-white">Resources stay separated</p>
            <p className="mt-1 text-xs text-slate-400">A provider login does not automatically assign every account, page, location or property to this organisation.</p>
          </div>
          <div className="dg-card">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Capability truth</p>
            <p className="mt-2 text-lg font-semibold text-white">Clear connection states</p>
            <p className="mt-1 text-xs text-slate-400">Available services are distinguished from connections that are still planned or require configuration.</p>
          </div>
        </section>

        {googleFlash === "connected" ? (
          <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 px-4 py-4 text-sm text-emerald-100">
            <p>Google Business Profile connected.</p>
            <p className="mt-1 text-xs text-emerald-100/70">Choose the Business Profile locations for this organisation below. Only selected locations feed its reviews, Reputation and business intelligence.</p>
          </div>
        ) : null}
        {googleFlash === "error" ? (
          <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 px-4 py-4 text-sm text-amber-100">
            <p>Google connect failed{flashMessage ? `: ${flashMessage}` : "."}</p>
            <p className="mt-1 text-xs text-amber-100/70">You can retry the connection now. If it still fails, Advisor can guide you without needing connector or API knowledge.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <ResolutionAction href="/api/connectors/google/connect?returnTo=/dashboard/settings/connected-services" mode="guided" label="Try Google again" />
              <ResolutionAction href="/dashboard/advisor" mode="guided" label="Help me connect it" />
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Connection status and resource assignments are scoped to {session.organisationName}.</p>
          <Link href="/dashboard/settings/connected-services" className="inline-flex min-h-11 items-center text-sm font-medium text-sky-400 hover:underline">Refresh statuses →</Link>
        </div>

        <GoogleBusinessProfileLocationSelector />
        <YouTubeConnectorPanel />
        <ConnectedServicesCatalog />

        <div className="rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-3 text-sm text-slate-400">
          Not sure which service to connect or why something is not syncing?{" "}
          <Link href="/dashboard/advisor" className="font-medium text-sky-400 hover:underline">Ask AI Advisor for help →</Link>
        </div>
      </main>
    </>
  );
}
