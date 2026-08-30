import type { Prisma } from "@dg/database";

import { createQuote } from "../../commerce/document-engine";
import {
  growthScopeWhere,
  type GrowthScope,
} from "./scope";
import type { CommerceLineItem } from "../../commerce/types";
import type { GrowthProposalServiceLine } from "./types";
import { updateGrowthProspect } from "./prospects";

/**
 * Published DigitalGate list prices (AUD) — mirrors platform checkout + pricing catalog.
 * Used for proposal drafts; never invent custom amounts here.
 */
export const GROWTH_PROPOSAL_CATALOG = {
  platformGrowth: {
    label: "DigitalGate Growth (platform)",
    description: "CRM, dashboard, automation, email/SMS, Website Manager — 5 users.",
    amountCents: 24900,
    appId: "platform",
  },
  aiVisibility: {
    label: "AI Visibility™",
    description: "AI search visibility scoring and monitoring.",
    amountCents: 9900,
    appId: "ai-visibility",
  },
  seo: {
    label: "SEO App",
    description: "Deep audits, rankings, and technical optimisation.",
    amountCents: 9900,
    appId: "seo",
  },
  realEstate: {
    label: "Real Estate App",
    description: "Vendor/buyer pipelines, listings, and WordPress sync.",
    amountCents: 9900,
    appId: "real-estate",
  },
  accommodation: {
    label: "Accommodation App",
    description: "Bookings, housekeeping, and OTA calendar sync.",
    amountCents: 9900,
    appId: "accommodation",
  },
  commerce: {
    label: "Commerce (quotes & invoices)",
    description: "Quotes, invoices, and payment requests on DigitalGate.",
    amountCents: 0,
    appId: "commerce",
    included: true,
  },
} as const;

function findingSeverityBoost(findings: unknown): {
  critical: number;
  websiteWeak: boolean;
  seoWeak: boolean;
  aiWeak: boolean;
} {
  const items =
    findings && typeof findings === "object" && Array.isArray((findings as { items?: unknown }).items)
      ? ((findings as { items: { severity?: string; domain?: string }[] }).items)
      : [];
  const critical = items.filter((f) => f.severity === "critical").length;
  return {
    critical,
    websiteWeak: items.some((f) => f.domain === "website" && f.severity !== "opportunity"),
    seoWeak: items.some((f) => f.domain === "seo"),
    aiWeak: items.some((f) => f.domain === "ai_visibility"),
  };
}

