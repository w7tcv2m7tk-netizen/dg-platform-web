import Link from "next/link";
import { redirect } from "next/navigation";
import { getClientIntelligence } from "@dg/platform-core";

import { OperatorCategoryHeader } from "@/components/command/OperatorCategoryHeader";
import { OperatorMetricStrip } from "@/components/command/OperatorMetricStrip";
import { OperatorOrgTable } from "@/components/command/OperatorOrgTable";
import { getPlatformPageContext } from "@/lib/platform-page-context";

function shell(
  title: string,
  question: string,
  body: React.ReactNode,
) {
  return (
    <>
      <header className="dg-page-header">
        <OperatorCategoryHeader
          eyebrow="Customer Intelligence"
          title={title}
          question={question}
          backHref="/command/customer-intelligence/overview"
          backLabel="Customer Intelligence"
        />
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
    redirect("/command/customer-intelligence/overview");
  }

  const intel = process.env.DATABASE_URL ? await getClientIntelligence() : null;
  const clients = intel?.clients ?? [];

  if (section === "overview") {
    return shell(
      "Overview",
      "Customer ecosystem health at a glance — Success Score™, attention, and adoption.",
      !intel ? (
        <DbMissing />
      ) : (
        <>
          <OperatorMetricStrip
            columnsClassName="sm:grid-cols-2 lg:grid-cols-4"
            metrics={[
              { label: "Organisations", value: clients.length },
              {
                label: "Avg Success Score",
                value: intel.averageSuccessScore,
                tone: "sky",
              },
              {
                label: "Needs attention",
                value: intel.tierCounts.needs_attention,
                tone: "amber",
              },
              {
                label: "Top performers",
                value: intel.tierCounts.top_performer,
                tone: "emerald",
              },
            ]}
          />
          <OperatorOrgTable
            showRank
            rows={clients.slice(0, 25).map((c) => ({
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
          <ClientsLink />
        </>
      ),
    );
  }

  if (section === "health") {
    return shell(
      "Customer health",
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
                label: "Avg score",
                value: intel.averageSuccessScore,
                tone: "sky",
              },
              {
                label: "Top performers",
                value: intel.tierCounts.top_performer,
                tone: "emerald",
              },
              { label: "Healthy", value: intel.tierCounts.healthy },
              {
                label: "Needs attention",
                value: intel.tierCounts.needs_attention,
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
          <ClientsLink />
        </>
      ),
    );
  }

  if (section === "at-risk") {
    const atRisk = clients.filter(
      (c) =>
        c.needsAttention ||
        (!c.scoreProvisional && c.healthTier === "needs_attention"),
    );
    return shell(
      "At risk",
      "Which customers need intervention — stalled health, attention flags, or declining signal?",
      !intel ? (
        <DbMissing />
      ) : (
        <>
          <OperatorMetricStrip
            metrics={[
              { label: "At risk", value: atRisk.length, tone: "amber" },
              { label: "All orgs", value: clients.length },
            ]}
          />
          <OperatorOrgTable
            emptyMessage="No organisations currently flagged at risk."
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
          <ClientsLink />
        </>
      ),
    );
  }

  if (section === "adoption") {
    const sorted = [...clients].sort(
      (a, b) => b.installedApps.length - a.installedApps.length,
    );
    const withBeta = clients.filter(
      (c) => c.reBeta || c.accBeta || c.websitesBeta || c.infraDomainsBeta,
    ).length;
    const avgApps =
      clients.length === 0
        ? 0
        : Math.round(
            (clients.reduce((s, c) => s + c.installedApps.length, 0) /
              clients.length) *
              10,
          ) / 10;

    return shell(
      "Adoption",
      "App activation and beta enrolment across customer organisations.",
      !intel ? (
        <DbMissing />
      ) : (
        <>
          <OperatorMetricStrip
            metrics={[
              { label: "Avg apps installed", value: avgApps, tone: "sky" },
              { label: "Any beta enrolled", value: withBeta },
              {
                label: "RE beta",
                value: clients.filter((c) => c.reBeta).length,
              },
              {
                label: "Acc beta",
                value: clients.filter((c) => c.accBeta).length,
              },
            ]}
          />
          <OperatorOrgTable
            secondaryLabel="Apps / betas"
            rows={sorted.map((c) => {
              const betas = [
                c.reBeta ? "RE" : null,
                c.accBeta ? "Acc" : null,
                c.websitesBeta ? "Websites" : null,
                c.infraDomainsBeta ? "Domains" : null,
              ].filter(Boolean);
              return {
                organisationId: c.organisationId,
                organisationName: c.organisationName,
                organisationSlug: c.organisationSlug,
                successScore: c.successScore,
                healthTier: c.healthTier,
                detail: `${c.installedApps.length} apps${betas.length ? ` · ${betas.join(", ")}` : ""}`,
              };
            })}
          />
          <ClientsLink />
        </>
      ),
    );
  }

  if (section === "expansion") {
    const candidates = [...clients]
      .filter((c) => c.installedApps.length > 0 || c.openOpportunities > 0)
      .sort((a, b) => b.openOpportunities - a.openOpportunities);

    return shell(
      "Expansion signals",
      "Where customers may grow — open opportunities and app footprint. Not Sales Opportunities.",
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
          <ClientsLink />
        </>
      ),
    );
  }

  // engagement
  const sorted = [...clients].sort((a, b) => {
    const ea =
      a.leadsThisMonth * 2 + a.activitiesThisMonth + a.openOpportunities;
    const eb =
      b.leadsThisMonth * 2 + b.activitiesThisMonth + b.openOpportunities;
    return eb - ea;
  });
  const active = clients.filter(
    (c) =>
      c.leadsThisMonth > 0 ||
      c.activitiesThisMonth > 0 ||
      c.openOpportunities > 0,
  ).length;

  return shell(
    "Engagement",
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
        <ClientsLink />
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

function ClientsLink() {
  return (
    <p className="text-sm text-slate-500">
      Organisation directory:{" "}
      <Link href="/command/clients" className="text-sky-400 hover:underline">
        Organisations
      </Link>
    </p>
  );
}
