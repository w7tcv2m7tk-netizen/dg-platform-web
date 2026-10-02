import {
  getOrganisationBusinessProfile,
  listOrgSeoAudits,
} from "@dg/platform-core";

import { SeoAuditPanel } from "@/components/seo/SeoAuditPanel";
import { SectionPageHeader } from "@/components/ui/SectionPageHeader";
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
      <SectionPageHeader section="Growth" title="SEO audit" description={<>{session?.organisationName ?? "DigitalGate"} · live website probes and findings</>} />
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
