import Link from "next/link";
import { ProspectRelationshipForm } from "@/components/prospecting/ProspectRelationshipForm";
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
  socialAssessment?: { score?: number; channelCount?: number; basis?: string; activityStatus?: string; audienceStatus?: string; engagementStatus?: string };
  realEstateJourney?: {
    hasAppraisalCta?: boolean; hasAppraisalForm?: boolean; suburbMentions?: number;
    acquisitionReadiness?: { score?: number; appraisalPath?: number; localAuthority?: number; reputation?: number; socialPresence?: number; discoverability?: number };
  };
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
const REAL_ESTATE_SOURCE_KEYS = new Set(["propertyMarketIntelligence", "domainMarketplace", "reaMarketplace", "industryCredentials"]);

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
  const existingReport = await prisma.growthProspectReport.findFirst({
    where: { prospectId: prospect.id, revokedAt: null },
    orderBy: { generatedAt: "desc" },
    select: { id: true, shareToken: true, generatedAt: true },
  });
  const findings = findingsFrom(audit?.findings);
  const probes = probesFrom(audit?.findings);
  const businessIntelligence = businessIntelligenceFrom(audit?.findings);
  const intelligenceSources = sourceStatusFrom(audit?.findings);
  const publicProfiles = businessIntelligence.publicProfiles ?? {};
  const socialAssessment = businessIntelligence.socialAssessment ?? {};
  const realEstateJourney = businessIntelligence.realEstateJourney ?? {};
  const acquisitionReadiness = realEstateJourney.acquisitionReadiness ?? {};
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
  const [companies, contacts, memberships] = await Promise.all([
    sessionHasFeature(session, "crm.companies.write") ? prisma.company.findMany({ where: { organisationId: session.organisationId, deletedAt: null }, orderBy: { name: "asc" }, take: 200, select: { id: true, name: true, abn: true, website: true, email: true, phone: true, identityProvenance: true } }) : [],
    sessionHasFeature(session, "crm.contacts.write") ? prisma.contact.findMany({ where: { organisationId: session.organisationId, deletedAt: null }, orderBy: { firstName: "asc" }, take: 200, select: { id: true, firstName: true, lastName: true, email: true, phone: true, companyId: true } }) : [],
    prisma.membership.findMany({ where: { clerkUserId: session.clerkUserId, status: "active", role: { in: ["owner", "admin"] } }, select: { organisation: { select: { id: true, name: true } } } }),
  ]);
  const canWrite = sessionHasFeature(session, "prospecting.prospects.write");
  const canQualify = Boolean(prospect.contactName && (prospect.contactPhone || prospect.contactEmail));
  const normaliseDomain = (value?: string | null) => {
    try { return new URL(value?.includes("://") ? value : `https://${value ?? ""}`).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
  };
  const normaliseName = (value?: string | null) => (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const provenance = (value: unknown) => {
    if (!value || typeof value !== "object") return "";
    const record = value as { provider?: string; verifiedAt?: string };
    return [record.provider ? `provider ${record.provider}` : "", record.verifiedAt ? `verified ${new Date(record.verifiedAt).toLocaleDateString("en-AU")}` : ""].filter(Boolean).join(" · ");
  };
  const prospectDomain = normaliseDomain(prospect.websiteUrl);
  const companySuggestions = companies.flatMap((company) => {
    const evidence: string[] = [];
    if (prospect.abn && company.abn === prospect.abn) evidence.push(`ABN match${provenance(company.identityProvenance) ? ` (${provenance(company.identityProvenance)})` : ""}`);
    if (prospectDomain && normaliseDomain(company.website) === prospectDomain) evidence.push("Website domain matches");
    if (normaliseName(company.name) === normaliseName(prospect.businessName)) evidence.push("Business name matches");
    if (prospect.contactEmail && company.email?.toLowerCase() === prospect.contactEmail.toLowerCase()) evidence.push("Email matches");
    if (prospect.contactPhone && company.phone && prospect.contactPhone.replace(/\s/g, "") === company.phone.replace(/\s/g, "")) evidence.push("Phone matches");
    if (evidence.length && (company.website || company.phone || company.email)) evidence.push("CRM has additional contact details");
    return evidence.length ? [{ id: company.id, label: company.name, evidence: evidence.join(" · "), website: company.website ?? undefined, email: company.email ?? undefined, phone: company.phone ?? undefined }] : [];
  });
  const contactSuggestions = contacts.flatMap((contact) => {
    const evidence: string[] = [];
    if (prospect.contactEmail && contact.email?.toLowerCase() === prospect.contactEmail.toLowerCase()) evidence.push("Email matches prospect contact");
    if (prospect.contactPhone && contact.phone && prospect.contactPhone.replace(/\s/g, "") === contact.phone.replace(/\s/g, "")) evidence.push("Phone matches prospect contact");
    if (normaliseName(`${contact.firstName} ${contact.lastName}`) === normaliseName(prospect.contactName)) evidence.push("Contact name matches");
    return evidence.length ? [{ id: contact.id, label: [contact.firstName, contact.lastName].filter(Boolean).join(" "), evidence: evidence.join(" · "), email: contact.email ?? undefined, phone: contact.phone ?? undefined }] : [];
  });
  const canGenerateReport = Boolean(audit && contentAccessible);
  const reportUrl = existingReport ? `/opportunity-report/${existingReport.shareToken}?preview=1` : null;
  const isRealEstateIndustry = /real\s*estate|property|buyers agency|realtor|realty/i.test(prospect.industry ?? "");
  const sourceEntries = Object.entries(SOURCE_LABELS).filter(([key]) => !REAL_ESTATE_SOURCE_KEYS.has(key) || isRealEstateIndustry);
  const metadata = (prospect.metadata as Record<string, unknown> | null) ?? {};
  const hasLinkedCompany = typeof metadata.crm_company_id === "string";
  const hasSuggestedWebsite = companySuggestions.some((suggestion) => Boolean(suggestion.website));
  const reportReadiness = existingReport
    ? { label: "Existing report available", detail: `A snapshot generated ${new Date(existingReport.generatedAt).toLocaleDateString("en-AU")} can be previewed without regenerating it.` }
    : !audit
      ? { label: "No report yet", detail: "Complete research before preparing a report. A missing website is recorded as a limitation rather than blocking the report." }
      : !contentAccessible
        ? { label: "Report unavailable", detail: "The website blocked the research probe. A prospect-facing report cannot be prepared from unverified content." }
        : { label: "Ready to prepare", detail: "The audit evidence is available. Prepare a snapshot when you are ready to review the prospect-facing version." };
  const researchSteps = [
    { label: "Business identified", detail: prospect.abn ? `ABN ${prospect.abn} verified` : "Verify the ABN or choose an existing CRM match.", complete: Boolean(prospect.abn), href: "#business-identity", action: prospect.abn ? null : "Review identity" },
    { label: "Verified identity", detail: prospect.abn ? `ABN ${prospect.abn}${prospect.websiteUrl?.trim() ? ` · ${prospect.websiteUrl}` : " · website not identified"}` : prospect.websiteUrl?.trim() ? `Website ${prospect.websiteUrl} — verify the ABN to complete identity.` : "Verify the ABN or choose an existing CRM match. A website is optional for research.", complete: Boolean(prospect.abn), href: "#business-identity", action: prospect.abn ? null : "Review identity" },
    { label: "Research evidence", detail: audit ? `Audit captured ${new Date(audit.auditedAt).toLocaleDateString("en-AU")}` : "Run research to gather observable public evidence.", complete: Boolean(audit), href: "#audit-evidence", action: audit ? null : "Start research" },
    { label: "Findings reviewed", detail: findings.length ? `${findings.length} finding${findings.length === 1 ? "" : "s"} recorded` : audit ? "No findings recorded in this audit." : "Evidence is required first.", complete: findings.length > 0, href: "#audit-evidence", action: findings.length ? null : "Review evidence" },
    { label: "Digital Opportunity Report", detail: existingReport ? "Existing snapshot available for preview." : canGenerateReport ? "Evidence is ready to prepare a report." : reportReadiness.detail, complete: Boolean(existingReport), href: "#opportunity-report", action: existingReport || canGenerateReport ? "Open report section" : null },
  ];

  const isResearch = prospect.stage === "audit_created";
  const isDiscovered = prospect.stage === "prospect";
  const researchDisabledReason = undefined;
  const decisionMakerDisabledReason = !isResearch
    ? isDiscovered
      ? "Start research first. Decision-maker research becomes available during Research once a website is identified."
      : "Decision-maker research is available during Research. Use Edit to update contact details in this lifecycle stage."
    : !prospect.websiteUrl
      ? "Add the business website in Edit to search its public pages for a decision-maker."
      : undefined;

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
            {reportUrl ? <a href={reportUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-violet-500/40 px-3 py-2 text-sm font-medium text-violet-200 hover:bg-violet-500/10">Open existing report</a> : canGenerateReport ? <a href="#opportunity-report" className="rounded-lg border border-violet-500/40 px-3 py-2 text-sm font-medium text-violet-200 hover:bg-violet-500/10">Prepare report</a> : <span role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-100" title={reportReadiness.detail}>Report not ready</span>}
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-violet-200">{score.contactPriority != null ? "Contact priority" : "Research priority"}</p>
            <p className="mt-1 text-2xl font-semibold text-white">{score.score}</p>
            <p className="text-xs text-slate-400">{score.bandLabel}</p>
            </div>
          </div>
        </div>
        {!reportUrl && !canGenerateReport ? <p className="text-xs leading-5 text-amber-200/90">{reportReadiness.detail}</p> : null}
        <section className="dg-card" aria-label="Research progress">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-violet-300">Research progress</p><h2 className="mt-2 text-lg font-semibold text-white">From identity to a conversation-ready report</h2></div><p className="text-xs text-slate-500">Only stages backed by this prospect record are marked complete.</p></div>
          <ol className="mt-4 grid gap-2 md:grid-cols-5">
            {researchSteps.map((step, index) => <li key={step.label} className={`rounded-lg border p-3 ${step.complete ? "border-emerald-500/25 bg-emerald-500/5" : "border-slate-800 bg-slate-950/40"}`}>
              <div className="flex items-center gap-2"><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${step.complete ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-800 text-slate-400"}`}>{step.complete ? "✓" : index + 1}</span><p className="text-sm font-medium text-white">{step.label}</p></div>
              <p className="mt-2 text-xs leading-5 text-slate-400">{step.detail}</p>
              {step.action && !step.complete ? <a href={step.href} className="mt-2 inline-block text-xs font-semibold text-violet-300 hover:underline">{step.action} →</a> : null}
            </li>)}
          </ol>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Business & decision-maker</p>
            <div className="mt-4 space-y-2 text-sm">
              <p><span className="text-slate-500">Website:</span> <span className="text-slate-200">{prospect.websiteUrl || "Not identified"}</span></p>
              <p><span className="text-slate-500">Decision-maker:</span> <span className="text-slate-200">{prospect.contactName || "Not identified"}</span></p>
              <p><span className="text-slate-500">Phone:</span> <span className="text-slate-200">{prospect.contactPhone || "Not identified"}</span></p>
              <p><span className="text-slate-500">Email:</span> <span className="text-slate-200">{prospect.contactEmail || "Not identified"}</span></p>
            </div>
            {canWrite ? <>
              {isDiscovered ? <div className="mt-4 space-y-2">
                <ProspectAuditRefresh prospectId={prospect.id} hasAudit={Boolean(audit)} disabledReason={researchDisabledReason} />
                <p className="text-sm text-slate-400">This prospect is in Discover. Start research to gather evidence and move it into Research.</p>
              </div> : null}
              {!prospect.websiteUrl ? <p className="mt-3 text-sm text-slate-400">Website not identified. Research can still record ABR, CRM and public-evidence findings; website checks and decision-maker search remain unavailable until a website is added.</p> : null}
              <DecisionMakerResearch prospectId={prospect.id} disabledReason={decisionMakerDisabledReason} />
              <div className="mt-4"><ProspectEditControl prospect={prospect} /></div>
            </> : null}
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

        <section id="audit-evidence" className="dg-card scroll-mt-24">
          <div className="flex items-center justify-between gap-3"><p className="text-xs uppercase tracking-wide text-slate-500">Audit evidence</p>{canWrite && !isDiscovered ? <ProspectAuditRefresh prospectId={prospect.id} hasAudit={Boolean(audit)} disabledReason={researchDisabledReason} /> : null}</div>
          {audit ? (
            <>
              {!contentAccessible ? <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-100">The website responded but blocked the audit probe. On-page health, SEO and AI Visibility scores are withheld because the content could not be verified.</p> : null}
              {contentAccessible ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[["Business Health", audit.businessHealth], ["AI Visibility", audit.aiVisibility], ["SEO", audit.seoScore], ["Website Health", audit.websiteHealth]].map(([label,value]) => (
                  <div key={String(label)} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                    <p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold text-white">{value == null ? "Not assessed" : `${value}/100`}</p>
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

        {canWrite ? <details id="business-identity" className="dg-card scroll-mt-24">
          <summary className="cursor-pointer text-sm font-semibold text-white">Business identity &amp; existing relationships</summary>
          <p className="mt-2 text-xs leading-5 text-slate-400">Administrative identity verification and CRM linking. Review suggested matches and confirm before linking; suggestions never mutate records automatically.</p>
          <div className="mt-3"><ProspectRelationshipForm prospectId={prospect.id} abn={prospect.abn} companies={companies.map((c) => ({ id: c.id, label: c.name }))} contacts={contacts.map((c) => ({ id: c.id, label: [c.firstName, c.lastName].filter(Boolean).join(" ") }))} organisations={memberships.map((m) => ({ id: m.organisation.id, label: m.organisation.name }))} companySuggestions={companySuggestions} contactSuggestions={contactSuggestions} prospectWebsite={prospect.websiteUrl} prospectContactEmail={prospect.contactEmail} prospectContactPhone={prospect.contactPhone} /></div>
        </details> : null}

        <section className="dg-card">
          <p className="text-xs uppercase tracking-wide text-violet-300">Research intelligence</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Evidence provenance & acquisition signals</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">Operator-only evidence trail. Source states are shown exactly as returned by Research; unsupported marketplace claims remain fail-closed.</p>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-4">
              <h3 className="text-sm font-semibold text-white">Research sources</h3>
              <div className="mt-3 space-y-3">
                {sourceEntries.map(([key, label]) => {
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
                  <div className="text-right"><span className="text-xs font-medium text-violet-300">{socialReadiness}</span>{typeof socialAssessment.score === "number" ? <p className="mt-1 text-2xl font-semibold text-white">{socialAssessment.score}<span className="text-xs text-slate-500">/100</span></p> : null}</div>
                </div>
                <p className="mt-2 text-xs text-slate-500">{verifiedSocialCount} public profile{verifiedSocialCount === 1 ? "" : "s"} linked by the business website. Social Presence scores verified channel coverage and website integration only; audience, posting activity and engagement remain explicitly unassessed until observable evidence is available.</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] uppercase tracking-wide text-slate-500"><div className="rounded border border-slate-800 p-2">Activity<br/><span className="text-slate-300">Not assessed</span></div><div className="rounded border border-slate-800 p-2">Audience<br/><span className="text-slate-300">Not assessed</span></div><div className="rounded border border-slate-800 p-2">Engagement<br/><span className="text-slate-300">Not assessed</span></div></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(publicProfiles).filter(([, url]) => Boolean(url)).map(([network, url]) => (
                    <a key={network} href={url} target="_blank" rel="noreferrer" className="rounded-full border border-violet-500/30 bg-violet-500/5 px-3 py-1.5 text-xs capitalize text-violet-200 hover:bg-violet-500/10">{network} ↗</a>
                  ))}
                  {!verifiedSocialCount ? <span className="text-sm text-slate-500">No website-linked social profiles verified.</span> : null}
                </div>
              </div>

              {isRealEstateIndustry ? <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
                <p className="text-xs uppercase tracking-wide text-violet-300">Real Estate acquisition intelligence</p>
                <h3 className="mt-2 text-base font-semibold text-white">Vendor journey signals</h3>
                {typeof acquisitionReadiness.score === "number" ? <div className="mt-4 rounded-lg border border-violet-500/30 bg-violet-500/10 p-4"><div className="flex items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-wide text-violet-300">Acquisition readiness</p><p className="mt-1 text-xs text-slate-400">Evidence-weighted vendor acquisition readiness, not claimed conversion performance.</p></div><p className="text-3xl font-semibold text-white">{acquisitionReadiness.score}<span className="text-sm text-slate-500">/100</span></p></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">{[["Appraisal path",acquisitionReadiness.appraisalPath],["Local authority",acquisitionReadiness.localAuthority],["Reputation",acquisitionReadiness.reputation],["Social presence",acquisitionReadiness.socialPresence],["Discoverability",acquisitionReadiness.discoverability]].map(([label,value])=><div key={String(label)} className="rounded border border-slate-800 bg-slate-950/30 p-2"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-white">{value ?? "—"}<span className="text-[10px] text-slate-500">/100</span></p></div>)}</div></div> : null}
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
            <span className={`rounded-full border px-3 py-1 text-xs ${existingReport ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : canGenerateReport ? "border-violet-500/30 bg-violet-500/10 text-violet-200" : "border-amber-500/30 bg-amber-500/10 text-amber-100"}`}>{reportReadiness.label}</span>
          </div>
          <div className={`mt-4 rounded-lg border p-3 text-sm ${existingReport ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-100" : canGenerateReport ? "border-violet-500/20 bg-violet-500/5 text-violet-100" : "border-amber-500/25 bg-amber-500/5 text-amber-100"}`}>
            <p className="font-medium">{reportReadiness.label}</p><p className="mt-1 text-xs leading-5 opacity-90">{reportReadiness.detail}</p>
            {!prospect.websiteUrl?.trim() && canWrite ? <Link href={`/apps/prospecting/prospects/${prospect.id}#business-identity`} className="mt-2 inline-block text-xs font-semibold text-violet-300 hover:underline">Add website details</Link> : null}
          </div>
          {audit && contentAccessible ? (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[["Business Health", audit.businessHealth], ["AI Visibility", audit.aiVisibility], ["SEO", audit.seoScore], ["Website Health", audit.websiteHealth]].map(([label,value]) => (
                  <div key={String(label)} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                    <p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold text-white">{value == null ? "Not assessed" : `${value}/100`}</p>
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
                <p className="mt-2 text-sm text-slate-300">Use this evidence as the starting point for a Strategy Session: confirm which opportunities matter commercially, then demonstrate the relevant DigitalGate capabilities rather than sending a generic platform pitch.</p>
              </div>
            </>
          ) : <p className="mt-4 text-sm text-slate-400">A verified, accessible audit is required before a prospect-facing report can be generated.</p>}
          <ProspectReportActions prospectId={prospect.id} canGenerate={canGenerateReport} initialReport={existingReport ? { id: existingReport.id, url: `/opportunity-report/${existingReport.shareToken}` } : null} recipientName={prospect.contactName} recipientEmail={prospect.contactEmail} businessName={prospect.businessName} />
        </section>

        <section className="dg-card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Qualification decision</p>
          <h2 className="mt-2 text-lg font-semibold text-white">{isDiscovered ? "Research has not started" : isResearch ? "Ready for a qualification decision?" : prospect.stage === "qualified" ? "Qualification complete" : "Research decision recorded"}</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">{isDiscovered ? "Use Start research above before making a qualification decision. ABN verification establishes business identity; it does not perform website or decision-maker research." : isResearch ? "Research is complete enough to make the next lifecycle decision. Qualifying advances the prospect out of Research; disqualification closes it without manufacturing contact activity." : prospect.stage === "qualified" ? "This prospect has already advanced beyond Research. The evidence above remains the research record; qualification is a separate lifecycle state." : "This prospect has already moved beyond the active Research stage."}</p>
          {canWrite && isResearch ? <div className="mt-5"><ProspectQualificationActions prospectId={prospect.id} canQualify={canQualify} /></div> : <p className="mt-4 text-sm text-slate-300">Current stage: {prospect.stage}</p>}
        </section>
      </main>
    </>
  );
}
