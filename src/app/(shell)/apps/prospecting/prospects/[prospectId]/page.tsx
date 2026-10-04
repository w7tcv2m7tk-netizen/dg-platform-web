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
import { ProspectReportActions } from "@/components/prospecting/ProspectReportActions";
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
type SourceState = { status?: string; note?: string };
type BusinessIntelligence = {
  sourceStatus?: Record<string, SourceState>;
  publicProfiles?: Record<string, string>;
  realEstateJourney?: { hasAppraisalCta?: boolean; hasAppraisalForm?: boolean; suburbMentions?: number };
};
function businessIntelligenceFrom(value: unknown): BusinessIntelligence {
  if (!value || typeof value !== "object") return {};
  const intelligence = (value as { businessIntelligence?: unknown }).businessIntelligence;
  return intelligence && typeof intelligence === "object" && !Array.isArray(intelligence) ? intelligence as BusinessIntelligence : {};
}
function sourceStatusFrom(value: unknown): Record<string, SourceState> {
  if (!value || typeof value !== "object") return {};
  const sources = (value as { intelligenceSources?: unknown }).intelligenceSources;
  return sources && typeof sources === "object" && !Array.isArray(sources) ? sources as Record<string, SourceState> : {};
}
const SOURCE_LABELS: Record<string, string> = {
  businessIdentity: "ABR",
  googleBusinessProfile: "Google Business Profile",
  website: "Website",
  socialProfiles: "Website-linked social profiles",
  propertyMarketIntelligence: "Cotality",
  domainMarketplace: "Domain",
  reaMarketplace: "REA Partner Platform",
  industryCredentials: "Queensland OFT",
};

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
  const businessIntelligence = businessIntelligenceFrom(audit?.findings);
  const intelligenceSources = sourceStatusFrom(audit?.findings);
  const publicProfiles = businessIntelligence.publicProfiles ?? {};
  const realEstateJourney = businessIntelligence.realEstateJourney ?? {};
  const verifiedSocialCount = Object.values(publicProfiles).filter(Boolean).length;
  const socialReadiness = verifiedSocialCount >= 4 ? "Strong footprint" : verifiedSocialCount >= 2 ? "Established footprint" : verifiedSocialCount === 1 ? "Limited footprint" : "Not verified";
  const contentAccessible = probes.contentAccessible !== false;
  const score = computeProspectOpportunityScore({
    stage: prospect.stage,
    updatedAt: new Date(prospect.updatedAt),
    websiteUrl: prospect.websiteUrl,
    contactPhone: prospect.contactPhone,
    contactEmail: prospect.contactEmail,
    industry: prospect.industry,
    metadata: prospect.metadata,
    audit: audit && contentAccessible ? { businessHealth: audit.businessHealth, aiVisibility: audit.aiVisibility, seoScore: audit.seoScore, websiteHealth: audit.websiteHealth, findings: audit.findings } : null,
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

        <section className="dg-card">
          <p className="text-xs uppercase tracking-wide text-violet-300">Research intelligence</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Evidence provenance & acquisition signals</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">Operator-only evidence trail. Source states are shown exactly as returned by Research; unsupported marketplace claims remain fail-closed.</p>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-4">
              <h3 className="text-sm font-semibold text-white">Research sources</h3>
              <div className="mt-3 space-y-3">
                {Object.entries(SOURCE_LABELS).map(([key, label]) => {
                  const source = intelligenceSources[key];
                  return (
                    <div key={key} className="rounded-lg border border-slate-800/80 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-200">{label}</span>
                        <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-400">{source?.status || "not_recorded"}</span>
                      </div>
                      {source?.note ? <p className="mt-2 text-xs leading-5 text-slate-500">{source.note}</p> : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">Verified social footprint</h3>
                  <span className="text-xs font-medium text-violet-300">{socialReadiness}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{verifiedSocialCount} public profile{verifiedSocialCount === 1 ? "" : "s"} linked by the business website. This rating reflects verified channel coverage only; follower counts, posting frequency and engagement are not inferred.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(publicProfiles).filter(([, url]) => Boolean(url)).map(([network, url]) => (
                    <a key={network} href={url} target="_blank" rel="noreferrer" className="rounded-full border border-violet-500/30 bg-violet-500/5 px-3 py-1.5 text-xs capitalize text-violet-200 hover:bg-violet-500/10">{network} ↗</a>
                  ))}
                  {!verifiedSocialCount ? <span className="text-sm text-slate-500">No website-linked social profiles verified.</span> : null}
                </div>
              </div>

              {/real\s*estate/i.test(prospect.industry || "") ? <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
                <p className="text-xs uppercase tracking-wide text-violet-300">Real Estate acquisition intelligence</p>
                <h3 className="mt-2 text-base font-semibold text-white">Vendor journey signals</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3"><p className="text-xs text-slate-500">Appraisal CTA</p><p className="mt-1 text-sm font-medium text-white">{realEstateJourney.hasAppraisalCta ? "Detected" : "Not detected"}</p><p className="mt-1 text-xs text-slate-500">Seller-intent call-to-action on the audited homepage.</p></div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3"><p className="text-xs text-slate-500">Appraisal form</p><p className="mt-1 text-sm font-medium text-white">{realEstateJourney.hasAppraisalForm ? "Detected" : "Not detected"}</p><p className="mt-1 text-xs text-slate-500">Observable lead-capture path for appraisal intent.</p></div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3"><p className="text-xs text-slate-500">Local-area authority</p><p className="mt-1 text-sm font-medium text-white">{realEstateJourney.suburbMentions ?? 0} homepage mention{realEstateJourney.suburbMentions === 1 ? "" : "s"}</p><p className="mt-1 text-xs text-slate-500">Local/suburb references observed on the homepage; depth beyond the homepage is not inferred.</p></div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3"><p className="text-xs text-slate-500">Vendor journey assessment</p><p className="mt-1 text-sm font-medium text-white">{realEstateJourney.hasAppraisalCta && realEstateJourney.hasAppraisalForm ? "Capture pathway visible" : realEstateJourney.hasAppraisalCta ? "Intent visible; capture needs review" : "Acquisition pathway needs review"}</p><p className="mt-1 text-xs text-slate-500">Evidence-based summary of the signals above, not a claim about conversion performance.</p></div>
                </div>
              </div> : null}
            </div>
          </div>
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
          <ProspectReportActions prospectId={prospect.id} canGenerate={Boolean(audit && contentAccessible)} />
        </section>

        <section className="dg-card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Qualification decision</p>
          <h2 className="mt-2 text-lg font-semibold text-white">{isResearch ? "Ready for a qualification decision?" : prospect.stage === "qualified" ? "Qualification complete" : "Research decision recorded"}</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">{isResearch ? "Research is complete enough to make the next lifecycle decision. Qualifying advances the prospect out of Research; disqualification closes it without manufacturing contact activity." : prospect.stage === "qualified" ? "This prospect has already advanced beyond Research. The evidence above remains the research record; qualification is a separate lifecycle state." : "This prospect has already moved beyond the active Research stage."}</p>
          {canWrite && isResearch ? <div className="mt-5"><ProspectQualificationActions prospectId={prospect.id} canQualify={canQualify} /></div> : <p className="mt-4 text-sm text-slate-300">Current stage: {prospect.stage}</p>}
        </section>
      </main>
    </>
  );
}
