/**
 * Public Gen 2 free Business Audit funnel (DigitalGate):
 * probe website → preview DigitalGate Business Health Score™ → capture lead →
 * DigitalGate Business Audit™ email → follow-up sequence.
 */

import type { Prisma } from "@dg/database";

import { sendMessage } from "../communications";
import { composeEmailBody } from "../communications/email-html";
import { runPresenceAudit } from "../command-centre/growth-engine/presence-audit";
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
  websiteHealth: number;
  searchVisibility: number;
  aiVisibility: number;
  reputation: number;
  conversionReadiness: number;
  growthSignals: number;
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
  overallScore: number;
  pillars: PublicBusinessAuditPillars;
  opportunities: PublicBusinessAuditOpportunity[];
};

const POSITIVE_FINDING_TITLES = new Set(["structured data present"]);

function scorePillars(audit: PresenceAuditResult): PublicBusinessAuditPillars {
  const s = audit.scores;
  return {
    websiteHealth: s.websiteHealth ?? 0,
    searchVisibility: s.seo ?? 0,
    aiVisibility: s.aiVisibility ?? 0,
    reputation: s.reputation ?? s.googleBusinessProfile ?? 0,
    conversionReadiness: s.conversionReadiness ?? 0,
    growthSignals: s.growthSignals ?? 0,
  };
}

function overallFromPillars(pillars: PublicBusinessAuditPillars): number {
  return Math.round(
    pillars.websiteHealth * 0.22 +
      pillars.searchVisibility * 0.2 +
      pillars.aiVisibility * 0.2 +
      pillars.reputation * 0.14 +
      pillars.conversionReadiness * 0.14 +
      pillars.growthSignals * 0.1,
  );
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
    overallScore: audit.scores.businessHealth ?? overallFromPillars(pillars),
    pillars,
    opportunities: prioritisedOpportunities(audit, 4),
  };
}

export type PublicBusinessAuditProbeResult =
  | {
      ok: true;
      websiteUrl: string;
      reachable: boolean | null;
      title: string | null;
      https: boolean | null;
      overallScore: number;
      pillars: PublicBusinessAuditPillars;
      opportunities: PublicBusinessAuditOpportunity[];
    }
  | { ok: false; code: string; message: string };

