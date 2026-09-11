import { notFound } from "next/navigation";
import {
  listOrganisationDomains,
  sessionHasFeature,
} from "@dg/platform-core";

import { DomainsConsole } from "@/components/infrastructure/DomainsConsole";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

/** DigitalGate Domains — customer domain inventory and management. */
export default async function Page() {
  const session = await getAuthorisedPlatformPageSession("infrastructure.read");
  if (!session) notFound();

  const canWrite = sessionHasFeature(session, "infrastructure.write");
  const domains = canWrite
    ? []
    : await listOrganisationDomains(session.organisationId);

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Domains</h1>
        <p className="text-sm text-slate-400">
          {canWrite
            ? "Search, connect, manage DNS and make websites live"
            : "Domain inventory and connection status"}
          {session.organisationName ? ` · ${session.organisationName}` : ""}
        </p>
      </header>
      <main className="dg-page-main">
        {canWrite ? (
          <DomainsConsole />
        ) : domains.length === 0 ? (
          <div className="max-w-2xl rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-6">
            <p className="text-sm text-slate-300">
              No domains are connected to this business yet.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl space-y-3">
            <p className="text-sm text-slate-400">
              You have read-only access to domain status. Domain and DNS changes require additional access.
            </p>
            <ul className="space-y-2">
              {domains.map((domain) => (
                <li
                  key={domain.id}
                  className="rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{domain.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {domain.websiteId ? "Linked to a website" : "Not linked to a website"}
                        {domain.dnsConfiguredAt ? " · DNS configured" : " · DNS pending"}
                        {domain.sslState ? ` · SSL ${domain.sslState}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">
                      {domain.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </>
  );
}
