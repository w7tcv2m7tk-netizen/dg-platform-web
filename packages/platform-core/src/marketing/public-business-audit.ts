import { prospectReportIdentity } from "../command-centre/growth-engine/report-snapshot";
/**
 * Public Gen 2 free Business Audit funnel (DigitalGate):
 * probe website → preview DigitalGate Business Health Score™ → capture lead →
 * DigitalGate Business Audit™ email → follow-up sequence.
 */

import { randomBytes } from "node:crypto";
import type { Prisma } from "@dg/database";

import { sendMessage } from "../communications";
import { composeEmailBody } from "../communications/email-html";
import { runPresenceAudit } from "../command-centre/growth-engine/presence-audit";
import { llmChat, llmConfigured } from "../ai/llm";
import type { PresenceAuditResult } from "../command-centre/growth-engine/presence-audit";
import { findDomainByHostname } from "../infrastructure/domains/inventory";
import { createLead } from "../leads";
import { createContact } from "../contacts";
import { getWebsiteBySlug } from "../websites/crud";
import {
  buildFreeAuditSequenceStamp,
  dueFreeAuditFollowupSteps,
  renderFreeAuditFollowup,
  type FreeAuditSequenceMeta,
} from "./business-audit-emails";

function normaliseWebsiteUrl(raw: string): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withScheme);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

async function resolveDgOrgId(input: {
  siteSlug?: string;
  hostname?: string;
}): Promise<string | null> {
  const slug = input.siteSlug?.trim() || "digitalgate";
  const site =
    (await getWebsiteBySlug(slug, { publishedOnly: true })) ||
    (await getWebsiteBySlug(slug));
  if (site?.organisationId) return site.organisationId;

  if (input.hostname?.trim()) {
    const found = await findDomainByHostname(input.hostname.trim());
    if (found?.website?.organisationId) return found.website.organisationId;
  }

  const { prisma } = await import("@dg/database");
  const { resolveOrgBrandPresetKey } = await import("../org/brand-presets");
  const orgs = await prisma.organisation.findMany({
    select: { id: true, name: true, slug: true, industry: true, settings: true },
    take: 100,
  });
  for (const org of orgs) {
    if (resolveOrgBrandPresetKey(org) === "digitalgate") return org.id;
  }
  return null;
}

export type PublicBusinessAuditPillars = {
  websiteHealth: number | null;
  searchVisibility: number | null;
  aiVisibility: number | null;
  reputation: number | null;
  conversionReadiness: number | null;
  growthSignals: number | null;
};

export type PublicBusinessAuditOpportunity = {
  title: string;
  detail: string;
  severity: "critical" | "warning" | "opportunity";
  recommendedAction?: string;
  domain?: string;
  category?: string;
  observed?: string;
  interpretation?: string;
};

export type PublicBusinessAuditPreview = {
  overallScore: number | null;
  pillars: PublicBusinessAuditPillars;
  opportunities: PublicBusinessAuditOpportunity[];
};

const POSITIVE_FINDING_TITLES = new Set(["structured data present"]);

function scorePillars(audit: PresenceAuditResult): PublicBusinessAuditPillars {
  const s = audit.scores;
  return {
    websiteHealth: s.websiteHealth ?? null,
    searchVisibility: s.seo ?? null,
    aiVisibility: s.aiVisibility ?? null,
    // No independent review/GBP source is queried in the public workflow. Homepage
    // review hints are observed trust signals, not an independent reputation score.
    reputation: null,
    conversionReadiness: s.conversionReadiness ?? null,
    growthSignals: s.growthSignals ?? null,
  };
}

