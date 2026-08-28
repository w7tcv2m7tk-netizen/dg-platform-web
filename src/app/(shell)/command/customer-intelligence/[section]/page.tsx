import Link from "next/link";
import { redirect } from "next/navigation";
import { getClientIntelligence } from "@dg/platform-core";

import { OperatorMetricStrip } from "@/components/command/OperatorMetricStrip";
import { OperatorOrgTable } from "@/components/command/OperatorOrgTable";
import { getPlatformPageContext } from "@/lib/platform-page-context";

function shell(title: string, question: string, body: React.ReactNode) {
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">{question}</p>
      </header>
      <main className="dg-page-main space-y-6">{body}</main>
    </>
  );
}

export default async function CustomerIntelligenceSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  const { section } = await params;
  const allowed = ["overview", "health", "adoption", "engagement", "at-risk", "expansion"];
  if (!allowed.includes(section)) {
    redirect("/command/clients");
  }

  // Portfolio owns the primary customer list.
  if (section === "overview" || section === "adoption") {
    redirect("/command/clients");
  }

  const intel = process.env.DATABASE_URL ? await getClientIntelligence() : null;
  const clients = intel?.clients ?? [];

  if (section === "health") {
    return shell(
      "Client Health",
      "How healthy are customer organisations across Success Score™ tiers?",
      !intel ? (
        <DbMissing />
      ) : (
        <>
          <OperatorMetricStrip
            columnsClassName="sm:grid-cols-2 lg:grid-cols-5"
            metrics={[
              { label: "Organisations", value: clients.length },
              {
                label: "Avg Success Score™",
                value: intel.averageSuccessScore,
                tone: "sky",
              },
              {
                label: "Excellent",
                value: intel.tierCounts.top_performer,
                tone: "emerald",
              },
              { label: "Healthy", value: intel.healthyCount },
              {
                label: "Need attention",
                value: intel.needAttentionCount,
                tone: "amber",
              },
            ]}
          />
          <OperatorOrgTable
            showRank
            rows={clients.map((c) => ({
              organisationId: c.organisationId,
              organisationName: c.organisationName,
              organisationSlug: c.organisationSlug,
              successScore: c.successScore,
              healthTier: c.healthTier,
              rank: c.rank,
              highlights: c.highlights,
              attentionReasons: c.attentionReasons,
            }))}
          />
          <PortfolioLink />
        </>
      ),
    );
  }

  if (section === "at-risk") {
    const atRisk = clients.filter((c) => c.needsAttention);
    return shell(
      "Attention Required",
      "Which customers need intervention — stalled health, attention flags, or declining signal?",
      !intel ? (
        <DbMissing />
      ) : (
        <>
          <OperatorMetricStrip
            metrics={[
              { label: "Need attention", value: atRisk.length, tone: "amber" },
              { label: "All orgs", value: clients.length },
            ]}
          />
          <OperatorOrgTable
            emptyMessage="No organisations currently flagged for attention."
            secondaryLabel="Attention"
            rows={atRisk.map((c) => ({
              organisationId: c.organisationId,
              organisationName: c.organisationName,
              organisationSlug: c.organisationSlug,
              successScore: c.successScore,
              healthTier: c.healthTier,
              attentionReasons: c.attentionReasons,
              highlights: c.highlights,
            }))}
          />
          <PortfolioLink />
        </>
      ),
    );
  }

  if (section === "expansion") {
    const candidates = [...clients]
      .filter((c) => c.installedApps.length > 0 || c.openOpportunities > 0)
      .sort((a, b) => b.openOpportunities - a.openOpportunities);

    return shell(
      "Opportunities",
      "Where customers may grow — open opportunities and app footprint. Sales acquisition pipeline lives under Sales.",
      !intel ? (
        <DbMissing />
      ) : (
        <>
          <OperatorMetricStrip
            metrics={[
              {
                label: "Open opportunities",
                value: clients.reduce((s, c) => s + c.openOpportunities, 0),
                tone: "sky",
              },
              { label: "With apps installed", value: candidates.length },
            ]}
          />
          <OperatorOrgTable
            emptyMessage="No expansion signals yet."
            secondaryLabel="Signal"
            rows={candidates.map((c) => ({
              organisationId: c.organisationId,
              organisationName: c.organisationName,
              organisationSlug: c.organisationSlug,
              successScore: c.successScore,
              healthTier: c.healthTier,
              detail: `${c.openOpportunities} open opps · ${c.installedApps.length} apps`,
            }))}
          />
          <PortfolioLink />
        </>
      ),
    );
  }

  // engagement → Client Activity
  const sorted = [...clients].sort((a, b) => {
    const ea = a.leadsThisMonth * 2 + a.activitiesThisMonth + a.openOpportunities;
    const eb = b.leadsThisMonth * 2 + b.activitiesThisMonth + b.openOpportunities;
    return eb - ea;
  });
  const active = clients.filter(
    (c) =>
      c.leadsThisMonth > 0 || c.activitiesThisMonth > 0 || c.openOpportunities > 0,
  ).length;

  return shell(
    "Client Activity",
    "Usage depth this month — leads, CRM activity, and open opportunities.",
    !intel ? (
      <DbMissing />
    ) : (
      <>
        <OperatorMetricStrip
          metrics={[
            { label: "Active this month", value: active, tone: "sky" },
            {
              label: "Leads MTD (all)",
              value: clients.reduce((s, c) => s + c.leadsThisMonth, 0),
            },
            {
              label: "Activities MTD",
              value: clients.reduce((s, c) => s + c.activitiesThisMonth, 0),
            },
            {
              label: "Open opportunities",
              value: clients.reduce((s, c) => s + c.openOpportunities, 0),
            },
          ]}
        />
        <OperatorOrgTable
          secondaryLabel="This month"
          rows={sorted.map((c) => ({
            organisationId: c.organisationId,
            organisationName: c.organisationName,
            organisationSlug: c.organisationSlug,
            successScore: c.successScore,
            healthTier: c.healthTier,
            detail: `${c.leadsThisMonth} leads · ${c.activitiesThisMonth} activities · ${c.openOpportunities} opps`,
          }))}
        />
        <PortfolioLink />
      </>
    ),
  );
}

function DbMissing() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
      Database not configured — customer intelligence unavailable.
    </div>
  );
}

function PortfolioLink() {
  return (
    <p className="text-sm text-slate-500">
      Full ranking:{" "}
      <Link href="/command/clients" className="text-sky-400 hover:underline">
        Customer Intelligence
      </Link>
    </p>
  );
}
