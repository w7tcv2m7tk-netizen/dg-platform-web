import Link from "next/link";
import { listOrgSeoAudits } from "@dg/platform-core";

import { MarketingSeoAuditPanel } from "@/components/marketing/MarketingSeoAuditPanel";
import { MarketingSubnav } from "@/components/marketing/MarketingSubnav";
import { getPlatformPageContext } from "@/lib/org-apps";

import { runMarketingSeoAuditAction } from "./actions";

export default async function MarketingAuditsPage() {
  const { session: platformSession } = await getPlatformPageContext();
  const pastAudits = platformSession
    ? await listOrgSeoAudits(platformSession.organisationId, 10)
    : [];

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/marketing" className="text-sm text-blue-400 hover:underline">
          ← Marketing overview
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">SEO audits</h1>
        <p className="text-sm text-slate-400">Run presence + Studio SEO checks</p>
        <MarketingSubnav active="/apps/marketing/audits" />
      </header>
      <main className="dg-page-main space-y-6">
        <section className="dg-card">
          <h2 className="font-semibold text-white">Run audit</h2>
          <p className="mt-1 text-sm text-slate-400">
            Uses your Business Profile website URL and native Website Studio pages when available.
          </p>
          {!platformSession ? (
            <p className="mt-4 text-sm text-amber-300">Connect Neon to run audits.</p>
          ) : (
            <div className="mt-4">
              <MarketingSeoAuditPanel runAuditAction={runMarketingSeoAuditAction} />
            </div>
          )}
        </section>

        <section className="dg-card">
          <h2 className="font-semibold text-white">Past audits</h2>
          {pastAudits.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No audits recorded yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {pastAudits.map((audit) => {
                const meta = audit.metadata as {
                  scores?: { seo?: number };
                  findingCount?: number;
                  websiteUrl?: string | null;
                } | null;
                return (
                  <li
                    key={audit.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3"
                  >
                    <p className="font-medium text-white">{audit.title}</p>
                    {audit.body ? (
                      <p className="mt-1 text-sm text-slate-400">{audit.body}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">
                      {new Date(audit.createdAt).toLocaleString("en-AU")}
                      {meta?.scores?.seo != null ? ` · SEO ${meta.scores.seo}/100` : ""}
                      {meta?.findingCount != null ? ` · ${meta.findingCount} findings` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
