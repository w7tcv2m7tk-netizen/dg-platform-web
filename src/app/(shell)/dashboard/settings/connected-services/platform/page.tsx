import Link from "next/link";
import { notFound } from "next/navigation";

import { assertPlatformOperator } from "@digitalgate/platform-core/access/platform-operator-context";
import { bootConnectorEngine } from "@digitalgate/platform-core/connectors/framework/boot";
import { listConnectorCatalogForOrg, toConnectorHealth } from "@digitalgate/platform-core/connectors/framework/health";
import { getPlatformPageContext } from "@/lib/platform-page-context";

const STATE = {
  connected: { label: "Connected", dot: "bg-emerald-400", text: "text-emerald-300" },
  attention: { label: "Needs attention", dot: "bg-amber-400", text: "text-amber-300" },
  not_connected: { label: "Not connected", dot: "bg-red-400", text: "text-red-300" },
  available: { label: "Available", dot: "bg-slate-300", text: "text-slate-300" },
  planned: { label: "Planned", dot: "bg-slate-600", text: "text-slate-400" },
} as const;

type StateKey = keyof typeof STATE;

function platformState(item: any): StateKey {
  if (item.manifest.maturity === "planned") return "planned";
  const health = item.health;
  if (health?.status === "degraded" || health?.status === "error" || health?.lastError) return "attention";
  if (item.platformConfigured) return "connected";
  return item.manifest.maturity === "available" ? "available" : "not_connected";
}

export default async function PlatformConnectedServicesPage() {
  const { session } = await getPlatformPageContext();
  const operator = assertPlatformOperator(session);
  if (!operator) notFound();

  bootConnectorEngine();
  const catalogue = await listConnectorCatalogForOrg(session.organisationId);
  const services = catalogue
    .filter((item) => item.connectionScope === "platform")
    .map((item) => ({ ...item, health: toConnectorHealth(session.organisationId, item) }));

  return (
    <>
      <header className="dg-page-header">
        <Link href="/dashboard/settings/connected-services" className="text-sm text-sky-400 hover:underline">← Organisation services</Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">Integration Hub · Operator</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Platform-wide Connected Services</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">DigitalGate-managed infrastructure shared across the platform. Configuration health is shown without exposing credentials or secrets.</p>
      </header>
      <main className="dg-page-main max-w-5xl space-y-6">
        <nav className="flex gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-1 text-sm">
          <Link href="/dashboard/settings/connected-services" className="rounded-lg px-4 py-2 text-slate-400 hover:text-white">Organisation</Link>
          <span className="rounded-lg bg-slate-800 px-4 py-2 font-medium text-white">Platform-wide</span>
        </nav>

        <section className="grid gap-4 md:grid-cols-2">
          {services.map((service) => {
            const state = platformState(service);
            const meta = STATE[state];
            return (
              <article key={service.manifest.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-white">{service.manifest.name}</h2>
                    <p className="mt-1 text-xs capitalize text-slate-500">{service.manifest.category} · {service.manifest.auth.replace("_", " ")}</p>
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-medium ${meta.text}`}><span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />{meta.label}</div>
                </div>
                <div className="mt-4 border-t border-slate-800 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Affected capabilities</p>
                  <p className="mt-2 text-sm text-slate-300">{service.manifest.capabilities.length ? service.manifest.capabilities.join(" · ") : "Platform infrastructure"}</p>
                  {service.health?.lastSyncAt ? <p className="mt-3 text-xs text-slate-500">Last activity: {service.health.lastSyncAt}</p> : null}
                  {service.health?.lastError ? <p className="mt-2 text-xs text-amber-300">Needs attention: {service.health.lastError}</p> : null}
                </div>
              </article>
            );
          })}
        </section>

        <p className="text-xs text-slate-500">This view is restricted by DigitalGate platform authority. Tenant organisation settings, names and slugs cannot grant access.</p>
      </main>
    </>
  );
}
