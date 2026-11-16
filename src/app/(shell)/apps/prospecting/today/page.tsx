import { ProspectingPageHeader } from "@/components/prospecting/ProspectingPageHeader";
import { notFound } from "next/navigation";
import { acquisitionLifecycle, getDailyOpportunityBriefing } from "@dg/platform-core";

import { ProspectingTodayActions } from "@/components/prospecting/ProspectingTodayActions";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export const dynamic = "force-dynamic";

export default async function ProspectingTodayPage() {
  const session = await getAuthorisedPlatformPageSession("prospecting.prospects.read");
  if (!session) notFound();

  if (!process.env.DATABASE_URL) return <ProspectingUnavailable />;

  let workspace: Awaited<ReturnType<typeof loadPriorities>> | null = null;
  try {
    workspace = await loadPriorities(session);
  } catch (error) {
    console.error("[prospecting/today] load failed", error);
  }
  if (!workspace) return <ProspectingUnavailable />;
  const { briefing, rows, contactRows } = workspace;

  return (
    <>
      <ProspectingPageHeader title="Today’s Priorities" description="Your three highest-priority relationships, with evidence and the next action." />
      <main className="dg-page-main space-y-5">
        <a href="/apps/prospecting/overview" className="text-sm text-violet-300">Open Overview →</a>
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Top 3 ready" value={contactRows.length} />
          <Metric label="Contacted today" value={briefing.contactedToday} />
          <Metric label="Conversations" value={briefing.conversations} />
          <Metric label="Meetings" value={briefing.meetingsBooked} />
        </section>

        {rows.length === 0 ? (
          <section className="rounded-xl border border-dashed border-slate-700 p-6 text-center">
            <p className="font-semibold text-white">No prospects need action yet.</p>
            <a href="/apps/prospecting/discovery" className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white">
              Discover prospects
            </a>
          </section>
        ) : (
          <ProspectingTodayActions rows={rows} />
        )}
      </main>
    </>
  );
}

async function loadPriorities(session: { organisationId: string; clerkUserId: string }) {
  const briefing = await getDailyOpportunityBriefing({ organisationId: session.organisationId, limit: 30 });
  const { prisma } = await import("@dg/database");
  const prospects = await prisma.growthProspect.findMany({ where: { organisationId: session.organisationId, id: { in: briefing.rows.map((row) => row.prospectId) } }, select: { id: true, contactName: true, industry: true, location: true, convertedOrganisationId: true } });
  const prospectById = new Map(prospects.map((p) => [p.id, p]));
  const targetIds = prospects.map((p) => p.convertedOrganisationId).filter((id): id is string => Boolean(id));
  const memberships = await prisma.membership.findMany({ where: { organisationId: { in: targetIds }, clerkUserId: session.clerkUserId, status: "active", role: { in: ["owner", "admin"] } }, select: { organisationId: true } });
  const subscriptions = await prisma.platformSubscription.findMany({ where: { organisationId: { in: memberships.map((m) => m.organisationId) } }, select: { organisationId: true, status: true, stripeStatus: true, stripeSubscriptionId: true } });
  const commercialByOrg = new Map(subscriptions.map((s) => [s.organisationId, s]));
  const allRows = briefing.rows.map((row) => {
    const prospect = prospectById.get(row.prospectId);
    return {
      ...row,
      lifecycleLabel: acquisitionLifecycle(row.stage, prospect?.convertedOrganisationId ? commercialByOrg.get(prospect.convertedOrganisationId) : null),
      contactName: prospect?.contactName ?? null,
      industry: prospect?.industry ?? null,
      location: prospect?.location ?? null,
    };
  });

  const rows = allRows.slice(0, 3);
  const contactRows = rows.filter((row) => !["prospect", "audit_created"].includes(row.stage));

  return { briefing, rows, contactRows };
}

function ProspectingUnavailable() {
  return <>
    <ProspectingPageHeader title="Today’s Priorities" description="Your three highest-priority relationships, with evidence and the next action." />
    <main className="dg-page-main">
      <section role="alert" className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
        <p>Prospecting is temporarily unavailable. DigitalGate has kept unavailable signals out of the workspace rather than estimating them.</p>
        <div className="flex flex-wrap gap-3">
          <a href="/apps/prospecting" className="inline-flex min-h-11 items-center rounded-lg bg-amber-200 px-4 font-semibold text-slate-950">Try again</a>
          <a href="/dashboard/advisor" className="inline-flex min-h-11 items-center rounded-lg border border-amber-200/30 px-4 font-semibold text-amber-50">Get help</a>
        </div>
      </section>
    </main>
  </>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}