function overallFromPillars(pillars: PublicBusinessAuditPillars): number | null {
  const weighted = [
    [pillars.websiteHealth, 0.22], [pillars.searchVisibility, 0.2], [pillars.aiVisibility, 0.2],
    [pillars.reputation, 0.14], [pillars.conversionReadiness, 0.14], [pillars.growthSignals, 0.1],
  ].filter((entry): entry is [number, number] => typeof entry[0] === "number");
  const weight = weighted.reduce((sum, [, w]) => sum + w, 0);
  return weighted.length >= 2 && weight >= 0.5
    ? Math.round(weighted.reduce((sum, [value, w]) => sum + value * w, 0) / weight)
    : null;
}

function opportunityCategory(f: {
  domain?: string;
  category?: string;
  title: string;
}): string {
  if (f.category?.trim()) return f.category.trim();
  const title = f.title.toLowerCase();
  if (/analytics|tracking|measurement/i.test(title)) return "Measurement";
  if (/form|enquiry|conversion|cta|contact pathway/i.test(title)) {
    return "Conversion";
  }
  if (/location|local|gbp|google|review|reputation/i.test(title)) {
    return "Local & Regional Visibility";
  }
  switch (f.domain) {
    case "ai_visibility":
      return "AI & Search Visibility";
    case "seo":
      return "Search Visibility";
    case "gbp":
      return "Local & Regional Visibility";
    case "social":
      return "Presence";
    default:
      return "Website";
  }
}

function severityLabel(severity: PublicBusinessAuditOpportunity["severity"]): string {
  if (severity === "critical") return "Critical";
  if (severity === "warning") return "Important";
  return "Opportunity";
}