export type PublicBusinessAuditSubmitResult =
  | {
      ok: true;
      leadId: string;
      auditSent: boolean;
      overallScore: number;
      pillars: PublicBusinessAuditPillars;
      opportunities: PublicBusinessAuditOpportunity[];
      message: string;
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

function renderAuditEmailBody(input: {
  firstName: string;
  companyName: string;
  websiteUrl: string;
  industry?: string;
  audit: PresenceAuditResult;
  preview: PublicBusinessAuditPreview;
}): { subject: string; body: string; bodyHtml: string; overall: number } {
  const { pillars, opportunities, overallScore: overall } = input.preview;
  const host = displayHostname(input.websiteUrl);
  const strategyUrl = "https://digitalgate.com.au/strategy-session";
  const opportunityCount = opportunities.length;

  const positives: string[] = [];
  if (input.audit.probes.reachable === true) positives.push("Homepage is reachable");
  if (input.audit.probes.https) positives.push("HTTPS is active");
  if (input.audit.probes.title) positives.push("Homepage title is present");
  if (input.audit.probes.hasViewport) positives.push("Mobile viewport is present");

  const findingsPlain = opportunities
    .map((f, i) => {
      const n = String(i + 1).padStart(2, "0");
      const cat = f.category || opportunityCategory(f);
      const observed = f.observed || f.title;
      const interpretation = f.interpretation || f.detail;
      return [
        `${n} · ${severityLabel(f.severity)} — ${cat}`,
        f.title,
        "",
        `Observed: ${observed}`,
        "",
        interpretation,
        f.recommendedAction ? `\nRecommendation: ${f.recommendedAction}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n⸻\n\n");

  const body = `Hi ${input.firstName},

Your DigitalGate Business Audit™ for ${input.companyName} is ready.

Your digital presence, visibility & growth report

Website: ${host}${input.industry ? `\nIndustry: ${input.industry}` : ""}

DIGITALGATE BUSINESS HEALTH SCORE™

${overall} / 100

Your audit identified several opportunities to improve how your business is found, understood and converted online.

Your pillar scores:
- Website Health: ${pillars.websiteHealth}/100
- Search Visibility: ${pillars.searchVisibility}/100
- AI Visibility: ${pillars.aiVisibility}/100
- Reputation & Presence: ${pillars.reputation}/100
- Conversion Readiness: ${pillars.conversionReadiness}/100
- Business Growth Signals: ${pillars.growthSignals}/100

What we found

Website
${
  positives.length
    ? positives.map((p) => `✓ ${p}`).join("\n")
    : "• Live probe completed — see opportunities below"
}

The ${opportunityCount || 4} opportunities we’d prioritise

${
  findingsPlain ||
  "No critical gaps from this probe — we can still deepen the diagnosis on a strategy call."
}

What this means

Your website is healthy enough to build on, but there are clear opportunities to improve how effectively DigitalGate can help your business:

Get found → Get understood → Build trust → Convert visitors → Generate business

Your next opportunity

${opportunityCount} significant opportunities were identified in your audit.

Would you like to see how DigitalGate could address them?

Book a free DigitalGate strategy session →
${strategyUrl}

We’ll review the findings with you and identify the highest-value improvements for your business.

No obligation. No pressure. Just a practical discussion about where the biggest opportunities are.

⸻

DigitalGate Business Audit™
Your digital presence, visibility & growth report.

— Ben Roe
DigitalGate
https://digitalgate.com.au`;

  const opportunityBlocks = opportunities.length
    ? opportunities.flatMap((f, i) => [
        {
          type: "opportunity" as const,
          index: i + 1,
          severityLabel: severityLabel(f.severity),
          category: f.category || opportunityCategory(f),
          title: f.title,
          observed: f.observed || f.title,
          interpretation: f.interpretation || f.detail,
          recommendation: f.recommendedAction,
        },
        ...(i < opportunities.length - 1
          ? [{ type: "divider" as const }]
          : []),
      ])
    : [
        {
          type: "paragraph" as const,
          text: "No critical gaps from this probe — we can still deepen the diagnosis on a strategy call.",
        },
      ];

  const bodyHtml = composeEmailBody(
    [
      { type: "paragraph", text: `Hi ${input.firstName},` },
      {
        type: "paragraph",
        text: `Your DigitalGate Business Audit™ for **${input.companyName}** is ready.`,
      },
      {
        type: "kicker",
        text: "Your digital presence, visibility & growth report",
      },
      {
        type: "kv",
        rows: [
          { label: "Website", value: host },
          ...(input.industry
            ? [{ label: "Industry", value: input.industry }]
            : []),
        ],
      },
      {
        type: "score",
        title: "DigitalGate Business Health Score™",
        score: overall,
        pillars: [
          { label: "Website Health", score: pillars.websiteHealth },
          { label: "Search Visibility", score: pillars.searchVisibility },
          { label: "AI Visibility", score: pillars.aiVisibility },
          { label: "Reputation & Presence", score: pillars.reputation },
          { label: "Conversion Readiness", score: pillars.conversionReadiness },
          {
            label: "Business Growth Signals",
            score: pillars.growthSignals,
          },
        ],
      },
      {
        type: "paragraph",
        text: "Your audit identified several opportunities to improve how your business is found, understood and converted online.",
      },
      { type: "kicker", text: "What we found" },
      { type: "heading", text: "Website", level: 2 },
      {
        type: "list",
        items:
          positives.length > 0
            ? positives.map((p) => `✓ ${p}`)
            : ["Live probe completed — see opportunities below"],
      },
      {
        type: "heading",
        text: `The ${opportunityCount || 4} opportunities we’d prioritise`,
        level: 2,
      },
      ...opportunityBlocks,
      { type: "divider" },
      { type: "heading", text: "What this means", level: 2 },
      {
        type: "paragraph",
        text: "Your website is healthy enough to build on, but there are clear opportunities to improve how effectively DigitalGate can help your business:",
      },
      {
        type: "highlight",
        text: "Get found → Get understood → Build trust → Convert visitors → Generate business",
      },
      { type: "heading", text: "Your next opportunity", level: 2 },
      {
        type: "paragraph",
        text: `**${opportunityCount} significant opportunities** were identified in your audit.`,
      },
      {
        type: "paragraph",
        text: "Would you like to see how DigitalGate could address them?",
      },
      {
        type: "button",
        label: "Book a free DigitalGate strategy session →",
        href: strategyUrl,
      },
      {
        type: "paragraph",
        text: "We’ll review the findings with you and identify the highest-value improvements for your business.",
      },
      {
        type: "paragraph",
        text: "No obligation. No pressure. Just a practical discussion about where the biggest opportunities are.",
        muted: true,
      },
      { type: "divider" },
      { type: "kicker", text: "DigitalGate Business Audit™" },
      {
        type: "paragraph",
        text: "Your digital presence, visibility & growth report.",
        muted: true,
      },
      {
        type: "signoff",
        lines: ["— Ben Roe", "DigitalGate", "https://digitalgate.com.au"],
      },
    ],
    { accentColor: "#3B82F6" },
  );

  return {
    subject: `Your DigitalGate Business Audit™ is ready — ${input.companyName}`,
    body,
    bodyHtml,
    overall,
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
    contactEmail: email,
    contactPhone: phone || null,
    publicPreview: false,
  });
  const preview = buildPublicBusinessAuditPreview(audit);

  const report = renderAuditEmailBody({
    firstName,
    companyName: businessName,
    websiteUrl,
    industry: industry || undefined,
    audit,
    preview,
  });

  const lead = await createLead({
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
      overall_score: report.overall,
      business_health_score: report.overall,
    },
    externalRefs: {
      capture_path: "gen2_public_business_audit",
    },
  });

  let auditSent = false;
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
        ctaLabel: "Book a free DigitalGate strategy session →",
        footerNote:
          "DigitalGate Business Audit™ — diagnostic sales report from observable website presence signals. Not a formal SEO ranking or AI citation report.",
      },
    });
    auditSent = delivery.status === "sent" || delivery.status === "queued";
  } catch (err) {
    console.info("[public-business-audit] report email failed", err);
  }

  const sequence = buildFreeAuditSequenceStamp({
    firstName,
    fullName,
    companyName: businessName,
    websiteUrl,
    email,
    aiScore: preview.pillars.aiVisibility,
    websiteScore: preview.pillars.websiteHealth,
    seoScore: preview.pillars.searchVisibility,
    overallScore: report.overall,
    opportunityCount: preview.opportunities.length,
    email1Sent: auditSent,
  });

  const { prisma } = await import("@dg/database");
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
      `Business Health Score: ${report.overall}`,
      `Opportunities: ${preview.opportunities.length}`,
      `Audit emailed: ${auditSent ? "yes" : "no"}`,
    ].join("\n");
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
                value: String(report.overall),
              },
              {
                label: "Opportunities",
                value: String(preview.opportunities.length),
              },
              { label: "Audit emailed", value: auditSent ? "Yes" : "No" },
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
    overallScore: report.overall,
    pillars: preview.pillars,
    opportunities: preview.opportunities,
    message: auditSent
      ? "Your DigitalGate Business Audit™ is on its way — check your inbox shortly."
      : "Audit request received! We'll be in touch shortly.",
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
    if (!sequence?.email || !sequence.activatedAt) continue;

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
            activityType:
              delivery.status === "sent" ? "email_sent" : "email_queued",
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

        if (delivery.status === "failed") failed += 1;
        else sent += 1;
        Object.assign(sequence, nextSeq);
      } catch (err) {
        failed += 1;
        console.error("[free-audit-followups] send failed", lead.id, step, err);
      }
    }
  }

  return { processed, sent, failed };
}
