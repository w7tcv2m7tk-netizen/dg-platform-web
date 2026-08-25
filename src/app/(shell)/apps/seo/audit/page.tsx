import {
  getOrganisationBusinessProfile,
  listOrgSeoAudits,
} from "@dg/platform-core";

import { SeoAuditPanel } from "@/components/seo/SeoAuditPanel";
import { getPlatformPageContext } from "@/lib/org-apps";

export default async function SeoAuditPage() {
  const { session } = await getPlatformPageContext();

  let defaultUrl = "";
  let initialHistory: Awaited<ReturnType<typeof listOrgSeoAudits>> = [];

  if (session) {
    const [profile, audits] = await Promise.all([
      getOrganisationBusinessProfile(session.organisationId),
      listOrgSeoAudits(session.organisationId),
    ]);
    defaultUrl = profile?.websiteUrl?.trim() ?? "";
    initialHistory = audits;
  }

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">SEO audit</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · live website probes and findings
        </p>
      </header>
      <main className="dg-page-main">
        {!session ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to run SEO audits.</p>
          </div>
        ) : (
          <SeoAuditPanel defaultUrl={defaultUrl} initialHistory={initialHistory} />
        )}
      </main>
    </>
  );
}
