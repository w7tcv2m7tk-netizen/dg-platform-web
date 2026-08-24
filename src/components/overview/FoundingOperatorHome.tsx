"use client";

import Link from "next/link";

import { resolveIndustryFromAppId } from "@dg/platform-core";
import type { BusinessOverview } from "@dg/platform-core";

import { SetupProgressBar } from "@/components/overview/SetupProgressBar";

const CORE_BUSINESS_APPS = [
  { id: "crm", name: "CRM", href: "/apps/crm", description: "Contacts, pipeline, and follow-ups" },
  {
    id: "commerce",
    name: "Commerce",
    href: "/apps/commerce",
    description: "Quotes, invoices, and payments",
  },
  {
    id: "documents",
    name: "Documents",
    href: "/apps/documents",
    description: "Documents & Signing — agreements, disclosures, contracts",
  },
  {
    id: "communications",
    name: "Communications",
    href: "/apps/communications",
    description: "Email history, compose, CRM-linked communication records",
  },
  {
    id: "websites",
    name: "Design Studio",
    href: "/apps/websites",
    description: "Websites, funnels, and brand",
  },
] as const;

const INDUSTRY_APP_IDS = new Set([
  "real-estate",
  "property-management",
  "commercial",
  "accommodation",
  "services",
  "finance",
  "automotive",
  "creator",
]);

const INDUSTRY_HREF: Record<string, string> = {
  "real-estate": "/apps/re",
};

function industryBusinessLinks(enabledAppIds: string[]) {
  const links: Array<{
    id: string;
    name: string;
    href: string;
    description: string;
  }> = [];

  for (const id of enabledAppIds) {
    if (!INDUSTRY_APP_IDS.has(id)) continue;
    const resolved = resolveIndustryFromAppId(id);
    links.push({
      id,
      name: resolved?.specialisation.label ?? resolved?.platform.label ?? "Industry App",
      href: INDUSTRY_HREF[id] ?? `/apps/${id}`,
      description: "Your industry workspace",
    });
  }

  return links;
}

export function FoundingOperatorHome({
  overview,
  enabledAppIds,
  openOpportunityCount = 0,
}: {
  overview: BusinessOverview;
  enabledAppIds: string[];
  openOpportunityCount?: number;
}) {
  const opportunityAttention =
    openOpportunityCount > 0 ? openOpportunityCount : overview.growthOpportunityCount;
  const industryLinks = industryBusinessLinks(enabledAppIds);
  const businessApps = [
    ...CORE_BUSINESS_APPS.filter((app) => enabledAppIds.includes(app.id)),
    ...industryLinks,
  ];

  return (
    <div className="space-y-6">
      {!overview.scoresLive ? (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-200/90">
          Connect your website and CRM for live Business Health™ scores.{" "}
          <Link href="/dashboard/settings/connectors" className="underline hover:text-white">
            Connectors →
          </Link>
        </div>
      ) : null}

      {overview.setupProgress.complete ? null : (
        <SetupProgressBar progress={overview.setupProgress} />
      )}

      <section className="dg-card border-emerald-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/25">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-400/90">
          Business Health
        </p>
        <Link href="/dashboard/health" className="mt-3 block hover:opacity-95">
          <div className="flex flex-wrap items-end gap-2">
            <span className="text-5xl font-bold text-white">{overview.businessHealth}</span>
            <span className="pb-2 text-lg text-slate-500">/ 100</span>
            <span
              className={`pb-2 text-sm font-medium ${
                overview.businessHealthDelta >= 0 ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {overview.businessHealthDelta >= 0 ? "↑" : "↓"} {overview.businessHealthDeltaLabel}
            </span>
          </div>
        </Link>
      </section>

      <section className="dg-card">
        <h2 className="font-semibold text-white">Today&apos;s priorities</h2>
        <ol className="mt-4 space-y-3">
          {overview.priorities.map((priority) => (
            <li key={priority.rank} className="flex gap-3 text-sm text-slate-200">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-xs font-bold text-blue-300">
                {priority.rank}
              </span>
              <span>{priority.text}</span>
            </li>
          ))}
        </ol>
        {overview.prioritiesImpact ? (
          <p className="mt-4 text-sm text-emerald-400">
            Potential impact: {overview.prioritiesImpact}
          </p>
        ) : null}
      </section>

      <section className="dg-card border-sky-500/20 bg-gradient-to-br from-slate-900 to-slate-950">
        <h2 className="font-semibold text-white">AI Advisor</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          I&apos;ve reviewed your business. Here&apos;s what I&apos;d focus on today…
        </p>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-400">
          {overview.dailyBriefing}
        </p>
        <Link
          href="/dashboard/advisor"
          className="mt-4 inline-flex rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          Ask Advisor
        </Link>
      </section>

      {opportunityAttention > 0 ? (
        <section className="dg-card">
          <h2 className="font-semibold text-white">Opportunities</h2>
          <p className="mt-2 text-sm text-slate-300">
            {opportunityAttention} opportunit{opportunityAttention === 1 ? "y" : "ies"} need
            attention
          </p>
          <ul className="mt-4 space-y-2">
            {overview.growthOpportunities.slice(0, 3).map((opp) => (
              <li key={opp.id}>
                <Link
                  href={opp.href ?? "/apps/crm/opportunities"}
                  className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-slate-800/50"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{opp.label}</p>
                    <p className="text-xs text-slate-500">
                      {opp.status} · {opp.impact}
                    </p>
                  </div>
                  <span className="text-slate-600">→</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/apps/crm/opportunities"
            className="mt-3 inline-block text-sm text-blue-400 hover:underline"
          >
            View pipeline →
          </Link>
        </section>
      ) : null}

      <section className="dg-card">
        <h2 className="font-semibold text-white">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/apps/crm/contacts"
            className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-blue-500/50 hover:text-white"
          >
            Add contact
          </Link>
          <Link
            href="/apps/crm/opportunities"
            className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-blue-500/50 hover:text-white"
          >
            Create opportunity
          </Link>
          <Link
            href="/dashboard/advisor"
            className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-blue-500/50 hover:text-white"
          >
            Ask Advisor
          </Link>
          <Link
            href="/dashboard/health"
            className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-blue-500/50 hover:text-white"
          >
            View Business Health
          </Link>
        </div>
      </section>

      <section className="dg-card">
        <h2 className="font-semibold text-white">Your Business</h2>
        <p className="mt-1 text-xs text-slate-500">Apps to run your day-to-day work</p>
        <ul className="mt-4 divide-y divide-slate-800">
          {businessApps.map((app) => (
            <li key={app.id}>
              <Link
                href={app.href}
                className="flex items-center justify-between gap-3 py-3 hover:opacity-90"
              >
                <div>
                  <p className="font-medium text-white">{app.name}</p>
                  <p className="text-xs text-slate-500">{app.description}</p>
                </div>
                <span className="text-slate-600">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-5 text-center">
        <h2 className="font-semibold text-white">Explore more capabilities</h2>
        <p className="mt-1 text-sm text-slate-400">
          Industry, Growth, and Infrastructure apps appear when you need them.
        </p>
        <Link
          href="/dashboard/apps"
          className="mt-4 inline-flex rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white"
        >
          Browse Apps catalogue
        </Link>
      </section>
    </div>
  );
}
