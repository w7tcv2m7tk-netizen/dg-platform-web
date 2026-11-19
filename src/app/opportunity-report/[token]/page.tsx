import { notFound } from "next/navigation";
import { loadGrowthReportSnapshot } from "@dg/platform-core/command-centre/growth-engine/report-snapshot";
import {
  businessMeaningFor,
  buildExecutiveVerdict,
  buildReportInsights,
  buildReportPillars,
  buildReportPriorities,
  buildReportRoadmap,
  buildSourceStatus,
  evidenceForFinding,
  evidenceStatusLabel,
  commercialHeadlineFor,
  resolveReportIndustry,
  type ReportPresentationFinding,
} from "@dg/platform-core/command-centre/growth-engine/report-presentation";
import { buildGrowthBlueprint, shortCapability } from "@dg/platform-core/command-centre/growth-engine/growth-blueprint";
import { prospectReportAccess } from "@/lib/prospect-report-access";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

type Finding = ReportPresentationFinding & { detail?: string; interpretation?: string; recommendedAction?: string; category?: string; domain?: string; severity?: string };
type SolutionMatch = { capability?: string; opportunity?: string; evidence?: string; benefit?: string; relevance?: string };
type BusinessIntelligence = {
  identity?: { abn?: string; registeredName?: string; registeredLocation?: string };
  google?: { placeId?: string; rating?: number; reviewCount?: number; category?: string; address?: string; phone?: string; website?: string; mapsUri?: string };
  brandImageUrl?: string | null;
  publicProfiles?: Record<string, string | undefined>;
  realEstateJourney?: { hasAppraisalCta?: boolean; hasAppraisalForm?: boolean; suburbMentions?: number; acquisitionReadiness?: { score?: number; appraisalPath?: number; localAuthority?: number; reputation?: number; socialPresence?: number; discoverability?: number } };
  socialAssessment?: { score?: number; channelCount?: number; basis?: string; activityStatus?: string; audienceStatus?: string; engagementStatus?: string };
  reputationEvidence?: { score?: number | null; reviewSignal?: boolean; googleLocalSignal?: boolean; basis?: string };
  conversionEvidence?: { hasForm?: boolean; hasPhoneLink?: boolean; hasEmailLink?: boolean; hasCtaLanguage?: boolean; pageHasForm?: boolean; pageHasBooking?: boolean; pageHasPricing?: boolean; basis?: string };
  sourceStatus?: Record<string, { status?: string; note?: string }>;
};
type AuditPayload = {
  items?: Finding[];
  strengths?: string[];
  industryInsights?: Array<{ title?: string; detail?: string; recommendedAction?: string }>;
  industryPack?: string;
  scorecard?: Record<string, unknown>;
  assessment?: { status?: string; assessedPillars?: string[]; unavailablePillars?: string[]; evidenceCoveragePercent?: number; sourceCoveragePercent?: number; sourceNotes?: string[]; weights?: Record<string, number>; confidence?: string };
  businessModel?: { type?: string; subtype?: string; confidence?: string; offering?: string; audiences?: string[]; marketOrientation?: string; conversionPaths?: string[]; discoveryChannels?: string[]; successIndicators?: string[]; isLocationBased?: boolean; evidence?: string[] };
  digitalGateSolutionMatches?: SolutionMatch[];
  businessIntelligence?: BusinessIntelligence;
  researchContext?: { probes?: { pages?: Array<{ url?: string; title?: string | null; hasForm?: boolean; hasPhoneLink?: boolean; hasEmailLink?: boolean; hasBookingLanguage?: boolean; hasPricingLanguage?: boolean; hasTrialLanguage?: boolean; hasServiceLanguage?: boolean }> } };
};

function auditPayload(value: unknown): AuditPayload {
  return value && typeof value === "object" ? value as AuditPayload : {};
}

function findingsFrom(value: unknown): Finding[] {
  if (!value || typeof value !== "object") return [];
  const items = (value as { items?: unknown }).items;
  return Array.isArray(items) ? items.filter((item): item is Finding => Boolean(item && typeof item === "object")) : [];
}

function scoreLabel(value: number | null) {
  if (value == null) return "Not assessed";
  if (value >= 75) return "Strong foundation";
  if (value >= 50) return "Room to improve";
  return "Priority opportunity";
}

function customerSafeText(value?: string | null) {
  if (!value) return value || "";
  if (/strong opening for a DigitalGate conversation/i.test(value)) return value.replace(/\s*[—-]\s*strong opening for a DigitalGate conversation\.?/i, ".");
  if (/lead with website health\s*\+\s*ai visibility in the opportunity report/i.test(value)) return "Prioritise the weakest verified foundations first, then re-measure the Business Health Score.";
  return value;
}

function normalisedFindings(findings: Finding[]): ReportPresentationFinding[] {
  return findings.map((finding) => ({
    ...finding,
    observed: customerSafeText(finding.observed),
    detail: customerSafeText(finding.detail),
    interpretation: customerSafeText(finding.interpretation),
    recommendedAction: customerSafeText(finding.recommendedAction),
  }));
}

