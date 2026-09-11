import { notFound } from "next/navigation";
import {
  getEmailInfrastructureOverview,
  listOrganisationDomains,
  sessionHasFeature,
} from "@dg/platform-core";

import { EmailInfrastructureConsole } from "@/components/infrastructure/EmailInfrastructureConsole";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export default async function EmailInfrastructurePage() {
  const session = await getAuthorisedPlatformPageSession("infrastructure.read");
  if (!session) notFound();

  const canWrite = sessionHasFeature(session, "infrastructure.write");
  const overview = await getEmailInfrastructureOverview(session.organisationId);

  if (!canWrite) {
    const domains = await listOrganisationDomains(session.organisationId);
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Email</h1>
          <p className="text-sm text-slate-400">Sending-domain and email authentication status.</p>
        </header>
        <main className="dg-page-main max-w-2xl space-y-4">
          <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-5">
            <h2 className="text-lg font-semibold text-white">Email status</h2>
            <p className="mt-2 text-sm text-slate-400">
              {overview.tenantTransactional.message}
            </p>
          </section>
          <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-5">
            <h2 className="text-lg font-semibold text-white">Domains</h2>
            {domains.length ? (
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {domains.map((domain) => (
                  <li key={domain.id} className="flex justify-between gap-3">
                    <span>{domain.name}</span>
                    <span className="text-slate-500">{domain.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-400">No connected domains yet.</p>
            )}
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Email</h1>
        <p className="text-sm text-slate-400">Manage sending domains and email authentication.</p>
      </header>
      <main className="dg-page-main max-w-2xl">
        <EmailInfrastructureConsole initialOverview={overview} />
      </main>
    </>
  );
}
