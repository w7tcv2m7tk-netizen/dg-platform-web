import Link from "next/link";
import { notFound } from "next/navigation";
import {
  computeProspectOpportunityScore,
  getGrowthProspect,
  organisationGrowthScope,
  sessionHasFeature,
} from "@dg/platform-core";

import { ProspectEditControl } from "@/components/prospecting/ProspectingCustomerActions";
import { ProspectingPageHeader } from "@/components/prospecting/ProspectingPageHeader";
import { ProspectQualificationActions } from "@/components/prospecting/ProspectQualificationActions";
import { DecisionMakerResearch } from "@/components/prospecting/DecisionMakerResearch";
import { ProspectAuditRefresh } from "@/components/prospecting/ProspectAuditRefresh";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

type Finding = { title?: string; detail?: string; domain?: string; severity?: string; observed?: string; interpretation?: string; recommendedAction?: string };
type ProbeMap = Record<string, unknown>;

function findingsFrom(value: unknown): Finding[] {
  if (!value || typeof value !== "object") return [];
  const items = (value as { items?: unknown }).items;
  return Array.isArray(items) ? items.filter((x): x is Finding => Boolean(x && typeof x === "object")) : [];
}
function probesFrom(value: unknown): ProbeMap {
  if (!value || typeof value !== "object") return {};
  const probes = (value as { probes?: unknown }).probes;
  return probes && typeof probes === "object" && !Array.isArray(probes) ? probes as ProbeMap : {};
}
function displayProbe(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value == null || value === "") return "—";
  return String(value);
}