export default async function OpportunityReportPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { token } = await params;
  const { preview } = await searchParams;
  const access = await prospectReportAccess(preview);
  const { prisma } = await import("@dg/database");
  const loaded = await loadGrowthReportSnapshot(prisma, token, access);
  if (!loaded) notFound();
  const { audit, prospect } = loaded;
  const report = { ...loaded.report, prospect };

  const payload = auditPayload(audit?.findings);
  const rawFindings = findingsFrom(audit?.findings);
  const findings = normalisedFindings(rawFindings);
  const strengths = Array.isArray(payload.strengths) ? payload.strengths.slice(0, 8) : [];
  const scorecard = payload.scorecard && typeof payload.scorecard === "object" ? payload.scorecard : {};
  const assessment = payload.assessment ?? {};
  const businessModel = payload.businessModel ?? {};
  const assessedPages = Array.isArray(payload.researchContext?.probes?.pages) ? payload.researchContext.probes.pages : [];
  const solutionMatches = Array.isArray(payload.digitalGateSolutionMatches) ? payload.digitalGateSolutionMatches.slice(0, 3) : [];
  const intelligence = payload.businessIntelligence || {};
  const identity = intelligence.identity || {};
  const google = intelligence.google || {};
  const publicProfiles = intelligence.publicProfiles || {};
  const socialAssessment = intelligence.socialAssessment || {};
  const reputationEvidence = intelligence.reputationEvidence || {};
  const conversionEvidence = intelligence.conversionEvidence || {};
  const realEstateJourney = intelligence.realEstateJourney || {};
  const socialPresenceScore = typeof socialAssessment.score === "number" ? socialAssessment.score : null;
  const acquisitionReadiness = typeof realEstateJourney.acquisitionReadiness?.score === "number" ? realEstateJourney.acquisitionReadiness.score : null;
  const industry = resolveReportIndustry({ industry: report.prospect.industry, industryPack: payload.industryPack, businessModel });
  const relevantFindings = businessModel.isLocationBased === false
    ? findings.filter((finding) => !/\b(?:local|gbp|google maps|google business|google local|maps|suburb|location|localbusiness|local listing)\b/i.test(`${finding.title} ${finding.category || ""}`))
    : findings;
  const pack = industry.pack;
  const pillars = buildReportPillars(audit, scorecard);
  const priorities = buildReportPriorities(relevantFindings, pack, audit?.auditedAt ?? null);
  const insights = buildReportInsights(payload.industryInsights, pack);
  const roadmap = buildReportRoadmap(pack, priorities);
  const blueprint = businessModel.type && businessModel.type !== "general"
    ? buildGrowthBlueprint({ model: businessModel as Parameters<typeof buildGrowthBlueprint>[0]["model"], priorities })
    : [];
  const sourceStatus = buildSourceStatus(intelligence.sourceStatus, industry.key);
  const verdict = buildExecutiveVerdict({
    businessHealth: audit?.businessHealth ?? null,
    pillars,
    priorities,
    pack,
    auditedAt: audit?.auditedAt ?? null,
    hasAudit: Boolean(audit),
  });
  const auditDate = audit?.auditedAt ? new Date(audit.auditedAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) : "Not recorded";
  const evidenceAgeDays = audit?.auditedAt ? Math.max(0, Math.floor((Date.now() - new Date(audit.auditedAt).getTime()) / 86_400_000)) : null;
  const freshness = evidenceAgeDays == null ? { label: "Freshness not recorded", tone: "slate" } : evidenceAgeDays <= 30 ? { label: `Current evidence · ${evidenceAgeDays} days old`, tone: "emerald" } : evidenceAgeDays <= 90 ? { label: `Review suggested · ${evidenceAgeDays} days old`, tone: "amber" } : { label: `Refresh recommended · ${evidenceAgeDays} days old`, tone: "amber" };
  const strategyUrl = "https://digitalgate.com.au/strategy-session";
  const discoveryQuestions = businessModel.type === "music_artist"
    ? ["Which bookings, promoters or venues are the priority for the next 90 days?", "How are booking enquiries currently received and followed up?", "Which releases, mixes or artist profiles best represent the offer?", "What would make a promoter or collaborator confident enough to start a conversation?"]
    : businessModel.type === "real_estate_agency"
      ? ["Where do appraisal enquiries come from today and who owns follow-up?", "Which suburbs and seller segments are the highest-value focus?", "How are buyer enquiries qualified and handed to agents?"]
      : businessModel.type === "accommodation"
        ? ["Which booking channels are most valuable and how is direct enquiry handled?", "What guest experience or repeat-stay opportunity matters most?", "Where does availability or booking interest currently stall?"]
        : businessModel.type === "finance"
          ? ["Which client segments and advice categories are the priority?", "How is trust and suitability evidence presented before a consultation?", "Who owns qualified enquiry follow-up?"]
          : businessModel.type === "technology_marketing"
            ? ["Which service, trial or demonstration is the primary commercial offer?", "How are qualified demonstrations and subscriptions measured?", "Where does onboarding or retention lose momentum?"]
            : ["Where does customer interest currently enter the business?", "Who owns follow-up and what happens next?", "Which commercial outcome should improve first?"];

  return (
    <main className="dg-opportunity-report dg-premium-report min-h-screen">
      <div className="dg-report-print-cover">
        <p className="dg-report-cover-wordmark">DIGITALGATE</p>
        <p className="dg-report-kicker">DigitalGate · Digital Opportunity Review</p>
        <p className="dg-report-document-title">Digital Opportunity Report</p>
        <p className="dg-report-confidential">Private &amp; confidential · {pack.label}</p>
        <h1>{report.prospect.businessName}</h1>
        <p className="dg-report-cover-sub">An evidence-led review of the current digital position, with the three opportunities that matter first.</p>
        <div className="dg-report-cover-meta"><span><b>Prepared</b>{report.generatedAt.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</span><span><b>Evidence</b>{auditDate}</span><span><b>Industry</b>{pack.label}</span><span><b>Website</b>{report.prospect.websiteUrl ? report.prospect.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "") : "Not identified"}</span></div>
        <div className="dg-report-cover-score"><span>Business Health</span><strong>{audit?.businessHealth == null ? "Not Assessed" : <>{audit.businessHealth}<small>/100</small></>}</strong></div>
        <div className="dg-report-cover-priorities">{priorities.map((priority, index) => <div key={index}><span>0{index + 1}</span><h2>{priority.title}</h2><p>{priority.action}</p></div>)}</div>
        <p className="dg-report-cover-cta">Book a Strategy Session →</p>
      </div>


      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-14">
        <div className="dg-report-web-header dg-premium-cover">
          {access.kind === "preview" ? <p className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">Staff preview — this access does not record prospect engagement.</p> : null}
          <details className="mb-6 rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-slate-300 lg:hidden">
            <summary className="cursor-pointer font-medium text-white">On this page</summary>
            <nav className="mt-3 grid gap-2" aria-label="Report sections">
              <a href="#opportunities" className="text-violet-300">Top opportunities</a>
              <a href="#evidence" className="text-violet-300">Evidence and scores</a>
              <a href="#industry" className="text-violet-300">Industry context</a>
              <a href="#roadmap" className="text-violet-300">90-day roadmap</a>
              <a href="#next-step" className="text-violet-300">Next step</a>
            </nav>
          </details>
          <header className="border-b border-slate-700 pb-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-3xl">
                <p className="dg-cover-wordmark">DIGITALGATE</p>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-400">DigitalGate</p>
                <p className="dg-report-document-title">Digital Opportunity Report</p>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">{report.prospect.industry || pack.label} · {report.prospect.location || "Location not recorded"}{report.prospect.websiteUrl ? <> · <a href={report.prospect.websiteUrl} className="text-violet-300 underline decoration-violet-500/40 underline-offset-2" target="_blank" rel="noreferrer">{report.prospect.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a></> : null}</p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{report.prospect.businessName}</h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">An evidence-led review of the current digital position, with a clear commercial next step.</p>
              </div>
              <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-violet-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">Snapshot</p>
                <p className="mt-2 font-medium">{auditDate}</p>
                <p className="mt-1 text-xs text-violet-200/80">Public signals only · no customer data</p>
                <p className={`mt-2 inline-block rounded-full border px-2 py-1 text-[10px] font-semibold ${freshness.tone === "emerald" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : freshness.tone === "amber" ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-slate-600 text-slate-300"}`}>{freshness.label}</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">Prepared {report.generatedAt.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })} · Evidence captured {auditDate} · Directional DigitalGate diagnostic scoring</p>
          </header>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a href={strategyUrl} className="inline-flex min-h-11 items-center rounded-xl bg-violet-500 px-5 text-sm font-semibold text-white hover:bg-violet-400">Book a Strategy Session</a>
            <span className="text-xs text-slate-500">Turn the strongest opportunities into a practical plan.</span>
          </div>
        </div>

        <section id="executive-summary" className="dg-report-section mt-9 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Executive summary</p>
          <p className="mt-3 max-w-4xl text-base leading-7 text-slate-200">{report.executiveSummary}</p>
        </section>

        <section id="evidence" className="dg-report-section mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Evidence snapshot</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">What the public signals show</h2>
            </div>
            <p className="text-xs text-slate-500">Captured {auditDate}</p>
          </div>
          <div className="dg-premium-evidence-hero">
            <div className="dg-health-ring" aria-label={`Business Health ${audit?.businessHealth ?? "Not Assessed"}`}>
              <svg viewBox="0 0 120 120" role="img">
                <circle cx="60" cy="60" r="48" pathLength="100" className="dg-health-ring-track" />
                <circle cx="60" cy="60" r="48" pathLength="100" className="dg-health-ring-value" style={{ strokeDasharray: `${audit?.businessHealth ?? 0} ${100 - (audit?.businessHealth ?? 0)}` }} />
              </svg>
              <div className="dg-health-ring-label"><span>{audit?.businessHealth ?? "—"}</span><small>/100</small><em>{scoreLabel(audit?.businessHealth ?? null)}</em></div>
            </div>
            <div className="dg-premium-evidence-copy">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">Digital business health</p>
              <h3>One directional view, with its evidence boundary stated.</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Weighted only across assessed pillars and renormalised when a capability is unavailable. This is not a third-party ranking.</p>
              <div className="dg-evidence-pills">
                <span>Source coverage <b>{assessment.sourceCoveragePercent ?? 0}%</b></span>
                <span>Pillar coverage <b>{assessment.evidenceCoveragePercent ?? 0}%</b></span>
                <span>Confidence <b>{assessment.confidence ?? "low"}</b></span>
                <span>Status <b>{assessment.status === "not_assessed" ? "Not assessed" : assessment.status === "partial" ? "Partial" : "Assessed"}</b></span>
              </div>
              {assessment.sourceNotes?.length ? <p className="mt-2 text-[11px] leading-4 text-slate-500">{assessment.sourceNotes.join(" ")}</p> : null}
            </div>
          </div>
          <div className="dg-pillar-chart mt-6">
            <div className="dg-pillar-chart-header"><h3>Pillar assessment</h3><span>Assessed from visible public evidence only</span></div>
            {pillars.map((pillar) => <div key={pillar.key} className="dg-pillar-row"><div className="dg-pillar-row-label"><span>{pillar.label}</span><b>{pillar.value == null ? "Not Assessed" : `${pillar.value}/100`}</b></div><div className="dg-pillar-row-track"><i style={{ width: `${Math.max(0, Math.min(100, Number(pillar.value ?? 0)))}%` }} /></div><p>{pillar.description}</p></div>)}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="dg-report-card rounded-xl border border-slate-700 bg-slate-900/40 p-5">
              <p className="text-sm font-medium text-slate-300">Evidence status</p>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-400">
                <li><span className="font-semibold text-emerald-300">Observed</span> — a public signal was seen in this snapshot.</li>
                <li><span className="font-semibold text-amber-200">Confirmed gap</span> — the absence of a signal was observed.</li>
                <li><span className="font-semibold text-slate-300">Limited</span> — evidence exists but is incomplete.</li>
                <li><span className="font-semibold text-slate-500">Unavailable</span> — not assessed; no conclusion inferred.</li>
              </ul>
            </div>
            <div className="dg-report-card rounded-xl border border-slate-700 bg-slate-900/40 p-5">
              <p className="text-sm font-medium text-slate-300">Reputation evidence</p>
              <p className="mt-2 text-2xl font-semibold text-white">{reputationEvidence.score ?? "Not assessed"}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">{reputationEvidence.basis || "No reputation source was recorded in this snapshot."}</p>
              <p className="mt-2 text-[11px] text-slate-500">Homepage review signal: {reputationEvidence.reviewSignal == null ? "not recorded" : reputationEvidence.reviewSignal ? "observed" : "not observed"} · Google/local signal: {reputationEvidence.googleLocalSignal == null ? "not recorded" : reputationEvidence.googleLocalSignal ? "observed" : "not observed"}.</p>
            </div>
            <div className="dg-report-card rounded-xl border border-slate-700 bg-slate-900/40 p-5">
              <p className="text-sm font-medium text-slate-300">Conversion pathways assessed</p>
              <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-400">
                <li>Enquiry form: {conversionEvidence.hasForm == null ? "not assessed" : conversionEvidence.hasForm ? "observed" : "not observed on homepage"}</li>
                <li>Phone link: {conversionEvidence.hasPhoneLink == null ? "not assessed" : conversionEvidence.hasPhoneLink ? "observed" : "not observed on homepage"}</li>
                <li>Email link: {conversionEvidence.hasEmailLink == null ? "not assessed" : conversionEvidence.hasEmailLink ? "observed" : "not observed on homepage"}</li>
                <li>Call-to-action language: {conversionEvidence.hasCtaLanguage == null ? "not assessed" : conversionEvidence.hasCtaLanguage ? "observed" : "not observed on homepage"}</li>
                <li>Contact/enquiry form on a sampled page: {conversionEvidence.pageHasForm == null ? "not sampled" : conversionEvidence.pageHasForm ? "observed" : "not observed"}</li>
                <li>Booking/appointment pathway on a sampled page: {conversionEvidence.pageHasBooking == null ? "not sampled" : conversionEvidence.pageHasBooking ? "observed" : "not observed"}</li>
                <li>Pricing/package information on a sampled page: {conversionEvidence.pageHasPricing == null ? "not sampled" : conversionEvidence.pageHasPricing ? "observed" : "not observed"}</li>
              </ul>
              <p className="mt-2 text-[11px] leading-4 text-slate-500">{conversionEvidence.basis || "Homepage evidence only; other pages were not exhaustively tested."}</p>
            </div>
            {assessedPages.length ? <div className="dg-report-card rounded-xl border border-slate-700 bg-slate-900/40 p-5 lg:col-span-2">
              <p className="text-sm font-medium text-slate-300">Additional pages assessed</p>
              <div className="mt-3 space-y-2">{assessedPages.slice(0, 3).map((page, index) => <div key={`${page.url}-${index}`} className="rounded-lg border border-slate-700 bg-slate-950/40 p-3 text-xs text-slate-400"><p className="font-medium text-slate-200">{page.title || page.url}</p><p className="mt-1 break-all">{page.url}</p><p className="mt-1">Form: {page.hasForm ? "observed" : "not observed"} · Phone: {page.hasPhoneLink ? "observed" : "not observed"} · Email: {page.hasEmailLink ? "observed" : "not observed"} · Booking: {page.hasBookingLanguage ? "observed" : "not observed"} · Pricing: {page.hasPricingLanguage ? "observed" : "not observed"} · Trial/demo: {page.hasTrialLanguage ? "observed" : "not observed"} · Services: {page.hasServiceLanguage ? "observed" : "not observed"}</p></div>)}</div>
            </div> : null}
            <div className="dg-report-card rounded-xl border border-slate-700 bg-slate-900/40 p-5 lg:col-span-2">
              <p className="text-sm font-medium text-slate-300">Source and freshness</p>
              {sourceStatus.length ? <div className="mt-3 flex flex-wrap gap-2">{sourceStatus.map((source) => <span key={source.label} className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-xs text-slate-300">{source.label}: {source.status}{source.note ? ` · ${source.note}` : ""}</span>)}</div> : <p className="mt-3 text-xs leading-5 text-slate-400">Source-by-source status was not recorded in this snapshot. No verification claim is inferred.</p>}
              <p className="mt-3 text-[11px] text-slate-500">Snapshot captured {auditDate}. Evidence status is limited to the public signals available at that time.</p>
            </div>
          </div>
          {audit && (identity.abn || google.placeId) ? (
            <div className="dg-report-card mt-5 rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Observed business footprint</p><h3 className="mt-2 text-xl font-semibold text-white">Independent public signals</h3></div>
                <p className="text-xs text-slate-500">Source status shown below · no live verification claim</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {identity.abn ? <div className="rounded-xl border border-slate-700 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">ABN</p><p className="mt-2 font-semibold text-white">{identity.abn}</p><p className="mt-1 text-xs text-slate-400">{identity.registeredName || "Registered name not recorded"}</p></div> : null}
                {google.category ? <div className="rounded-xl border border-slate-700 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Google category</p><p className="mt-2 font-semibold capitalize text-white">{google.category}</p><p className="mt-1 text-xs text-slate-400">Google Places observation</p></div> : null}
                {typeof google.rating === "number" ? <div className="rounded-xl border border-slate-700 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Google reputation</p><p className="mt-2 text-xl font-semibold text-white">{google.rating.toFixed(1)} ★</p><p className="mt-1 text-xs text-slate-400">{google.reviewCount ?? "—"} public reviews</p></div> : null}
                {google.address ? <div className="rounded-xl border border-slate-700 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Local presence</p><p className="mt-2 text-sm font-semibold text-white">{google.address}</p><p className="mt-1 text-xs text-slate-400">Observed address</p></div> : null}
              </div>

            </div>
          ) : null}
        </section>

        {businessModel.type && businessModel.type !== "general" ? <section id="business-model" className="dg-report-section mt-9 rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Business understanding</p><h2 className="mt-2 text-2xl font-semibold text-white">{businessModel.subtype || pack.label}</h2></div><span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">{businessModel.confidence ?? "limited"} confidence</span></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div><p className="text-xs uppercase tracking-wide text-slate-500">Apparent offering</p><p className="mt-1 text-sm leading-6 text-slate-200">{businessModel.offering || "Not reliably identified from the available evidence."}</p><p className="mt-3 text-xs uppercase tracking-wide text-slate-500">Apparent audiences</p><p className="mt-1 text-sm leading-6 text-slate-200">{businessModel.audiences?.join(" · ") || "Not reliably identified."}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-slate-500">Conversion pathways</p><p className="mt-1 text-sm leading-6 text-slate-200">{businessModel.conversionPaths?.join(" · ") || "Not recorded."}</p><p className="mt-3 text-xs uppercase tracking-wide text-slate-500">Discovery channels</p><p className="mt-1 text-sm leading-6 text-slate-200">{businessModel.discoveryChannels?.join(" · ") || "Not recorded."}</p><p className="mt-3 text-xs uppercase tracking-wide text-slate-500">Market orientation</p><p className="mt-1 text-sm leading-6 text-slate-200">{businessModel.marketOrientation || "unknown"}{businessModel.isLocationBased === false ? " · location-based assumptions excluded" : ""}</p></div>
          </div>
          {businessModel.evidence?.length ? <p className="mt-4 border-t border-slate-700 pt-3 text-[11px] leading-5 text-slate-500">Evidence: {businessModel.evidence.join(" ")}</p> : null}
        </section> : null}

        <section id="opportunities" className="dg-report-section mt-9">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">The first three opportunities</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">What to focus on first</h2>
            </div>
            <a href="#evidence" className="text-sm text-violet-300">See the evidence ↓</a>
          </div>
          <p className="mt-3 max-w-4xl leading-7 text-slate-300">{verdict}</p>
          <div className="dg-premium-opportunities mt-5 grid gap-4 md:grid-cols-3">
            {priorities.map((priority, index) => (
              <article key={`${priority.title}-${index}`} data-index={String(index + 1).padStart(2, "0")} className="dg-report-card rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-violet-300">0{index + 1} · {priority.framework ? "Framework" : "Priority"}</span>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${priority.evidenceStatus === "confirmed_gap" ? "bg-amber-500/15 text-amber-200" : priority.evidenceStatus === "observed" ? "bg-emerald-500/15 text-emerald-200" : "bg-slate-500/15 text-slate-300"}`}>{priority.evidenceLabel}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold leading-tight text-white">{priority.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{priority.meaning}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-violet-300">Recommended action</p>
                <p className="mt-1 text-sm leading-6 text-violet-100">{priority.action}</p>
                <p className="mt-4 border-t border-slate-700 pt-3 text-[11px] leading-4 text-slate-500">{priority.source}{priority.freshness ? ` · captured ${new Date(priority.freshness).toLocaleDateString("en-AU")}` : ""}</p>
              </article>
            ))}
          </div>
          <a href={strategyUrl} className="dg-report-mobile-early-cta mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-violet-500 px-5 text-sm font-semibold text-white md:hidden">Discuss these three priorities</a>
        </section>

        <section id="industry" className="dg-report-section mt-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Industry context</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Opportunities specific to {pack.label}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">These are industry guidance shaped by the available audit context; they are not claims about competitors or commercial outcomes.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {insights.map((item, index) => (
              <article key={`${item.title}-${index}`} className="dg-report-card rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
                <div className="flex items-center justify-between gap-2"><h3 className="font-semibold text-white">{item.title}</h3>{item.framework ? <span className="text-[10px] uppercase tracking-wide text-slate-500">Framework</span> : null}</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.detail}</p>
                <p className="mt-3 text-sm leading-6 text-violet-200">{item.recommendedAction}</p>
              </article>
            ))}
          </div>
          {pack.key === "real_estate" && (Object.keys(publicProfiles).length > 0 || typeof realEstateJourney.hasAppraisalCta === "boolean") ? (
            <div className="dg-report-card mt-5 rounded-2xl border border-violet-500/25 bg-violet-950/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Vendor journey observations</p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-4"><h3 className="text-lg font-semibold text-white">Appraisal and local signals</h3>{acquisitionReadiness != null ? <p className="text-sm text-violet-200">Readiness {acquisitionReadiness}/100</p> : null}</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-slate-700 p-4 text-sm"><p className="text-slate-400">Appraisal pathway</p><p className="mt-1 font-semibold text-white">{realEstateJourney.hasAppraisalCta ? "Observed" : "Not observed"}</p></div><div className="rounded-xl border border-slate-700 p-4 text-sm"><p className="text-slate-400">Local-area mentions</p><p className="mt-1 font-semibold text-white">{realEstateJourney.suburbMentions ?? 0}</p></div></div>
            </div>
          ) : null}
        </section>

        <section className="dg-report-section mt-10">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="dg-report-card rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">What is already working</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Observed strengths</h2>
              <div className="mt-4 space-y-3">{strengths.length ? strengths.map((strength, index) => <div key={index} className="flex gap-3 text-sm leading-6 text-slate-300"><span className="text-emerald-300">✓</span><p>{strength}</p></div>) : <p className="text-sm text-slate-400">No strength evidence was recorded in this snapshot.</p>}</div>
            </div>
            <div className="dg-report-card rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Connected footprint</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Public profiles linked by the business</h2>
              {socialPresenceScore != null ? <p className="mt-2 text-sm text-slate-400">Social channel coverage {socialPresenceScore}/100 · 20 points per website-linked platform plus 20 for connected integration, capped at 100. Activity, audience and engagement are not assessed.</p> : <p className="mt-2 text-sm text-slate-400">No social channel coverage score was recorded. Channel coverage is not an activity or audience claim.</p>}
              <div className="mt-4 flex flex-wrap gap-2">{Object.entries(publicProfiles).map(([network, url]) => url ? <a key={network} href={url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm capitalize text-slate-200 transition hover:border-violet-400 hover:text-white" aria-label={`Open ${network} profile linked from the business website`}>{network} · website link ↗</a> : null)}{Object.keys(publicProfiles).length === 0 ? <p className="text-sm text-slate-400">No major social profile links were detected from the homepage.</p> : null}</div>
            </div>
          </div>
        </section>

        {blueprint.length ? <section id="growth-blueprint" className="dg-report-section dg-premium-blueprint mt-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">DigitalGate Growth Blueprint</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">How DigitalGate connects to the observed opportunities</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Only relevant capabilities are included. Findings are labelled separately from strategic hypotheses; no financial return is promised.</p>
          <div className="dg-blueprint-map mt-6" aria-label="DigitalGate capability map">
            <svg viewBox="0 0 900 250" role="img">
              <defs><linearGradient id="blueprint-line" x1="0" x2="1"><stop offset="0" stopColor="#B89A50" /><stop offset="1" stopColor="#7950C4" /></linearGradient></defs>
              <path d="M450 125 C300 20 220 40 120 70" fill="none" stroke="url(#blueprint-line)" strokeWidth="2" />
              <path d="M450 125 C450 40 450 30 450 18" fill="none" stroke="url(#blueprint-line)" strokeWidth="2" />
              <path d="M450 125 C600 20 700 40 790 70" fill="none" stroke="url(#blueprint-line)" strokeWidth="2" />
              <circle cx="450" cy="125" r="58" fill="#7950C4" />
              <text x="450" y="121" textAnchor="middle" fill="#fffdfa" fontSize="13" fontWeight="700">{report.prospect.businessName.slice(0, 20)}</text>
              <text x="450" y="138" textAnchor="middle" fill="#e8e3ef" fontSize="9">business objective</text>
              <circle cx="120" cy="70" r="42" fill="#EAE3D5" stroke="#B89A50" />
              <text x="120" y="69" textAnchor="middle" fill="#20283C" fontSize="10" fontWeight="700">{shortCapability(blueprint[0]?.capability || "Discovery")}</text>
              <text x="120" y="82" textAnchor="middle" fill="#6b604f" fontSize="8">capability 01</text>
              <circle cx="450" cy="18" r="0" fill="none" />
              <circle cx="450" cy="54" r="42" fill="#FFFDFA" stroke="#7950C4" />
              <text x="450" y="53" textAnchor="middle" fill="#20283C" fontSize="10" fontWeight="700">{shortCapability(blueprint[1]?.capability || "Conversion")}</text>
              <text x="450" y="66" textAnchor="middle" fill="#6b604f" fontSize="8">capability 02</text>
              <circle cx="780" cy="70" r="42" fill="#F5F1E8" stroke="#D8D0C2" />
              <text x="780" y="69" textAnchor="middle" fill="#20283C" fontSize="10" fontWeight="700">{shortCapability(blueprint[2]?.capability || "Measurement")}</text>
              <text x="780" y="82" textAnchor="middle" fill="#6b604f" fontSize="8">capability 03</text>
            </svg>
          </div>
          <div className="mt-6 space-y-5">{blueprint.map((item, index) => <article key={`${item.capability}-${index}`} className="dg-blueprint-card grid gap-5 rounded-2xl border p-6 lg:grid-cols-[0.8fr_1.4fr]">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-violet-300">0{index + 1} · {item.capability}</p><h3 className="mt-2 text-lg font-semibold text-white">{item.objective}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{item.evidenceType === "verified_finding" ? "Verified finding" : "Strategic hypothesis"} · {item.evidence}</p></div>
            <div className="grid gap-3 sm:grid-cols-2"><div><p className="text-xs uppercase tracking-wide text-slate-500">Proposed action</p><p className="mt-1 text-sm leading-6 text-slate-200">{item.action}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-500">Intended benefit</p><p className="mt-1 text-sm leading-6 text-slate-200">{item.benefit}</p></div><div className="sm:col-span-2"><p className="text-xs uppercase tracking-wide text-slate-500">Success indicator</p><p className="mt-1 text-sm leading-6 text-violet-200">{item.measure}</p></div></div>
          </article>)}</div>
        </section> : null}

        <section id="evidence-list" className="dg-report-section mt-10">
          <details className="dg-report-screen-only rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
            <summary className="cursor-pointer text-lg font-semibold text-white">All findings and evidence <span className="text-sm font-normal text-slate-400">({findings.length})</span></summary>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {findings.length ? findings.map((finding, index) => {
                const evidence = evidenceForFinding(finding, audit?.auditedAt);
                return <article key={`${finding.title}-${index}`} className="rounded-xl border border-slate-700 bg-slate-950/40 p-5">
                  <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${evidence.status === "observed" ? "bg-emerald-500/15 text-emerald-200" : evidence.status === "confirmed_gap" ? "bg-amber-500/15 text-amber-200" : "bg-slate-500/15 text-slate-300"}`}>{evidenceStatusLabel(evidence.status)}</span><span className="text-[11px] uppercase tracking-wide text-slate-500">{evidence.source}</span></div>
                  <h3 className="mt-3 font-semibold text-white">{commercialHeadlineFor(finding)}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{businessMeaningFor(finding)}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Evidence observed</p><p className="mt-1 text-sm text-slate-400">{finding.observed || finding.detail || "No direct observation text was recorded."}</p>
                  {finding.recommendedAction ? <><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-violet-300">Recommended action</p><p className="mt-1 text-sm leading-6 text-violet-100">{finding.recommendedAction}</p></> : null}
                  <p className="mt-3 text-[11px] text-slate-500">{evidence.freshness ? `Freshness: ${new Date(evidence.freshness).toLocaleDateString("en-AU")}` : "Freshness: not recorded"}</p>
                </article>;
              }) : <p className="text-sm text-slate-400">The snapshot does not contain individual findings.</p>}
            </div>
          </details>
        </section>

        <section className="dg-report-print-only dg-report-section mt-8">
          <h2>Findings appendix</h2>
          <p className="mt-2 text-sm text-slate-400">Full evidence captured in this snapshot. Source and freshness are shown where recorded.</p>
          <div className="mt-5 space-y-4">
            {findings.map((finding, index) => {
              const evidence = evidenceForFinding(finding, audit?.auditedAt);
              return <article key={`print-${finding.title}-${index}`} className="dg-report-card rounded-xl border border-slate-300 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">{evidenceStatusLabel(evidence.status)} · {evidence.source}</p>
                <h3 className="mt-2 font-semibold text-slate-900">{commercialHeadlineFor(finding)}</h3>
                {finding.title && finding.title !== commercialHeadlineFor(finding) ? <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">Technical finding · {finding.title}</p> : null}
                <p className="mt-1 text-sm text-slate-700">{finding.observed || finding.detail || "No direct observation text was recorded."}</p>
                {finding.recommendedAction ? <p className="mt-2 text-sm text-slate-700"><b>Action:</b> {finding.recommendedAction}</p> : null}
                <p className="mt-1 text-[11px] text-slate-500">{evidence.freshness ? `Freshness: ${new Date(evidence.freshness).toLocaleDateString("en-AU")}` : "Freshness: not recorded"}</p>
              </article>;
            })}
            {findings.length === 0 ? <p className="text-sm text-slate-500">No individual findings were recorded.</p> : null}
          </div>
        </section>

        {solutionMatches.length ? <section className="dg-report-section mt-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">DigitalGate opportunity map</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Where DigitalGate connects to the evidence</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Only evidenced capability matches are shown. These are not competitor claims or guaranteed outcomes.</p>
          <div className="mt-5 space-y-4">{solutionMatches.map((match, index) => <article key={index} className="dg-report-card grid gap-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 lg:grid-cols-[0.8fr_1.4fr_1.4fr]"><div><p className="text-xs font-semibold uppercase tracking-wide text-violet-300">{match.relevance === "high" ? "High relevance" : "Relevant"}</p><h3 className="mt-1 font-semibold text-white">{match.capability}</h3><p className="mt-2 text-xs text-slate-400">{match.evidence}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-500">Opportunity</p><p className="mt-1 text-sm leading-6 text-slate-300">{match.opportunity}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-500">Potential benefit</p><p className="mt-1 text-sm leading-6 text-slate-300">{match.benefit}</p></div></article>)}</div>
        </section> : null}

        <section id="roadmap" className="dg-report-section mt-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">90-day opportunity roadmap</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">A sequence based on this evidence</h2>
          <div className="dg-premium-timeline mt-5 grid gap-4 md:grid-cols-3">{roadmap.map((phase) => <div key={phase.period} className="dg-report-card rounded-xl border border-slate-700 bg-slate-900/70 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-violet-400">{phase.period}</p><h3 className="mt-2 font-semibold text-white">{phase.title}</h3><p className="mt-3 text-sm leading-6 text-slate-300">{phase.action}</p><p className="mt-3 text-[11px] text-slate-500">{phase.evidenceLed ? "Grounded in an audit finding" : "Framework guidance — not observed in this snapshot"}</p></div>)}</div>
        </section>

        <section className="dg-report-section mt-10 rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Strategy Session discovery</p>
          <h2 className="mt-2 text-xl font-semibold text-white">What public evidence cannot tell us</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">These areas require the business&apos;s own context. They are discovery questions for the Strategy Session, not confirmed deficiencies.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{discoveryQuestions.map((item) => <div key={item} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300">{item}</div>)}</div>
        </section>

        <section id="next-step" className="dg-report-section dg-premium-strategy mt-10 rounded-2xl p-7 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">Next step</p><h2 className="mt-2 text-2xl font-semibold text-white">Turn these opportunities into a practical plan</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">Book a DigitalGate Strategy Session to review the evidence, identify the highest-value priorities and agree the next practical step. There is no obligation to proceed.</p>
          <div className="mt-5 flex flex-wrap gap-3"><a href={strategyUrl} className="inline-flex min-h-11 items-center rounded-xl bg-violet-500 px-5 text-sm font-semibold text-white hover:bg-violet-400">Book a Strategy Session</a><a href="mailto:hello@digitalgate.com.au" className="inline-flex min-h-11 items-center rounded-xl border border-violet-300/30 px-5 text-sm font-semibold text-violet-100">Ask a question</a></div>
        </section>

        <section className="dg-report-section mt-8 rounded-xl border border-slate-800 bg-slate-950/60 p-5">
          <h2 className="text-sm font-semibold text-white">Method and limits</h2><p className="mt-2 text-xs leading-5 text-slate-400">This report is based on observable public signals captured by DigitalGate at the time of the audit. Scores are directional rather than guarantees of search rankings, leads or revenue. The composite is weighted only across assessed pillars: website 22%, search 20%, AI readiness 20%, reputation 14%, conversion 14% and growth signals 10%; weights are renormalised if a pillar is unavailable. Pillar coverage and source coverage are reported separately. AI Discoverability Readiness measures observable technical readiness, not actual AI search visibility or ranking. Social channel coverage measures website-linked channels, not activity, audience or engagement. Growth Signals combines observed social links, analytics markers, conversion forms and sampled service, pricing or trial pages; it does not represent revenue or demand. Analytics non-detection is limited evidence, not a confirmed absence. Source status and freshness are shown where recorded; unavailable evidence is not treated as a negative result. Recommendations should be validated against business objectives, systems and the customer journey before implementation. Public share links are capability-protected; staff previews are tenant-scoped.</p>
              {assessment.sourceNotes?.length ? <p className="mt-2 text-xs leading-5 text-slate-500">{assessment.sourceNotes.join(" ")}</p> : null}
        </section>
        <footer className="mt-8 border-t border-slate-700 pt-5 text-xs text-slate-500">DigitalGate · AI-powered Business Operating Platform · The Gateway to Your Digital World™</footer>
      </div>

      <div className="dg-report-mobile-cta"><span>Ready to discuss the evidence?</span><a href={strategyUrl}>Book a Strategy Session</a></div>

      {access.kind === "preview" ? <p className="dg-report-print-only">Staff preview — engagement is not recorded.</p> : null}
    </main>
  );
}
