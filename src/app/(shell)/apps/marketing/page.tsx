import Link from "next/link";

import { MarketingSubnav } from "@/components/marketing/MarketingSubnav";
import { getPlatformPageContext } from "@/lib/org-apps";

/**
 * Marketing App stays registry-disabled for closed beta.
 * Honest deferred surface — no Twin score theatre.
 */
export default async function MarketingOverviewPage() {
  const { session: platformSession } = await getPlatformPageContext();

  return (
    <>
      <header className="dg-page-header">
        <Link href="/dashboard" className="text-sm text-sky-400 hover:underline">
          ← Overview
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Marketing</h1>
        <p className="text-sm text-slate-400">
          {platformSession?.organisationName ?? "DigitalGate"} · deferred for closed beta
        </p>
        <MarketingSubnav active="/apps/marketing" />
      </header>
      <main className="dg-page-main space-y-6">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-slate-300">
          <p className="font-medium text-amber-200">Coming later — not a beta Growth loop</p>
          <p className="mt-1 text-slate-400">
            Campaigns, channel mix, and agency audits are scaffolded routes only. Use SEO, AI
            Visibility, Analytics, and Opportunities for growth work in this beta. No decorative
            Twin score cards here.
          </p>
        </div>

        <section className="dg-card">
          <h2 className="font-semibold text-white">Use these instead</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>
              <Link href="/apps/seo" className="text-sky-400 hover:underline">
                SEO Engine
              </Link>{" "}
              — run a presence audit
            </li>
            <li>
              <Link href="/apps/ai-visibility" className="text-sky-400 hover:underline">
                AI Visibility
              </Link>{" "}
              — shared audit evidence
            </li>
            <li>
              <Link href="/apps/opportunities" className="text-sky-400 hover:underline">
                Opportunities
              </Link>{" "}
              — ranked next actions (customer-facing)
            </li>
            <li>
              <Link href="/apps/analytics" className="text-sky-400 hover:underline">
                Analytics
              </Link>{" "}
              — live Neon KPIs
            </li>
          </ul>
        </section>

        <section className="dg-card">
          <h2 className="font-semibold text-white">Scaffold routes (product map)</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li>
              <Link href="/apps/marketing/campaigns" className="hover:text-slate-300">
                Campaigns
              </Link>
            </li>
            <li>
              <Link href="/apps/marketing/channels" className="hover:text-slate-300">
                Channels
              </Link>
            </li>
            <li>
              <Link href="/apps/marketing/audits" className="hover:text-slate-300">
                Agency audits
              </Link>
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}