export default async function ProspectResearchPage({ params }: { params: Promise<{ prospectId: string }> }) {
  const session = await getAuthorisedPlatformPageSession("prospecting.prospects.read");
  if (!session) notFound();
  const { prospectId } = await params;
  const prospect = await getGrowthProspect(prospectId, organisationGrowthScope(session.organisationId));
  if (!prospect || prospect.archivedAt) notFound();

  const { prisma } = await import("@dg/database");
  const audit = await prisma.growthProspectAudit.findFirst({
    where: { prospectId: prospect.id, prospect: { organisationId: session.organisationId } },
    orderBy: { auditedAt: "desc" },
  });
  const findings = findingsFrom(audit?.findings);
  const probes = probesFrom(audit?.findings);
  const contentAccessible = probes.contentAccessible !== false;
  const score = computeProspectOpportunityScore({
    stage: prospect.stage,
    updatedAt: new Date(prospect.updatedAt),
    websiteUrl: prospect.websiteUrl,
    contactPhone: prospect.contactPhone,
    contactEmail: prospect.contactEmail,
    industry: prospect.industry,
    metadata: prospect.metadata,
    audit: audit && contentAccessible ? { businessHealth: audit.businessHealth, aiVisibility: audit.aiVisibility, seoScore: audit.seoScore, websiteHealth: audit.websiteHealth } : null,
  });
  const canWrite = sessionHasFeature(session, "prospecting.prospects.write");
  const canQualify = Boolean(prospect.contactName && (prospect.contactPhone || prospect.contactEmail));
  const isResearch = prospect.stage === "audit_created";

  return (
    <>
      <ProspectingPageHeader title="Research prospect" description="Review evidence, identify the decision-maker and make a deliberate qualification decision." />
      <main className="dg-page-main space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/apps/prospecting/today" className="text-xs text-violet-300 hover:underline">← Back to Today</Link>
            <h1 className="mt-2 text-2xl font-semibold text-white">{prospect.businessName}</h1>
            <p className="mt-1 text-sm text-slate-400">{[prospect.industry, prospect.location].filter(Boolean).join(" · ") || "Business details incomplete"}</p>
          </div>
          <div className="flex flex-wrap items-start gap-3">
            <Link href={`/apps/prospecting/prospects/${prospect.id}#opportunity-report`} className="rounded-lg border border-violet-500/40 px-3 py-2 text-sm font-medium text-violet-200 hover:bg-violet-500/10">Preview report</Link>
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-violet-200">{score.contactPriority != null ? "Contact priority" : "Research priority"}</p>
            <p className="mt-1 text-2xl font-semibold text-white">{score.score}</p>
            <p className="text-xs text-slate-400">{score.bandLabel}</p>
            </div>
          </div>
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Business & decision-maker</p>
            <div className="mt-4 space-y-2 text-sm">
              <p><span className="text-slate-500">Website:</span> <span className="text-slate-200">{prospect.websiteUrl || "Not identified"}</span></p>
              <p><span className="text-slate-500">Decision-maker:</span> <span className="text-slate-200">{prospect.contactName || "Not identified"}</span></p>
              <p><span className="text-slate-500">Phone:</span> <span className="text-slate-200">{prospect.contactPhone || "Not identified"}</span></p>
              <p><span className="text-slate-500">Email:</span> <span className="text-slate-200">{prospect.contactEmail || "Not identified"}</span></p>
            </div>
            {canWrite ? <><DecisionMakerResearch prospectId={prospect.id} /><div className="mt-4"><ProspectEditControl prospect={prospect} /></div></> : null}
          </div>

          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Fit assessment</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {score.reasons.length ? score.reasons.map((reason) => <li key={reason}>• {reason}</li>) : <li>No scored fit reasons available yet.</li>}
            </ul>
            <div className="mt-4 grid grid-cols-3 gap-2">
                {[["Fit", score.fitScore], ["Opportunity", score.opportunityScore], ["Confidence", score.researchConfidence]].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-slate-800 bg-slate-950/40 p-2 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-1 text-base font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>
              {score.penalties.length ? <div className="mt-3 space-y-1 text-xs text-amber-200">{score.penalties.map((penalty) => <p key={penalty}>− {penalty}</p>)}</div> : null}
              <p className="mt-4 text-xs text-slate-500">Scoring v2 is explainable and lifecycle-aware. Research Priority orders investigation; Contact Priority is only available after qualification.</p>
          </div>
        </section>

        <section className="dg-card">
          <div className="flex items-center justify-between gap-3"><p className="text-xs uppercase tracking-wide text-slate-500">Audit evidence</p>{canWrite ? <ProspectAuditRefresh prospectId={prospect.id} /> : null}</div>
          {audit ? (
            <>
              {!contentAccessible ? <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-100">The website responded but blocked the audit probe. On-page health, SEO and AI Visibility scores are withheld because the content could not be verified.</p> : null}
              {contentAccessible ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[["Business Health", audit.businessHealth], ["AI Visibility", audit.aiVisibility], ["SEO", audit.seoScore], ["Website Health", audit.websiteHealth]].map(([label,value]) => (
                  <div key={String(label)} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                    <p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold text-white">{value ?? "—"}/100</p>
                  </div>
                ))}
              </div> : null}
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div>
                  <h2 className="text-sm font-semibold text-white">Observed probes</h2>
                  <div className="mt-3 space-y-2 text-xs text-slate-300">
                    {["finalUrl","reachable","contentAccessible","statusCode","https","hasH1","hasMetaDescription","hasForm","hasJsonLd","hasAnalyticsHint"].map((key) => (
                      <div key={key} className="flex justify-between gap-4 border-b border-slate-800/70 pb-2"><span className="text-slate-500">{key}</span><span className="text-right">{displayProbe(probes[key])}</span></div>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Audit findings</h2>
                  <div className="mt-3 space-y-3">
                    {findings.length ? findings.map((finding, index) => (
                      <div key={index} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                        <p className="text-sm font-medium text-white">{finding.title || "Finding"}</p>
                        <p className="mt-1 text-xs text-slate-400">{finding.observed || finding.detail || "No detail recorded."}</p>
                        {finding.interpretation ? <p className="mt-2 text-xs text-slate-500">{finding.interpretation}</p> : null}
                      </div>
                    )) : <p className="text-sm text-slate-500">No findings recorded.</p>}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-500">Observed probe results and findings are generated from the same audit run. Verify material claims before using them in outreach.</p>
            </>
          ) : <p className="mt-3 text-sm text-slate-400">No audit has been created for this prospect yet.</p>}
        </section>

        <section id="opportunity-report" className="dg-card scroll-mt-24">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-violet-300">Digital Opportunity Report</p>
              <h2 className="mt-2 text-lg font-semibold text-white">{prospect.businessName}</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">Prospect-facing preview generated from verified research evidence. Internal qualification, contact strategy and sales notes stay private.</p>
            </div>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">Report v1 · preview</span>
          </div>
          {audit && contentAccessible ? (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[["Business Health", audit.businessHealth], ["AI Visibility", audit.aiVisibility], ["SEO", audit.seoScore], ["Website Health", audit.websiteHealth]].map(([label,value]) => (
                  <div key={String(label)} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                    <p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold text-white">{value ?? "—"}/100</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                  <h3 className="text-sm font-semibold text-white">Key opportunities</h3>
                  <div className="mt-3 space-y-3">
                    {findings.slice(0, 5).map((finding, index) => (
                      <div key={index}>
                        <p className="text-sm font-medium text-slate-200">{finding.title || "Digital opportunity"}</p>
                        <p className="mt-1 text-xs text-slate-400">{finding.observed || finding.detail || "Evidence recorded in the audit."}</p>
                      </div>
                    ))}
                    {!findings.length ? <p className="text-sm text-slate-500">Refresh research to generate evidence-backed opportunities.</p> : null}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                  <h3 className="text-sm font-semibold text-white">Recommended next priorities</h3>
                  <ol className="mt-3 space-y-2 text-sm text-slate-300">
                    {findings.slice(0, 3).map((finding, index) => <li key={index}>{index + 1}. {finding.recommendedAction || finding.interpretation || finding.title || "Review this opportunity with DigitalGate."}</li>)}
                    {!findings.length ? <li>Complete the research audit before generating recommendations.</li> : null}
                  </ol>
                  <p className="mt-4 text-xs text-slate-500">Only evidence recorded by the audit is included. Material claims should be verified before the report is sent.</p>
                </div>
              </div>
              <div className="mt-5 rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
                <h3 className="text-sm font-semibold text-white">How DigitalGate can help</h3>
                <p className="mt-2 text-sm text-slate-300">Use this evidence as the starting point for a Platform Consultation: confirm which opportunities matter commercially, then demonstrate the relevant DigitalGate capabilities rather than sending a generic platform pitch.</p>
              </div>
            </>
          ) : <p className="mt-4 text-sm text-slate-400">A verified, accessible audit is required before a prospect-facing report can be generated.</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" disabled className="rounded-lg bg-violet-600/50 px-4 py-2 text-sm font-medium text-white/70">Generate share link · next</button>
            <button type="button" disabled className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-500">Export PDF · next</button>
            <button type="button" disabled className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-500">Email report · next</button>
          </div>
        </section>

        <section className="dg-card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Qualification decision</p>
          <h2 className="mt-2 text-lg font-semibold text-white">{isResearch ? "Is this business worth pursuing?" : "Research decision recorded"}</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">Confirm there is a genuine fit and a usable route to the right decision-maker. Qualification unlocks outreach; disqualification closes the prospect without manufacturing contact activity.</p>
          {canWrite && isResearch ? <div className="mt-5"><ProspectQualificationActions prospectId={prospect.id} canQualify={canQualify} /></div> : <p className="mt-4 text-sm text-slate-300">Current stage: {prospect.stage}</p>}
        </section>
      </main>
    </>
  );
}
