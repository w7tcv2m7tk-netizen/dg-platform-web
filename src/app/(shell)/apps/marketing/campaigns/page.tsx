import Link from "next/link";
import { listOrganisationActivities } from "@dg/platform-core";

import { MarketingCampaignForm } from "@/components/marketing/MarketingCampaignForm";
import { MarketingSubnav } from "@/components/marketing/MarketingSubnav";
import { getPlatformPageContext } from "@/lib/org-apps";

export default async function MarketingCampaignsPage() {
  const { session: platformSession } = await getPlatformPageContext();
  const activities = platformSession
    ? await listOrganisationActivities({
        organisationId: platformSession.organisationId,
        sourceApp: "marketing",
        limit: 20,
      })
    : { items: [], meta: { total: 0, limit: 20, offset: 0 } };

  const campaigns = activities.items.filter((a) => a.activityType === "marketing.campaign_brief");

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/marketing" className="text-sm text-blue-400 hover:underline">
          ← Marketing overview
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Campaigns</h1>
        <p className="text-sm text-slate-400">Document-free campaign briefs stored as activities</p>
        <MarketingSubnav active="/apps/marketing/campaigns" />
      </header>
      <main className="dg-page-main space-y-6">
        {campaigns.length === 0 ? (
          <section className="dg-card">
            <h2 className="font-semibold text-white">Create your first campaign brief</h2>
            <p className="mt-2 text-sm text-slate-400">
              No documents or OAuth — just a title and goal saved to your activity timeline.
            </p>
            {!platformSession ? (
              <p className="mt-4 text-sm text-amber-300">Connect Neon to save campaign briefs.</p>
            ) : (
              <div className="mt-4">
                <MarketingCampaignForm />
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="dg-card">
              <h2 className="font-semibold text-white">Campaign briefs</h2>
              <ul className="mt-4 space-y-3">
                {campaigns.map((campaign) => (
                  <li
                    key={campaign.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3"
                  >
                    <p className="font-medium text-white">{campaign.title}</p>
                    {campaign.body ? (
                      <p className="mt-1 text-sm text-slate-400">{campaign.body}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">
                      {new Date(campaign.createdAt).toLocaleString("en-AU")}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
            <section className="dg-card">
              <h2 className="font-semibold text-white">New brief</h2>
              <div className="mt-4">
                <MarketingCampaignForm />
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
