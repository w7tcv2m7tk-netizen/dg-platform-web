import { notFound } from "next/navigation";
import { loadGrowthReportSnapshot } from "@dg/platform-core/command-centre/growth-engine/report-snapshot";
import { prospectReportAccess } from "@/lib/prospect-report-access";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

type Finding = { title?: string; detail?: string; observed?: string; interpretation?: string; recommendedAction?: string; category?: string; domain?: string; severity?: string };
type SolutionMatch = { capability?: string; opportunity?: string; evidence?: string; benefit?: string; relevance?: string };
type BusinessIntelligence = {
  identity?: { abn?: string; registeredName?: string; registeredLocation?: string };
  google?: { placeId?: string; rating?: number; reviewCount?: number; category?: string; address?: string; phone?: string; website?: string; mapsUri?: string };
  publicProfiles?: { facebook?: string; instagram?: string; linkedin?: string; youtube?: string; tiktok?: string };
  realEstateJourney?: { hasAppraisalCta?: boolean; hasAppraisalForm?: boolean; suburbMentions?: number; acquisitionReadiness?: { score?: number; appraisalPath?: number; localAuthority?: number; reputation?: number; socialPresence?: number; discoverability?: number } };
  socialAssessment?: { score?: number; channelCount?: number; basis?: string; activityStatus?: string; audienceStatus?: string; engagementStatus?: string };
  sourceStatus?: Record<string,{status?:string;note?:string}>;
};
type AuditPayload = { items?: Finding[]; strengths?: string[]; industryInsights?: Array<{title?:string;detail?:string;recommendedAction?:string}>; scorecard?: Record<string,number|null>; researchContext?: Record<string,unknown>; digitalGateSolutionMatches?: SolutionMatch[]; businessIntelligence?: BusinessIntelligence };
function auditPayload(value: unknown): AuditPayload { return value && typeof value === "object" ? value as AuditPayload : {}; }
function findingsFrom(value: unknown): Finding[] {
  if (!value || typeof value !== "object") return [];
  const items = (value as { items?: unknown }).items;
  return Array.isArray(items) ? items.filter((x): x is Finding => Boolean(x && typeof x === "object")) : [];
}
function scoreLabel(value: number | null) {
  if (value == null) return "Not assessed";
  if (value >= 75) return "Strong foundation";
  if (value >= 50) return "Room to improve";
  return "Priority opportunity";
}
function businessMeaning(f: Finding) {
  const title=(f.title||"").toLowerCase();
  if(title.includes("h1")) return "A clearer primary page topic can help search engines and visitors understand what this page is about.";
  if(title.includes("open graph")) return "Improved social sharing metadata helps links present more professionally when customers share or encounter the business online.";
  if(title.includes("structured data") || title.includes("schema")) return "Structured business information can make it easier for Google and AI systems to understand the organisation, services, location and entity relationships.";
  return f.interpretation || "This finding represents a practical opportunity to strengthen digital visibility, customer experience or conversion.";
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
  const findings = findingsFrom(audit?.findings);
  const strengths = Array.isArray(payload.strengths) ? payload.strengths : [];
  const industryInsights = Array.isArray(payload.industryInsights) ? payload.industryInsights : [];
  const scorecard = payload.scorecard || {};
  const solutionMatches = Array.isArray(payload.digitalGateSolutionMatches) ? payload.digitalGateSolutionMatches : [];
  const intelligence = payload.businessIntelligence || {};
  const identity = intelligence.identity || {};
  const google = intelligence.google || {};
  const publicProfiles = intelligence.publicProfiles || {};
  const realEstateJourney = intelligence.realEstateJourney || {};
  const socialAssessment = intelligence.socialAssessment || {};
  const socialPresenceScore = typeof socialAssessment.score === "number" ? socialAssessment.score : null;
  const acquisitionReadiness = typeof realEstateJourney.acquisitionReadiness?.score === "number" ? realEstateJourney.acquisitionReadiness.score : null;
  const commercialRank = (finding: Finding) => {
    const haystack = `${finding.category || ""} ${finding.domain || ""} ${finding.title || ""}`.toLowerCase();
    let score = finding.severity === "critical" ? 40 : finding.severity === "warning" ? 25 : 15;
    if (/vendor|appraisal|conversion|lead|reputation|local authority|google|crm|follow-up/.test(haystack)) score += 45;
    if (/ai.visibility|structured|schema|seo/.test(haystack)) score += 25;
    if (/open graph|h1/.test(haystack)) score -= 10;
    return score;
  };
  const customerSafeText = (value?: string | null) => {
    if (!value) return value || "";
    if (/strong opening for a DigitalGate conversation/i.test(value)) {
      return value.replace(/\s*[—-]\s*strong opening for a DigitalGate conversation\.?/i, ".");
    }
    if (/lead with website health\s*\+\s*ai visibility in the opportunity report/i.test(value)) {
      return "Prioritise the weakest verified foundations first, then re-measure the Business Health Score.";
    }
    return value;
  };
  const customerFindings = findings.map((finding) => ({
    ...finding,
    observed: customerSafeText(finding.observed),
    detail: customerSafeText(finding.detail),
    interpretation: customerSafeText(finding.interpretation),
    recommendedAction: customerSafeText(finding.recommendedAction),
  }));
  const rankedFindings = [...customerFindings].sort((a,b) => commercialRank(b) - commercialRank(a));

  const scores = audit ? [["Business Health",audit.businessHealth,"Overall digital readiness"],["AI Visibility",audit.aiVisibility,"How clearly AI/search systems can understand the business"],["SEO",audit.seoScore,"Organic search foundations"],["Website Health",audit.websiteHealth,"Technical and on-page website foundations"]] as const : [];

  return (
    <main className="min-h-screen bg-[#05091a] text-slate-100">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:py-16">
        {access.kind === "preview" ? <p className="mb-6 text-sm text-amber-200">Staff preview — this access does not record prospect engagement.</p> : null}
        <header className="border-b border-slate-700 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-400">DigitalGate · Digital Opportunity Report</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">{report.prospect.businessName}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">An evidence-based review of your current digital position, highlighting practical opportunities to improve visibility, customer acquisition and digital operations.</p>
          <p className="mt-3 text-xs text-slate-500">Prepared {report.generatedAt.toLocaleDateString("en-AU",{day:"numeric",month:"long",year:"numeric"})} · Evidence captured {audit.auditedAt.toLocaleDateString("en-AU")} · Based on observable public digital signals · DigitalGate diagnostic scoring</p>
        </header>

        {audit && (identity.abn || google.placeId) ? <section className="mt-8 rounded-2xl border border-violet-500/25 bg-slate-900/70 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Business intelligence profile</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Verified business footprint</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Identity and local-presence details below are matched against independent public business data sources, separate from DigitalGate&apos;s interpretation.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {identity.abn ? <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">ABN</p><p className="mt-2 font-semibold text-white">{identity.abn}</p><p className="mt-1 text-xs text-slate-400">{identity.registeredName || "ABR verified"}</p></div> : null}
            {google.category ? <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Google category</p><p className="mt-2 font-semibold capitalize text-white">{google.category}</p><p className="mt-1 text-xs text-slate-400">Google Places</p></div> : null}
            {typeof google.rating === "number" ? <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Google reputation</p><p className="mt-2 text-xl font-semibold text-white">{google.rating.toFixed(1)} ★</p><p className="mt-1 text-xs text-slate-400">{google.reviewCount ?? "—"} public reviews</p></div> : null}
            {google.address ? <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Local presence</p><p className="mt-2 text-sm font-semibold text-white">{google.address}</p><p className="mt-1 text-xs text-slate-400">Google Places verified</p></div> : null}
          </div>
        </section> : null}

        {audit && (Object.keys(publicProfiles).length > 0 || typeof realEstateJourney.hasAppraisalCta === "boolean") ? <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Connected digital footprint</p>
            <div className="flex items-end justify-between gap-4"><h2 className="mt-2 text-xl font-semibold text-white">Public profiles linked by the business</h2>{socialPresenceScore != null ? <div className="text-right"><p className="text-xs uppercase tracking-wide text-slate-500">Social presence</p><p className="text-2xl font-semibold text-white">{socialPresenceScore}<span className="text-xs text-slate-500">/100</span></p><p className="mt-1 max-w-40 text-[10px] leading-4 text-slate-500">Website-linked channel coverage only; activity, audience and engagement are not assessed.</p></div> : null}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(publicProfiles).map(([network,url]) => url ? <a key={network} href={url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm capitalize text-slate-200 transition hover:border-violet-400 hover:text-white" aria-label={`Open ${network} profile verified from the business website`}>{network} · verified website link ↗</a> : null)}
              {Object.keys(publicProfiles).length === 0 ? <p className="text-sm text-slate-400">No major social profile links were detected from the homepage.</p> : null}
            </div>
          </div>
          <div className="rounded-2xl border border-violet-500/25 bg-violet-950/20 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Real Estate acquisition intelligence</p>
            <div className="flex items-end justify-between gap-4"><h2 className="mt-2 text-xl font-semibold text-white">Vendor journey signals</h2>{acquisitionReadiness != null ? <div className="text-right"><p className="text-xs uppercase tracking-wide text-violet-300">Acquisition readiness</p><p className="text-2xl font-semibold text-white">{acquisitionReadiness}<span className="text-xs text-slate-500">/100</span></p></div> : null}</div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-slate-700 p-4"><p className="text-slate-400">Appraisal pathway</p><p className="mt-1 font-semibold text-white">{realEstateJourney.hasAppraisalCta ? "Detected" : "Opportunity"}</p></div>
              <div className="rounded-xl border border-slate-700 p-4"><p className="text-slate-400">Local-area signals</p><p className="mt-1 font-semibold text-white">{realEstateJourney.suburbMentions ?? 0} homepage mentions</p></div>
            </div>
          </div>
        </section> : null}

        {audit ? <>
          <section className="mt-9">
            <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Executive snapshot</p><h2 className="mt-2 text-2xl font-semibold text-white">Where things stand today</h2></div></div>
            <p className="mt-3 max-w-4xl leading-7 text-slate-300">The audit shows a workable website foundation, with the strongest immediate upside in search structure and AI/search discoverability. The scores below are directional indicators designed to identify where focused improvements could create the most value.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {scores.map(([label,value,description]) => <div key={label} className="rounded-xl border border-slate-700 bg-slate-900/70 p-5"><p className="text-sm font-medium text-slate-300">{label}</p><p className="mt-2 text-3xl font-semibold text-white">{value ?? "—"}<span className="text-base text-slate-500">/100</span></p><p className="mt-2 text-xs font-medium text-violet-300">{scoreLabel(value)}</p><p className="mt-2 text-xs leading-5 text-slate-400">{description}</p></div>)}
            </div>
          </section>

          <section className="mt-10 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Digital strengths</p>
              <h2 className="mt-2 text-xl font-semibold text-white">What is already working</h2>
              <div className="mt-4 space-y-3">{strengths.length ? strengths.slice(0,6).map((strength,i)=><div key={i} className="flex gap-3 text-sm leading-6 text-slate-300"><span className="text-emerald-300">✓</span><p>{strength}</p></div>) : <p className="text-sm text-slate-400">The current audit is focused on opportunity signals. Re-run Research to populate the richer strengths profile.</p>}</div>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Six-pillar intelligence</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Beyond the headline score</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {[["Reputation",scorecard.reputation],["Conversion",scorecard.conversionReadiness],["Growth signals",scorecard.growthSignals],["Search",scorecard.searchVisibility]].map(([label,value])=><div key={String(label)} className="rounded-lg border border-slate-700 p-3"><p className="text-slate-400">{label}</p><p className="mt-1 text-lg font-semibold text-white">{value ?? "—"}<span className="text-xs text-slate-500">/100</span></p></div>)}
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-400">These DigitalGate diagnostic scores are calculated from observable public website and business-profile signals captured at audit time. They are directional indicators, not third-party rankings or guarantees of search performance, leads or revenue.</p>
            </div>
          </section>

          {industryInsights.length ? <section className="mt-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Industry intelligence</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Opportunities specific to {report.prospect.industry || "this business"}</h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">{industryInsights.map((item,i)=><article key={i} className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5"><h3 className="font-semibold text-white">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{item.detail}</p><p className="mt-4 text-sm leading-6 text-violet-200">{item.recommendedAction}</p></article>)}</div>
          </section> : null}

          <section className="mt-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Opportunity analysis</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">What we found — and why it matters</h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {rankedFindings.slice(0,6).map((f,i)=><article key={i} className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
                <div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-semibold text-violet-300">{i+1}</span><div>
                  <h3 className="font-semibold text-white">{f.title || "Digital opportunity"}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{businessMeaning(f)}</p>
                  <div className="mt-4 border-l-2 border-slate-700 pl-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evidence observed</p><p className="mt-1 text-sm text-slate-400">{f.observed || f.detail || "Evidence recorded in the DigitalGate audit."}</p></div>
                  {f.recommendedAction ? <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-violet-400">Recommended action</p><p className="mt-1 text-sm leading-6 text-violet-200">{f.recommendedAction}</p></div>:null}
                </div></div>
              </article>)}
            </div>
          </section>

          <section className="mt-10 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">Priority plan</p><h2 className="mt-2 text-2xl font-semibold text-white">What we would address first</h2>
              <ol className="mt-5 space-y-4">{rankedFindings.slice(0,3).map((f,i)=><li key={i} className="flex gap-3"><span className="font-semibold text-violet-300">0{i+1}</span><div><p className="font-medium text-white">{f.recommendedAction || f.interpretation || f.title}</p><p className="mt-1 text-sm leading-6 text-slate-300">{businessMeaning(f)}</p></div></li>)}</ol>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">The bigger opportunity</p><h2 className="mt-2 text-xl font-semibold text-white">From audit to growth system</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">These findings are not just isolated website fixes. DigitalGate can connect visibility, lead capture, CRM, follow-up, automation and business intelligence so improvements become part of an ongoing customer-acquisition system.</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-300"><li>• Improve search and AI visibility foundations</li><li>• Strengthen lead capture and conversion pathways</li><li>• Centralise prospect and customer follow-up</li><li>• Automate repetitive marketing and communication</li><li>• Measure what is producing commercial results</li></ul>
            </div>
          </section>
        </> : <p className="mt-8 text-slate-300">The underlying audit is unavailable.</p>}

        {solutionMatches.length ? <section className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">DigitalGate opportunity map</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Where DigitalGate directly connects to the opportunities found</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">These are not generic product recommendations. Each match is derived from evidence observed during the business intelligence review.</p>
          <div className="mt-5 space-y-4">{solutionMatches.map((match,i)=><article key={i} className="grid gap-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 lg:grid-cols-[0.8fr_1.4fr_1.4fr]"><div><p className="text-xs font-semibold uppercase tracking-wide text-violet-300">{match.relevance === "high" ? "High relevance" : "Relevant"}</p><h3 className="mt-1 font-semibold text-white">{match.capability}</h3><p className="mt-2 text-xs text-slate-400">{match.evidence}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-500">Opportunity</p><p className="mt-1 text-sm leading-6 text-slate-300">{match.opportunity}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-500">Potential benefit</p><p className="mt-1 text-sm leading-6 text-slate-300">{match.benefit}</p></div></article>)}</div>
        </section> : null}

        <section className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">90-day opportunity roadmap</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">A practical sequence, not a list of disconnected fixes</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {[["0–30 days","Foundation","Strengthen the business entity, search and AI foundations first: implement structured data, clarify page hierarchy and preserve the verified local-business signals already working."],["31–60 days","Visibility & conversion","Improve how the business is discovered and presented across search and social, then strengthen the appraisal journey so seller intent moves cleanly from visibility to enquiry."],["61–90 days","Systemise growth","Connect appraisal and property enquiries to CRM, follow-up automation and reporting so vendor and buyer opportunities become a measurable relationship pipeline."]].map(([period,title,action])=><div key={String(period)} className="rounded-xl border border-slate-700 bg-slate-900/70 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-violet-400">{String(period)}</p><h3 className="mt-2 font-semibold text-white">{String(title)}</h3><p className="mt-3 text-sm leading-6 text-slate-300">{String(action)}</p></div>)}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-violet-400/40 bg-gradient-to-br from-violet-500/20 to-slate-900 p-7 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">Next step</p><h2 className="mt-2 text-2xl font-semibold text-white">Turn these opportunities into a practical plan</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">Book a DigitalGate Strategy Session to review these findings, identify the highest-value priorities for your business and turn the strongest opportunities into a practical next-step plan. There is no obligation to proceed.</p>
          <a href="https://digitalgate.com.au/strategy-session" className="mt-5 inline-flex rounded-lg bg-violet-500 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-400">Book a Strategy Session</a>
        </section>

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-950/60 p-5">
          <h2 className="text-sm font-semibold text-white">About this report</h2><p className="mt-2 text-xs leading-5 text-slate-400">This report is based on observable public signals captured by DigitalGate at the time of the audit. Scores are directional rather than guarantees of search rankings, leads or revenue. Recommendations should be validated against your business objectives, systems and customer journey before implementation.</p>
        </section>
        <footer className="mt-10 border-t border-slate-700 pt-5 text-xs text-slate-400">DigitalGate · AI-powered Business Operating Platform · The Gateway to Your Digital World™</footer>
      </div>
    </main>
  );
}
