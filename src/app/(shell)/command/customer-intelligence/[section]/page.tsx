import Link from "next/link";
import { redirect } from "next/navigation";
import {
  clientActivityScoreTierDisplay,
  clientActivityScoreTierEmoji,
  clientScoreTierDisplay,
  clientScoreTierEmoji,
  formatClientActivityMonthLine,
  formatClientExpansionSignal,
  formatClientObservedSignal,
  formatClientOrganisationMeta,
  getClientIntelligence,
} from "@dg/platform-core";

import { AttentionInterventionCards } from "@/components/command/AttentionInterventionCards";
import { OperatorMetricStrip } from "@/components/command/OperatorMetricStrip";
import { OperatorOrgTable } from "@/components/command/OperatorOrgTable";
import { getPlatformPageContext } from "@/lib/platform-page-context";

function shell(
  title: string,
  question: string,
  body: React.ReactNode,
  footnote?: string,
) {
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">{question}</p>
        {footnote ? (
          <p className="mt-2 max-w-2xl text-xs text-slate-500">{footnote}</p>
        ) : null}
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
                label: "Avg score",
                value: intel.averageSuccessScore,
                tone: "sky",
              },
              {
                label: "Excellent",
                value: intel.excellentCount,
                tone: "emerald",
              },
              { label: "Healthy", value: intel.healthyCount, tone: "emerald" },
              {
                label: "Needs Attention (score)",
                value: intel.needsAttentionBandCount,
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
              scoreTier: clientScoreTierDisplay(c),
              scoreTierEmoji: clientScoreTierEmoji(c),
              rank: c.rank,
              observedSignal: formatClientObservedSignal(c),
            }))}
          />
          <PortfolioLink />
        </>
      ),
      "Success Score™ measures overall customer/platform health. “Needs Attention” is a score band — not the Attention Required intervention queue.",
    );
  }

  if (section === "at-risk") {
    const flagged = clients.filter((c) => c.needsAttention);
    return shell(
      "Attention Required",
      "Customers requiring active DigitalGate intervention based on observed blockers, declining signals or unresolved issues.",
      !intel ? (
        <DbMissing />
      ) : (
        <>
          <OperatorMetricStrip
            metrics={[
              {
                label: "Attention Required",
                value: flagged.length,
                tone: "amber",
              },
              {
                label: "Needs Attention (score)",
                value: intel.needsAttentionBandCount,
              },
              { label: "All organisations", value: clients.length },
            ]}
          />
          <AttentionInterventionCards
            clients={flagged}
            emptyMessage="No organisations currently require intervention. Score-band “Needs Attention” customers can exist without an active intervention queue."
          />
          <PortfolioLink />
        </>
      ),
      "Needs Attention is a Success Score™ band. Attention Required is the intervention queue — they are not the same. Zero interventions can coexist with customers in the Needs Attention score band.",
    );
  }

  if (section === "expansion") {
    const sorted = [...clients].sort((a, b) => {
      if (b.openOpportunities !== a.openOpportunities) {
        return b.openOpportunities - a.openOpportunities;
      }
      return b.installedApps.length - a.installedApps.length;
    });
    const customersWithApps = clients.filter((c) => c.installedApps.length > 0).length;
    const openOpportunitiesTotal = clients.reduce((s, c) => s + c.openOpportunities, 0);

    return shell(
      "Opportunities",
      "Identify expansion opportunities across existing customers. New-customer acquisition remains under Sales.",
      !intel ? (
        <DbMissing />
      ) : (
        <>
          <OperatorMetricStrip
            metrics={[
              {
                label: "Open opportunities",
                value: openOpportunitiesTotal,
                tone: "sky",
              },
              {
                label: "Customers with apps",
                value: customersWithApps,
              },
            ]}
          />
          <OperatorOrgTable
            emptyMessage="No customer organisations yet."
            secondaryLabel="Expansion signal"
            secondaryHint="Open customer opportunities and app footprint"
            rows={sorted.map((c) => ({
              organisationId: c.organisationId,
              organisationName: c.organisationName,
              organisationSlug: c.organisationSlug,
              organisationMeta: formatClientOrganisationMeta(c),
              isInternalOrg: c.isInternalOrg,
              successScore: c.successScore,
              scoreTier: clientScoreTierDisplay(c),
              scoreTierEmoji: clientScoreTierEmoji(c),
              observedSignal: formatClientExpansionSignal(c),
            }))}
          />
          <PortfolioLink />
        </>
      ),
      "Open opportunities are expansion signals within each customer organisation — not new-customer acquisition in Sales.",
    );
  }

  // engagement → Client Activity
  const sorted = [...clients].sort((a, b) => {
    if (b.activitiesThisMonth !== a.activitiesThisMonth) {
      return b.activitiesThisMonth - a.activitiesThisMonth;
    }
    if (b.leadsThisMonth !== a.leadsThisMonth) {
      return b.leadsThisMonth - a.leadsThisMonth;
    }
    return b.openOpportunities - a.openOpportunities;
  });
  const activeOrganisations = clients.filter((c) => c.activitiesThisMonth > 0).length;

  return shell(
    "Client Activity",
    "Customer engagement and commercial activity recorded across the platform this month.",
    !intel ? (
      <DbMissing />
    ) : (
      <>
        <OperatorMetricStrip
          metrics={[
            {
              label: "Active organisations",
              value: activeOrganisations,
              tone: "sky",
            },
            {
              label: "Leads MTD",
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
          secondaryHint="Recorded leads, activities and opportunities"
          rows={sorted.map((c) => ({
            organisationId: c.organisationId,
            organisationName: c.organisationName,
            organisationSlug: c.organisationSlug,
            organisationMeta: formatClientOrganisationMeta(c),
            isInternalOrg: c.isInternalOrg,
            successScore: c.successScore,
            scoreTier: clientActivityScoreTierDisplay(c),
            scoreTierEmoji: clientActivityScoreTierEmoji(c),
            observedSignal: formatClientActivityMonthLine(c),
          }))}
        />
        <PortfolioLink />
      </>
    ),
    "Organisations with at least one recorded CRM activity this month count as active. Activity totals are aggregate — category breakdown is planned.",
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
      Full ranking →{" "}
      <Link href="/command/clients" className="text-sky-400 hover:underline">
        Customer Intelligence
      </Link>
    </p>
  );
}
