import { notFound } from "next/navigation";
import { listOrganisationDomains, sessionHasFeature } from "@dg/platform-core";

import { DnsConsole } from "@/components/infrastructure/DnsConsole";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

/**
 * DNS Infrastructure — zone inspect, suggested hosting records, Apply website DNS.
 * Auth / email DNS stays under Email. Domain search/register under Domains.
 */
export default async function DnsInfrastructurePage() {
  const session = await getAuthorisedPlatformPageSession("infrastructure.read");
  if (!session) notFound();

  const canWrite = sessionHasFeature(session, "infrastructure.write");
  const domains = canWrite ? [] : await listOrganisationDomains(session.organisationId);

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">DNS</h1>
        <p className="text-sm text-slate-400">
          Website DNS records · zone status · SSL readiness
        </p>
      </header>
      <main className="dg-page-main">
        {canWrite ? (
          <DnsConsole />
        ) : (
          <section className="max-w-3xl space-y-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-5">
              <h2 className="text-base font-semibold text-white">DNS status</h2>
              <p className="mt-1 text-sm text-slate-400">
                You have read-only access. DNS changes are hidden with your current permissions.
              </p>
            </div>
            {domains.length === 0 ? (
              <p className="text-sm text-slate-500">No domains are connected yet.</p>
            ) : (
              <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-950/40">
                {domains.map((domain) => (
                  <li key={domain.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <span className="font-mono text-sm text-slate-200">{domain.name}</span>
                    <span className="text-xs text-slate-500">
                      {domain.dnsConfiguredAt ? "DNS configured" : "DNS pending"} · SSL {domain.sslState || "unknown"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </>
  );
}