function displayHostname(websiteUrl: string): string {
  try {
    return new URL(websiteUrl).hostname.replace(/^www\./i, "");
  } catch {
    return websiteUrl.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}

function prioritisedOpportunities(
  audit: PresenceAuditResult,
  limit = 4,
): PublicBusinessAuditOpportunity[] {
  const severityRank = { critical: 0, warning: 1, opportunity: 2 } as const;
  return [...(audit.findings || [])]
    .filter((f) => !POSITIVE_FINDING_TITLES.has(f.title.toLowerCase()))
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
    .slice(0, limit)
    .map((f) => ({
      title: f.title,
      detail: f.detail,
      severity: f.severity,
      recommendedAction: f.recommendedAction,
      domain: f.domain,
      category: opportunityCategory(f),
      observed: f.observed || f.title,
      interpretation: f.interpretation || f.detail,
    }));
}

export function buildPublicBusinessAuditPreview(
  audit: PresenceAuditResult,
): PublicBusinessAuditPreview {
  const pillars = scorePillars(audit);
  return {
    overallScore: overallFromPillars(pillars),
    pillars,
    opportunities: prioritisedOpportunities(audit, 4),
  };
}

async function synthesisePublicAuditSummary(input: {
  businessName: string;
  industry?: string;
  location?: string;
  audit: PresenceAuditResult;
}): Promise<string | null> {
  if (!llmConfigured()) return null;
  const findings = input.audit.findings.slice(0, 6).map((finding) => `${finding.title}: ${finding.observed || finding.detail}`).join("\n");
  const strengths = input.audit.strengths.slice(0, 4).join("; ");
  const pages = input.audit.probes.pages.slice(0, 3).map((page) => `${page.url} (form=${page.hasForm}, booking=${page.hasBookingLanguage}, pricing=${page.hasPricingLanguage}, phone=${page.hasPhoneLink}, email=${page.hasEmailLink})`).join("\n");
  try {
    const result = await llmChat({
      messages: [
        { role: "system", content: "You write a concise evidence-led business assessment for a DigitalGate Digital Opportunity Report. Use only the supplied observations. Never invent revenue, customer counts, rankings, competitors, traffic, reviews or performance metrics. Never state or imply that the business is successfully generating enquiries, bookings, sales or audience engagement merely because a pathway exists. Describe observed pathways only; do not infer commercial outcomes. Do not describe social links as strong audience performance. When analytics/tracking is not detected, recommend verification of the existing setup, never implementation as a confirmed need. When a contact form or booking pathway exists, do not recommend introducing it; build on it. Distinguish observed evidence from strategic hypotheses. Write 2 short paragraphs, under 150 words, Australian English, warm and commercially useful. Explain what the business appears to do, who its apparent customers may be, what is working, the most material observed opportunity, why it matters, and one practical next step." },
        { role: "user", content: `Business: ${input.businessName}\nIndustry: ${input.industry || "not supplied"}\nLocation: ${input.location || "not supplied"}\nBusiness model: ${JSON.stringify(input.audit.businessModel ?? {})}\nObserved strengths: ${strengths || "none recorded"}\nObserved findings:\n${findings || "none recorded"}\nPages assessed:\n${pages || "homepage only"}\nPillar assessment: ${JSON.stringify(input.audit.scores.assessment ?? {})}` },
      ],
      maxTokens: 340,
      tier: "standard",
      deadlineMs: 8_000,
      attemptTimeoutMs: 4_000,
      safeErrors: true,
    });
    const text = result.text?.trim().replace(/^Aida:\s*/i, "").slice(0, 1600);
    return text || null;
  } catch {
    return null;
  }
}

export type PublicBusinessAuditProbeResult =
  | {
      ok: true;
      websiteUrl: string;
      reachable: boolean | null;
      title: string | null;
      https: boolean | null;
      overallScore: number | null;
      pillars: PublicBusinessAuditPillars;
      opportunities: PublicBusinessAuditOpportunity[];
    }
  | { ok: false; code: string; message: string };

export type PublicBusinessAuditSubmitResult =
  | {
      ok: true;
      leadId: string;
      auditSent: boolean;
      overallScore: number | null;
      pillars: PublicBusinessAuditPillars;
      opportunities: PublicBusinessAuditOpportunity[];
      message: string;
      prospectId?: string;
      reportId?: string;
      reportUrl?: string;
    }
  | { ok: false; code: string; message: string };

export async function probePublicBusinessAuditWebsite(input: {
  websiteUrl: string;
  siteSlug?: string;
  hostname?: string;
}): Promise<PublicBusinessAuditProbeResult> {
  const websiteUrl = normaliseWebsiteUrl(input.websiteUrl);
  if (!websiteUrl) {
    return {
      ok: false,
      code: "validation_error",
      message: "Enter a valid website URL (e.g. yourbusiness.com.au).",
    };
  }

  const orgId = await resolveDgOrgId(input);
  if (!orgId) {
    return {
      ok: false,
      code: "org_not_resolved",
      message: "Could not resolve DigitalGate organisation for this site",
    };
  }

  const audit = await runPresenceAudit({
    businessName: "Prospect",
    websiteUrl,
    publicPreview: true,
  });
  const preview = buildPublicBusinessAuditPreview(audit);

  return {
    ok: true,
    websiteUrl,
    reachable: audit.probes.reachable,
    title: audit.probes.title,
    https: audit.probes.https,
    overallScore: preview.overallScore,
    pillars: preview.pillars,
    opportunities: preview.opportunities,
  };
}

function renderAuditDeliveryEmail(input: {
  firstName: string;
  companyName: string;
  reportUrl: string;
  opportunityCount: number;
}): { subject: string; body: string; bodyHtml: string } {
  const strategyUrl = "https://digitalgate.com.au/strategy-session";
  const countLabel = input.opportunityCount === 1 ? "opportunity" : "opportunities";
  const body = `Hi ${input.firstName},

Your DigitalGate Digital Opportunity Report for ${input.companyName} is ready.

We identified ${input.opportunityCount} priority ${countLabel} from the observable public digital signals captured during your audit.

View your report:
${input.reportUrl}

The report explains what we found, why it matters and the practical priorities we would address first.

If you'd like to review the findings together, you can book a DigitalGate Strategy Session:
${strategyUrl}

Regards,
Ben Roe
DigitalGate
https://digitalgate.com.au`;

  const bodyHtml = composeEmailBody(
    [
      { type: "paragraph", text: `Hi ${input.firstName},` },
      {
        type: "paragraph",
        text: `Your DigitalGate **Digital Opportunity Report** for **${input.companyName}** is ready.`,
      },
      {
        type: "paragraph",
        text: `We identified **${input.opportunityCount} priority ${countLabel}** from the observable public digital signals captured during your audit.`,
      },
      {
        type: "button",
        label: "View my Digital Opportunity Report →",
        href: input.reportUrl,
      },
      {
        type: "paragraph",
        text: "The report explains what we found, why it matters and the practical priorities we would address first.",
      },
      { type: "divider" },
      {
        type: "paragraph",
        text: "Want to review the findings together?",
      },
      {
        type: "button",
        label: "Book a DigitalGate Strategy Session →",
        href: strategyUrl,
      },
      {
        type: "signoff",
        lines: ["— Ben Roe", "DigitalGate", "https://digitalgate.com.au"],
      },
    ],
    { accentColor: "#7C3AED" },
  );

  return {
    subject: `Your Digital Opportunity Report is ready — ${input.companyName}`,
    body,
    bodyHtml,
  };
}

export async function submitPublicBusinessAudit(input: {
  siteSlug?: string;
  hostname?: string;
  websiteUrl: string;
  businessName: string;
  fullName: string;
  email?: string;
  phone?: string;
  industry?: string;
  location?: string;
  website?: string;
}): Promise<PublicBusinessAuditSubmitResult> {
  if (input.website?.trim()) {
    return {
      ok: true,
      leadId: "honeypot",
      auditSent: false,
      overallScore: 0,
      pillars: {
        websiteHealth: 0,
        searchVisibility: 0,
        aiVisibility: 0,
        reputation: 0,
        conversionReadiness: 0,
        growthSignals: 0,
      },
      opportunities: [],
      message: "Audit request received.",
    };
  }

  const fullName = input.fullName?.trim() || "";
  const businessName = input.businessName?.trim() || "";
  const email = input.email?.trim() || "";
  const phone = input.phone?.trim() || "";
  const industry = input.industry?.trim() || "";
  const websiteUrl = normaliseWebsiteUrl(input.websiteUrl);

  if (!websiteUrl) {
    return {
      ok: false,
      code: "validation_error",
      message: "Enter a valid website URL.",
    };
  }
  if (!businessName) {
    return {
      ok: false,
      code: "validation_error",
      message: "Business name is required.",
    };
  }
  if (!fullName) {
    return {
      ok: false,
      code: "validation_error",
      message: "Full name is required.",
    };
  }
  if (!email) {
    return {
      ok: false,
      code: "validation_error",
      message: "Email is required to send your full DigitalGate Business Audit™.",
    };
  }

  const organisationId = await resolveDgOrgId(input);
  if (!organisationId) {
    return {
      ok: false,
      code: "org_not_resolved",
      message: "Could not resolve DigitalGate organisation for this site",
    };
  }

  const firstName = fullName.split(/\s+/)[0] || fullName;
  const parts = fullName.split(/\s+/);

  let contactId: string | undefined;
  try {
    const contact = await createContact({
      organisationId,
      firstName: parts[0] ?? fullName,
      lastName: parts.slice(1).join(" ") || undefined,
      email,
      phone: phone || undefined,
      source: "free_audit",
    });
    contactId = contact.id;
  } catch (err) {
    console.info("[public-business-audit] contact create", err);
  }

  const audit = await runPresenceAudit({
    businessName,
    websiteUrl,
    industry: industry || null,
    location: input.location?.trim() || null,
    contactEmail: email,
    contactPhone: phone || null,
    publicPreview: false,
  });
  const preview = buildPublicBusinessAuditPreview(audit);

  const lead = await createLead({
    sourceApp: "marketing",
    organisationId,
    source: "free_audit",
    title: `DigitalGate Business Audit™ — ${businessName}`,
    description: websiteUrl,
    contactId,
    status: "new",
    metadata: {
      lead_type: "marketing",
      capture_path: "gen2_public_business_audit",
      product: "digitalgate_business_audit",
      website_url: websiteUrl,
      business_name: businessName,
      contact_name: fullName,
      email,
      phone: phone || undefined,
      industry: industry || undefined,
      audit_scores: audit.scores,
      audit_pillars: preview.pillars,
      audit_findings: audit.findings,
      audit_opportunities: preview.opportunities,
      audit_probes: audit.probes,
      overall_score: preview.overallScore,
      business_health_score: preview.overallScore,
    },
    externalRefs: {
      capture_path: "gen2_public_business_audit",
    },
  });

  const { prisma } = await import("@dg/database");
  const candidates = await prisma.growthProspect.findMany({
    where: { organisationId, websiteUrl, archivedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, metadata: true, stage: true },
    take: 20,
  });
  const reusable = candidates.find((candidate) => {
    const metadata = candidate.metadata && typeof candidate.metadata === "object" ? candidate.metadata as Record<string, unknown> : {};
    return metadata.capturePath === "gen2_public_business_audit" || metadata.source === "free_audit";
  });
  const prospect = reusable
    ? await prisma.growthProspect.update({
        where: { id: reusable.id },
        data: {
          businessName,
          contactName: fullName,
          contactEmail: email,
          contactPhone: phone || null,
          industry: industry || null,
          location: input.location?.trim() || null,
          websiteUrl,
        },
      })
    : await prisma.growthProspect.create({
        data: {
          organisationId,
          businessName,
          contactName: fullName,
          contactEmail: email,
          contactPhone: phone || null,
          industry: industry || null,
          location: input.location?.trim() || null,
          websiteUrl,
          stage: "prospect",
          metadata: {
            source: "free_audit",
            leadId: lead.id,
            capturePath: "gen2_public_business_audit",
          } as Prisma.InputJsonValue,
        },
      });
  const prospectAudit = await prisma.growthProspectAudit.create({
    data: {
      prospectId: prospect.id,
      businessHealth: preview.overallScore,
      aiVisibility: preview.pillars.aiVisibility,
      seoScore: preview.pillars.searchVisibility,
      websiteHealth: preview.pillars.websiteHealth,
      findings: {
        items: audit.findings,
        strengths: audit.strengths,
        industryInsights: audit.industryInsights,
        industryPack: audit.industryPack,
        businessModel: { ...audit.businessModel, confidence: "medium" },
        assessment: {
          ...(audit.scores.assessment ?? { status: "not_assessed", assessedPillars: [], unavailablePillars: [], evidenceCoveragePercent: 0, confidence: "low" }),
          sourceCoveragePercent: audit.scores.assessment?.status === "not_assessed" ? 0 : 35,
          status: audit.scores.assessment?.status === "not_assessed" ? "not_assessed" : "partial",
          sourceNotes: ["Website HTML observed from the public site; independent identity, Google Business Profile and review sources were not queried in this workflow."],
          evidenceCoveragePercent: audit.scores.assessment?.status === "not_assessed" ? 0 : 86,
          assessedPillars: ["website", "seo", "ai", "conversion", "growth"],
          unavailablePillars: ["reputation"],
          weights: { websiteHealth: 22, seo: 20, aiVisibility: 20, reputation: 14, conversionReadiness: 14, growthSignals: 10 },
          confidence: audit.scores.assessment?.status === "not_assessed" ? "low" : "medium",
        },
        scorecard: {
          reputation: preview.pillars.reputation,
          conversionReadiness: preview.pillars.conversionReadiness,
          growthSignals: preview.pillars.growthSignals,
          searchVisibility: preview.pillars.searchVisibility,
        },
        businessIntelligence: {
          brandImageUrl: audit.probes.ogImageUrl || audit.probes.faviconUrl || null,
          publicProfiles: audit.probes.socialProfiles,
          socialAssessment: {
            score: audit.scores.socialPresence ?? null,
            channelCount: Object.values(audit.probes.socialProfiles).filter(Boolean).length,
            basis: "Website-linked public profile links only; activity, audience and engagement are not assessed.",
          },
          reputationEvidence: {
            score: null,
            reviewSignal: audit.probes.hasReviewHint,
            googleLocalSignal: audit.probes.hasMapsOrGbpHint,
            basis: audit.scores.reputation == null ? "Reputation was not assessed from this evidence set." : "Homepage review/local signals observed; no external review count or star rating was queried in this workflow.",
          },
          conversionEvidence: {
            hasForm: audit.probes.hasForm,
            hasPhoneLink: audit.probes.hasTelLink,
            hasEmailLink: audit.probes.hasMailto,
            hasCtaLanguage: audit.probes.hasCtaLanguage,
            pageHasForm: audit.probes.pages.some((page) => page.hasForm),
            pageHasBooking: audit.probes.pages.some((page) => page.hasBookingLanguage),
            pageHasPricing: audit.probes.pages.some((page) => page.hasPricingLanguage),
            basis: "Homepage and up to three sampled same-origin pages were checked. A capability observed on a sampled page is not reported as missing from the website.",
          },
          sourceStatus: {
            website: { status: "observed", note: "Public website HTML observed in this snapshot." },
            businessIdentity: { status: "not_queried", note: "ABR identity was not queried in this workflow." },
            googleBusinessProfile: { status: "not_queried", note: "Google Business Profile was not queried in this workflow." },
            socialProfiles: { status: Object.values(audit.probes.socialProfiles).filter(Boolean).length ? "website_verified" : "not_observed", note: "Only profile links present on the public website are shown." },
          },
        },
        researchContext: {
          source: "public_business_audit",
          websiteUrl,
          probes: audit.probes,
        },
      } as unknown as Prisma.InputJsonValue,
      auditVersion: "public-business-audit-v2",
    },
  });
  const synthesisedSummary = await synthesisePublicAuditSummary({
    businessName,
    industry: industry || undefined,
    location: input.location?.trim() || undefined,
    audit,
  });
  const topOpportunity = preview.opportunities[0] ?? null;
  const pageContext = audit.probes.pages.length
    ? ` Additional linked pages were observed (${audit.probes.pages.slice(0, 3).map((page) => page.title || page.url).join(", ")}), evidence for the services and conversion path discussed below.`
    : "";
  const executiveSummary = synthesisedSummary
    ? `${synthesisedSummary} This assessment is based on observable public website evidence captured for this report.`
    : `${businessName} appears to operate in ${industry || "its stated industry"}${input.location?.trim() ? `, serving customers around ${input.location.trim()}` : ""}. The public website evidence shows ${audit.strengths[0] ? audit.strengths[0].replace(/\.$/, "").toLowerCase() : "limited verified public footprint"}. ${topOpportunity ? `The clearest observed opportunity is ${topOpportunity.title.toLowerCase()}, which matters because it affects how readily an interested customer can understand the offer and take the next step.` : "No material weakness was confirmed from the available evidence; the priority is to verify the commercial path before recommending change."}${pageContext} A practical next step is to review the observed conversion path and agree one measurable improvement with DigitalGate.`;
  const opportunityReport = await prisma.growthProspectReport.create({
    data: {
      prospectId: prospect.id,
      auditId: prospectAudit.id,
      prospectSnapshot: prospectReportIdentity(prospect),
      shareToken: randomBytes(24).toString("hex"),
      executiveSummary,
    },
  });
  await prisma.growthProspectEngagement.create({
    data: {
      prospectId: prospect.id,
      reportId: opportunityReport.id,
      type: "report_generated",
      metadata: { source: "public_business_audit", leadId: lead.id },
    },
  });
  const publicReportOrigin =
    process.env.DG_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    "https://app.digitalgate.com.au";
  const reportUrl = `${publicReportOrigin}/opportunity-report/${opportunityReport.shareToken}`;
  const report = renderAuditDeliveryEmail({
    firstName,
    companyName: businessName,
    reportUrl,
    opportunityCount: preview.opportunities.length,
  });

  let auditSent = false;
  let auditSendError: string | undefined;
  try {
    const delivery = await sendMessage({
      organisationId,
      channel: "email",
      to: email,
      subject: report.subject,
      body: report.body,
      bodyHtml: report.bodyHtml,
      metadata: {
        purpose: "free_audit_report",
        leadId: lead.id,
        reportUrl,
        ctaLabel: "View my Digital Opportunity Report →",
        footerNote:
          "DigitalGate Digital Opportunity Report — based on observable public website signals captured at audit time.",
      },
    });
    auditSent = delivery.status === "sent";
    if (!auditSent && delivery.error) auditSendError = delivery.error;
    if (auditSent) {
      await prisma.growthProspectReport.update({ where: { id: opportunityReport.id }, data: { sentAt: new Date() } });
      await prisma.growthProspectEngagement.create({ data: { prospectId: prospect.id, reportId: opportunityReport.id, type: "report_emailed", metadata: { source: "public_business_audit", to: email, subject: report.subject } } });
    }
  } catch (err) {
    auditSendError = err instanceof Error ? err.message : String(err);
    console.info("[public-business-audit] report email failed", err);
  }

  const sequence = buildFreeAuditSequenceStamp({
    firstName,
    fullName,
    companyName: businessName,
    websiteUrl,
    email,
    aiScore: preview.pillars.aiVisibility ?? 0,
    websiteScore: preview.pillars.websiteHealth ?? 0,
    seoScore: preview.pillars.searchVisibility ?? 0,
    overallScore: preview.overallScore ?? 0,
    opportunityCount: preview.opportunities.length,
    email1Sent: auditSent,
  });

  const current = await prisma.lead.findFirst({ where: { id: lead.id } });
  if (current) {
    const prev = (current.metadata as Record<string, unknown> | null) ?? {};
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        metadata: {
          ...prev,
          free_audit_sequence: sequence,
        } as Prisma.InputJsonValue,
      },
    });
  }

  const adminTo =
    process.env.DG_BUSINESS_AUDIT_ADMIN_EMAIL?.trim() ||
    "hello@digitalgate.com.au";
  try {
    const text = [
      "New DigitalGate Business Audit™ request",
      "",
      `Business: ${businessName}`,
      `Website: ${websiteUrl}`,
      `Industry: ${industry || "Not provided"}`,
      `Name: ${fullName}`,
      `Email: ${email}`,
      `Phone: ${phone || "Not provided"}`,
      `Business Health Score: ${preview.overallScore}`,
      `Opportunities: ${preview.opportunities.length}`,
      `Audit emailed: ${auditSent ? "yes" : "no"}`,
      auditSendError ? `Send error: ${auditSendError}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    await sendMessage({
      organisationId,
      channel: "email",
      to: adminTo,
      subject: `Business Audit Request - ${businessName}`,
      body: text,
      bodyHtml: composeEmailBody(
        [
          { type: "kicker", text: "New lead" },
          { type: "heading", text: "Business Audit request" },
          {
            type: "kv",
            rows: [
              { label: "Business", value: businessName },
              { label: "Website", value: websiteUrl },
              { label: "Industry", value: industry || "Not provided" },
              { label: "Name", value: fullName },
              { label: "Email", value: email },
              { label: "Phone", value: phone || "Not provided" },
              {
                label: "Business Health Score",
                value: String(preview.overallScore),
              },
              {
                label: "Opportunities",
                value: String(preview.opportunities.length),
              },
              { label: "Audit emailed", value: auditSent ? "Yes" : "No" },
              ...(auditSendError
                ? [{ label: "Send error", value: auditSendError }]
                : []),
            ],
          },
        ],
        { accentColor: "#3B82F6" },
      ),
      metadata: { purpose: "free_audit_admin" },
    });
  } catch (err) {
    console.info("[public-business-audit] admin notify failed", err);
  }

  return {
    ok: true,
    leadId: lead.id,
    auditSent,
    overallScore: preview.overallScore,
    pillars: preview.pillars,
    opportunities: preview.opportunities,
    message: auditSent
      ? "Your DigitalGate Business Audit™ is on its way — check your inbox shortly."
      : "Audit request received! We'll be in touch shortly.",
    prospectId: prospect.id,
    reportId: opportunityReport.id,
    reportUrl,
  };
}

export async function processFreeAuditFollowups(options?: {
  limit?: number;
}): Promise<{ processed: number; sent: number; failed: number }> {
  const { prisma } = await import("@dg/database");
  const limit = options?.limit ?? 40;

  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { source: "free_audit" },
        {
          metadata: {
            path: ["capture_path"],
            equals: "gen2_public_business_audit",
          },
        },
      ],
    },
    take: 300,
    orderBy: { updatedAt: "asc" },
  });

  let processed = 0;
  let sent = 0;
  let failed = 0;
  const now = new Date();

  for (const lead of leads) {
    if (processed >= limit) break;
    const meta = (lead.metadata as Record<string, unknown> | null) ?? {};
    const sequence = meta.free_audit_sequence as FreeAuditSequenceMeta | undefined;
    if (!sequence?.email || !sequence.email_1_sent || !sequence.activatedAt) continue;

    const due = dueFreeAuditFollowupSteps(sequence, now);
    if (!due.length) continue;

    for (const step of due) {
      if (processed >= limit) break;
      processed += 1;
      const rendered = renderFreeAuditFollowup(step, {
        firstName: sequence.firstName,
        fullName: sequence.fullName,
        companyName: sequence.companyName,
        websiteUrl: sequence.websiteUrl,
        aiScore: sequence.aiScore,
        websiteScore: sequence.websiteScore,
        seoScore: sequence.seoScore,
        overallScore: sequence.overallScore,
        opportunityCount: sequence.opportunityCount,
      });

      try {
        const delivery = await sendMessage({
          organisationId: lead.organisationId,
          channel: "email",
          to: sequence.email,
          subject: rendered.subject,
          body: rendered.body,
          bodyHtml: rendered.bodyHtml,
          metadata: {
            purpose: `free_audit_followup_${step}`,
            leadId: lead.id,
            ctaLabel: "Book a free strategy session",
          },
        });

        if (delivery.status !== "sent") {
          failed += 1;
          console.warn("[free-audit-followups] not sent", {
            leadId: lead.id,
            step,
            status: delivery.status,
            error: delivery.error,
          });
          continue;
        }

        const nextSeq = {
          ...sequence,
          [`email_${step}_sent`]: true,
          [`email_${step}_sent_at`]: new Date().toISOString(),
        } as FreeAuditSequenceMeta;

        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            metadata: {
              ...meta,
              free_audit_sequence: nextSeq,
            } as Prisma.InputJsonValue,
          },
        });

        await prisma.activity.create({
          data: {
            organisationId: lead.organisationId,
            entityType: "Lead",
            entityId: lead.id,
            activityType: "email_sent",
            title: `Business audit follow-up ${step}`,
            body: `${sequence.email} · ${rendered.subject}`,
            sourceApp: "marketing",
            metadata: {
              step,
              deliveryId: delivery.id,
              deliveryStatus: delivery.status,
            } as Prisma.InputJsonValue,
          },
        });

        sent += 1;
        Object.assign(sequence, nextSeq);
      } catch (err) {
        failed += 1;
        console.error("[free-audit-followups] send failed", lead.id, step, err);
      }
    }
  }

  return { processed, sent, failed };
}
