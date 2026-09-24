import Link from "next/link";

import { ConnectedServicesCatalog } from "@/components/settings/ConnectedServicesCatalog";
import { ConnectedServicesHealthOverview } from "@/components/settings/ConnectedServicesHealthOverview";
import { GoogleAdsConnectorPanel } from "@/components/settings/GoogleAdsConnectorPanel";
import { GoogleBusinessProfileLocationSelector } from "@/components/settings/GoogleBusinessProfileLocationSelector";
import { LinkedInConnectorPanel } from "@/components/settings/LinkedInConnectorPanel";
import { MetaConnectorPanel } from "@/components/settings/MetaConnectorPanel";
import { MicrosoftAdsConnectorPanel } from "@/components/settings/MicrosoftAdsConnectorPanel";
import { TikTokAdsConnectorPanel } from "@/components/settings/TikTokAdsConnectorPanel";
import { YouTubeConnectorPanel } from "@/components/settings/YouTubeConnectorPanel";
import { ResolutionAction } from "@/components/ui/ResolutionAction";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function ConnectedServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string; linkedin?: string; meta?: string; message?: string }>;
}) {
  const { google: googleFlash, linkedin: linkedinFlash, meta: metaFlash, message: flashMessage } = await searchParams;
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
        <section className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.05] px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">Connect what matters first</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Build a stronger Business Brain from the systems you already use</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Start with the services that hold your customer, marketing and communications signals. DigitalGate will recommend connections for this organisation and keep optional integrations out of the way until they are useful.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-slate-700 bg-slate-950/40 px-3 py-1.5">1 · Connect a service</span>
            <span className="rounded-full border border-slate-700 bg-slate-950/40 px-3 py-1.5">2 · Choose the right business resources</span>
            <span className="rounded-full border border-slate-700 bg-slate-950/40 px-3 py-1.5">3 · Aida uses authorised evidence</span>
          </div>
        </section>

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
        <GoogleAdsConnectorPanel />
        <MicrosoftAdsConnectorPanel />
        <TikTokAdsConnectorPanel />
        <MetaConnectorPanel flash={metaFlash === "connected" ? "connected" : metaFlash === "attention" ? "attention" : metaFlash === "error" ? "error" : null} flashMessage={metaFlash ? flashMessage ?? null : null} />
        <LinkedInConnectorPanel flash={linkedinFlash === "connected" ? "connected" : linkedinFlash === "attention" ? "attention" : linkedinFlash === "error" ? "error" : null} flashMessage={linkedinFlash ? flashMessage ?? null : null} />
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