function formatAud(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function buildProposalServiceLines(input: {
  industry: string | null;
  businessHealth: number | null;
  websiteHealth: number | null;
  seoScore: number | null;
  aiVisibility: number | null;
  findings: unknown;
}): GrowthProposalServiceLine[] {
  const boost = findingSeverityBoost(input.findings);
  const lines: GrowthProposalServiceLine[] = [
    {
      label: GROWTH_PROPOSAL_CATALOG.platformGrowth.label,
      description: GROWTH_PROPOSAL_CATALOG.platformGrowth.description,
      appId: GROWTH_PROPOSAL_CATALOG.platformGrowth.appId,
      amountCents: GROWTH_PROPOSAL_CATALOG.platformGrowth.amountCents,
    },
  ];

  const health = input.businessHealth ?? 100;
  const needAi =
    boost.aiWeak ||
    (input.aiVisibility != null && input.aiVisibility < 70) ||
    health < 75;
  const needSeo =
    boost.seoWeak ||
    boost.websiteWeak ||
    (input.seoScore != null && input.seoScore < 70) ||
    (input.websiteHealth != null && input.websiteHealth < 65);

  if (needAi) {
    lines.push({
      label: GROWTH_PROPOSAL_CATALOG.aiVisibility.label,
      description: GROWTH_PROPOSAL_CATALOG.aiVisibility.description,
      appId: GROWTH_PROPOSAL_CATALOG.aiVisibility.appId,
      amountCents: GROWTH_PROPOSAL_CATALOG.aiVisibility.amountCents,
    });
  }
  if (needSeo) {
    lines.push({
      label: GROWTH_PROPOSAL_CATALOG.seo.label,
      description: GROWTH_PROPOSAL_CATALOG.seo.description,
      appId: GROWTH_PROPOSAL_CATALOG.seo.appId,
      amountCents: GROWTH_PROPOSAL_CATALOG.seo.amountCents,
    });
  }

  const industry = (input.industry ?? "").toLowerCase();
  if (industry.includes("real estate") || industry.includes("agency")) {
    lines.push({
      label: GROWTH_PROPOSAL_CATALOG.realEstate.label,
      description: GROWTH_PROPOSAL_CATALOG.realEstate.description,
      appId: GROWTH_PROPOSAL_CATALOG.realEstate.appId,
      amountCents: GROWTH_PROPOSAL_CATALOG.realEstate.amountCents,
    });
  } else if (
    industry.includes("accommodation") ||
    industry.includes("hotel") ||
    industry.includes("holiday")
  ) {
    lines.push({
      label: GROWTH_PROPOSAL_CATALOG.accommodation.label,
      description: GROWTH_PROPOSAL_CATALOG.accommodation.description,
      appId: GROWTH_PROPOSAL_CATALOG.accommodation.appId,
      amountCents: GROWTH_PROPOSAL_CATALOG.accommodation.amountCents,
    });
  }

  return lines;
}

export async function draftGrowthProposal(
  prospectId: string,
  scope: GrowthScope,
) {
  const { prisma } = await import("@dg/database");

  // Resolve inside the scope — never by id alone.
  const prospect = await prisma.growthProspect.findFirst({
    where: { id: prospectId, ...growthScopeWhere(scope) },
  });
  if (!prospect) return null;

  const audit = await prisma.growthProspectAudit.findFirst({
    where: { prospectId: prospect.id },
    orderBy: { auditedAt: "desc" },
  });

  const services = audit
    ? buildProposalServiceLines({
        industry: prospect.industry,
        businessHealth: audit.businessHealth,
        websiteHealth: audit.websiteHealth,
        seoScore: audit.seoScore,
        aiVisibility: audit.aiVisibility,
        findings: audit.findings,
      })
    : [];

  const totalCents = services.reduce((sum, line) => sum + line.amountCents, 0);
  const meta =
    prospect.metadata && typeof prospect.metadata === "object"
      ? (prospect.metadata as Record<string, unknown>)
      : {};

  return {
    prospectId: prospect.id,
    businessName: prospect.businessName,
    contactName: prospect.contactName,
    contactEmail: prospect.contactEmail,
    contactPhone: prospect.contactPhone,
    industry: prospect.industry,
    location: prospect.location,
    websiteUrl: prospect.websiteUrl,
    stage: prospect.stage,
    convertedOrganisationId: prospect.convertedOrganisationId,
    auditId: audit?.id ?? null,
    businessHealth: audit?.businessHealth ?? null,
    services,
    totalCents,
    totalLabel: formatAud(totalCents),
    periodHint: "Estimated monthly (list prices)",
    coverLetter: audit
      ? `Following the live presence audit for ${prospect.businessName} (Business Health ${audit.businessHealth ?? "—"}/100), this proposal packages DigitalGate Growth with the apps that close the gaps we measured.`
      : `Run a presence audit for ${prospect.businessName} before pricing a proposal.`,
    executiveSummary: audit
      ? `Recommended package totals ${formatAud(totalCents)}/mo at published list prices.`
      : "Audit required before a priced proposal.",
    latestQuoteId:
      typeof meta.latestQuoteId === "string" ? meta.latestQuoteId : null,
    generatedAt: new Date().toISOString(),
  };
}

export async function listGrowthProposalDrafts(
  scope: GrowthScope,
  options?: { limit?: number },
) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options?.limit ?? 40, 80);

  const prospects = await prisma.growthProspect.findMany({
    where: {
      ...growthScopeWhere(scope),
      archivedAt: null,
      stage: {
        in: [
          "report_viewed",
          "meeting_booked",
          "proposal_sent",
          "follow_up_due",
          "audit_created",
          "report_sent",
          "won",
          "onboarding",
        ],
      },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  const drafts = [];
  for (const p of prospects) {
    const draft = await draftGrowthProposal(p.id, scope);
    if (draft) drafts.push(draft);
  }
  return drafts;
}

export async function createGrowthProposalQuote(input: {
  prospectId: string;
  /** Tenant the commerce quote is raised under. */
  organisationId: string;
  scope: GrowthScope;
  actorId?: string;
}) {
  const { prisma } = await import("@dg/database");

  const draft = await draftGrowthProposal(input.prospectId, input.scope);
  if (!draft) return null;
  if (!draft.auditId || draft.services.length === 0) {
    return { error: "audit_required" as const };
  }

  const lineItems: CommerceLineItem[] = draft.services.map((line) => ({
    description: `${line.label} — monthly`,
    quantity: 1,
    unitAmountCents: line.amountCents,
    currency: "AUD",
    taxRateBps: 1000,
    metadata: { appId: line.appId, growthProspectId: draft.prospectId },
  }));

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  const quote = await createQuote({
    organisationId: input.organisationId,
    actorId: input.actorId,
    sourceApp: "command-centre",
    sourceEntity: { type: "GrowthProspect", id: draft.prospectId },
    lineItems,
    currency: "AUD",
    validUntil,
    notes: [
      draft.coverLetter,
      draft.executiveSummary,
      draft.websiteUrl ? `Website: ${draft.websiteUrl}` : null,
    ]
      .filter(Boolean)
      .join("\n\n"),
    buyer: {
      name: draft.businessName,
      email: draft.contactEmail ?? undefined,
      phone: draft.contactPhone ?? undefined,
      address: draft.location ?? undefined,
    },
    metadata: {
      growthProspectId: draft.prospectId,
      growthAuditId: draft.auditId,
      proposalSource: "growth-engine",
    },
  });

  const prospect = await prisma.growthProspect.findUnique({
    where: { id: draft.prospectId },
  });
  const existingMeta =
    prospect?.metadata && typeof prospect.metadata === "object"
      ? (prospect.metadata as Record<string, unknown>)
      : {};

  await prisma.growthProspect.update({
    where: { id: draft.prospectId },
    data: {
      metadata: {
        ...existingMeta,
        latestQuoteId: quote.id,
        latestQuoteNumber: quote.quoteNumber,
        latestProposalAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  });

  await prisma.growthProspectEngagement.create({
    data: {
      prospectId: draft.prospectId,
      type: "proposal_sent",
      metadata: {
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        totalCents: quote.totalCents,
      },
    },
  });

  await updateGrowthProspect({
    prospectId: draft.prospectId,
    organisationId: input.organisationId,
    stage: "proposal_sent",
    actorId: input.actorId,
    operatorOrganisationId: input.organisationId,
  });

  return {
    quoteId: quote.id,
    quoteNumber: quote.quoteNumber,
    totalCents: quote.totalCents,
    status: quote.status,
    prospectId: draft.prospectId,
    href: `/apps/commerce/quotes/${quote.id}`,
  };
}
