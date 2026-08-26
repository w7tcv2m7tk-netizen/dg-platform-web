/**
 * Gen 2 AI Platform Discovery — replaces WP `/wp-json/digitalgate/v1/discovery`.
 * Captures CRM lead + maturity score + tier recommendation (same response shape as WP).
 */

import { createContact } from "../contacts";
import { createLead } from "../leads";
import { createGrowthProspect } from "../command-centre/growth-engine/prospects";
import { createGrowthProspectAudit } from "../command-centre/growth-engine/audits";
import { sendMessage, composeEmailBody, type EmailBodyBlock } from "../communications";
import { getWebsiteBySlug } from "../websites/crud";

const SCALAR_FIELDS = [
  "full_name",
  "business_name",
  "email",
  "phone",
  "industry",
  "business_type",
  "team_size",
  "website_url",
  "crm",
  "accounting",
  "marketing_tools",
  "website_platform",
  "software_spend",
  "ai_adoption",
  "timeframe",
  "budget_range",
  "goals_message",
  "source",
] as const;

const ARRAY_FIELDS = [
  "challenges",
  "integrations",
  "growth_objectives",
  "interested_in",
] as const;

export type PlatformDiscoveryInput = Record<string, unknown> & {
  siteSlug?: string;
  /** honeypot */
  website?: string;
};

export type PlatformDiscoveryResult =
  | {
      ok: true;
      success: true;
      contact_id: string;
      organisation_id: string;
      maturity_score: number;
      maturity_grade: string;
      summary: string;
      priorities: string[];
      recommendation: Record<string, unknown>;
      audit_report_url: string;
      redirect_url: string;
    }
  | { ok: false; code: string; message: string };

type NormalizedDiscovery = {
  full_name: string;
  business_name: string;
  email: string;
  phone: string;
  industry: string;
  business_type: string;
  team_size: string;
  website_url: string;
  crm: string;
  accounting: string;
  marketing_tools: string;
  website_platform: string;
  software_spend: string;
  ai_adoption: string;
  timeframe: string;
  budget_range: string;
  goals_message: string;
  source: string;
  challenges: string[];
  integrations: string[];
  growth_objectives: string[];
  interested_in: string[];
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : value != null ? String(value).trim() : "";
}

function asStringList(value: unknown, altKey?: string): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => asString(v)).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (altKey && value && typeof value === "object") return [];
  return [];
}

function normalizeInput(raw: PlatformDiscoveryInput): NormalizedDiscovery {
  const data = {} as NormalizedDiscovery;
  for (const field of SCALAR_FIELDS) {
    data[field] = asString(raw[field]);
  }
  for (const field of ARRAY_FIELDS) {
    const fromArray = asStringList(raw[field]);
    const fromBracket = asStringList(raw[`${field}[]`]);
    data[field] = fromArray.length ? fromArray : fromBracket;
  }
  if (!data.source) data.source = "discovery";
  return data;
}

function maturitySummary(score: number, grade: string): string {
  if (grade === "A") {
    return "Strong digital foundation — ready to unify systems and scale with automation.";
  }
  if (grade === "B") {
    return "Solid base with room to connect systems and reduce manual work.";
  }
  if (grade === "C") {
    return "Fragmented stack — significant gains available from centralising operations.";
  }
  return "Early stage — a unified platform will deliver the fastest operational improvement.";
}

function calculateMaturity(data: NormalizedDiscovery) {
  let score = 42;

  if (data.website_url) score += 8;
  if (data.integrations.length >= 2) score += 6;
  else if (data.integrations.length === 1) score += 3;
  if (data.crm && data.crm !== "none" && data.crm !== "spreadsheets") score += 5;
  if (data.ai_adoption === "active" || data.ai_adoption === "implementing") score += 8;
  else if (data.ai_adoption === "exploring") score += 4;
  if (data.challenges.includes("disconnected-systems")) score -= 8;
  if (data.challenges.includes("manual-follow-up")) score -= 4;
  if (data.challenges.includes("reporting-visibility")) score -= 3;
  if (data.software_spend === "$2000+/mo") score -= 5;
  else if (data.software_spend === "$1000–2000/mo") score -= 2;

  score = Math.max(18, Math.min(96, score));

  let grade = "D";
  if (score >= 80) grade = "A";
  else if (score >= 65) grade = "B";
  else if (score >= 48) grade = "C";

  const priorities: string[] = [];
  if (data.challenges.includes("disconnected-systems")) {
    priorities.push("Consolidate CRM, website, and operations into one platform");
  }
  if (data.challenges.includes("manual-follow-up")) {
    priorities.push("Automate lead follow-up and client communications");
  }
  if (
    data.challenges.includes("ai-visibility") ||
    data.challenges.includes("online-visibility")
  ) {
    priorities.push("Improve AI and search visibility for your business");
  }
  if (data.challenges.includes("reporting-visibility")) {
    priorities.push("Centralise reporting with a single business dashboard");
  }
  if (!priorities.length) {
    priorities.push(
      "Activate the Core Platform and your first Industry App",
      "Connect existing tools with platform Connectors",
      "Enable automation for repetitive workflows",
    );
  }

  return {
    score,
    grade,
    priorities: priorities.slice(0, 3),
    summary: maturitySummary(score, grade),
    audit: undefined as { overall_score?: number; recommendations?: string[]; report_url?: string } | undefined,
  };
}

function recommendPlan(data: NormalizedDiscovery, maturity: ReturnType<typeof calculateMaturity>) {
  let tier = "professional";
  let tierLabel = "Growth";
  const team = data.team_size;

  if (team === "Just me" || team === "1") {
    tier = "starter";
    tierLabel = "Starter";
  } else if (team === "26–50" || team === "50+" || team === "11–25") {
    tier = "business";
    tierLabel = "Scale";
  }

  const industryMap: Record<string, string> = {
    "Real Estate": "real-estate",
    "Accommodation & Hospitality": "accommodation",
    "Hospitality & Accommodation": "accommodation",
    "Finance & Mortgage Broking": "finance",
    "Professional Services": "services",
    Professional: "services",
    "Commercial Property": "commercial",
    Automotive: "automotive",
    "Creators & Personal Brands": "services",
  };
  const industryApp = industryMap[data.industry] ?? "";

  const apps: string[] = [];
  if (industryApp) apps.push(industryApp);
  if (
    data.challenges.includes("ai-visibility") ||
    data.challenges.includes("online-visibility") ||
    data.interested_in.includes("AI Visibility")
  ) {
    apps.push("ai_visibility_pro");
  }
  if (
    data.challenges.includes("manual-follow-up") ||
    data.interested_in.includes("Automation")
  ) {
    apps.push("automation_pro");
  }
  if (data.interested_in.includes("Voice AI")) apps.push("voice_ai");

  const recommendedApps = [...new Set(apps)];

  return {
    platform_tier: tier,
    platform_tier_label: tierLabel,
    industry_app: industryApp,
    recommended_apps: recommendedApps,
    rationale: `Based on team size (${team || "your profile"}), industry, and operational challenges, we recommend ${tierLabel} with ${recommendedApps.length ? recommendedApps.join(", ") : "Core Platform features"}.`,
    maturity_grade: maturity.grade,
    maturity_score: maturity.score,
  };
}

async function resolveOrgId(siteSlug: string): Promise<string | null> {
  const site =
    (await getWebsiteBySlug(siteSlug, { publishedOnly: true })) ||
    (await getWebsiteBySlug(siteSlug));
  if (site?.organisationId) return site.organisationId;

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

function buildSummaryText(
  data: NormalizedDiscovery,
  maturity: ReturnType<typeof calculateMaturity>,
  recommendation: ReturnType<typeof recommendPlan>,
): string {
  return [
    `Discovery — ${data.business_name}`,
    `Maturity: ${maturity.grade} (${maturity.score}/100)`,
    `Recommended: ${recommendation.platform_tier_label}`,
    data.goals_message ? `Goals: ${data.goals_message}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function submitPublicPlatformDiscovery(
  input: PlatformDiscoveryInput,
): Promise<PlatformDiscoveryResult> {
  if (!process.env.DATABASE_URL) {
    return { ok: false, code: "database_not_configured", message: "DATABASE_URL not set" };
  }

  if (asString(input.website)) {
    return {
      ok: true,
      success: true,
      contact_id: "hp",
      organisation_id: "hp",
      maturity_score: 0,
      maturity_grade: "—",
      summary: "Thank you — we received your discovery.",
      priorities: [],
      recommendation: {},
      audit_report_url: "",
      redirect_url: "/discover/?discovery_sent=1",
    };
  }

  const data = normalizeInput(input);
  if (!data.full_name || !data.business_name || !data.email) {
    return {
      ok: false,
      code: "validation_error",
      message: "Full name, business name, and email are required.",
    };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { ok: false, code: "validation_error", message: "Please provide a valid email address." };
  }

  const siteSlug = asString(input.siteSlug) || "digitalgate";
  const organisationId = await resolveOrgId(siteSlug);
  if (!organisationId) {
    return { ok: false, code: "not_found", message: "DigitalGate organisation not found" };
  }

  const maturity = calculateMaturity(data);
  const recommendation = recommendPlan(data, maturity);

  const nameParts = data.full_name.split(/\s+/);
  const firstName = nameParts[0] || data.full_name;
  const lastName = nameParts.slice(1).join(" ") || undefined;

  const { prisma } = await import("@dg/database");
  let contactId: string | undefined;
  const existing = await prisma.contact.findFirst({
    where: { organisationId, email: data.email.toLowerCase(), deletedAt: null },
  });
  contactId = existing?.id;

  if (!contactId) {
    const contact = await createContact({
      organisationId,
      firstName,
      lastName,
      email: data.email,
      phone: data.phone || undefined,
      source: "discovery",
    });
    contactId = contact.id;
  }

  const lead = await createLead({
    organisationId,
    source: "discovery",
    title: `AI Platform Discovery — ${data.business_name}`,
    description: buildSummaryText(data, maturity, recommendation),
    contactId,
    status: "new",
    metadata: {
      lead_type: "discovery",
      capture_path: "gen2_platform_discovery",
      maturity_score: maturity.score,
      maturity_grade: maturity.grade,
      recommendation,
      submission: data,
    },
  });

  try {
    await createGrowthProspect({
      organisationId,
      businessName: data.business_name,
      contactName: data.full_name,
      contactEmail: data.email,
      contactPhone: data.phone || undefined,
      industry: data.industry || undefined,
      websiteUrl: data.website_url || undefined,
      actorId: "gen2:discovery",
      operatorOrganisationId: organisationId,
    }).then((prospect) =>
      createGrowthProspectAudit({
        prospectId: prospect.id,
        scores: {
          businessHealth: maturity.score,
        },
        findings: {
          recommendation,
          maturity,
          goals: data.goals_message,
          leadId: lead.id,
        },
        actorId: "gen2:discovery",
        operatorOrganisationId: organisationId,
      }),
    );
  } catch (err) {
    console.warn("[public-platform-discovery] growth prospect failed", err);
  }

  const adminTo =
    process.env.DG_ENQUIRY_ADMIN_EMAIL?.trim() ||
    process.env.DG_BUSINESS_AUDIT_ADMIN_EMAIL?.trim() ||
    "hello@digitalgate.com.au";

  const kvRows: { label: string; value: string }[] = [
    { label: "Business", value: data.business_name },
    { label: "Contact", value: data.full_name },
    { label: "Email", value: data.email },
    { label: "Maturity", value: `${maturity.grade} (${maturity.score}/100)` },
    { label: "Recommended tier", value: recommendation.platform_tier_label },
  ];
  if (data.phone) kvRows.push({ label: "Phone", value: data.phone });
  if (data.industry) kvRows.push({ label: "Industry", value: data.industry });

  const bodyBlocks: EmailBodyBlock[] = [
    { type: "kicker", text: "AI Platform Discovery" },
    { type: "heading", text: data.business_name },
    { type: "kv", rows: kvRows },
  ];
  if (data.goals_message) {
    bodyBlocks.push({ type: "paragraph", text: data.goals_message });
  }

  try {
    await sendMessage({
      organisationId,
      channel: "email",
      to: adminTo,
      subject: `AI Platform Discovery — ${data.business_name}`,
      body: buildSummaryText(data, maturity, recommendation),
      bodyHtml: composeEmailBody(bodyBlocks),
      metadata: { purpose: "platform_discovery_admin", lead_id: lead.id },
    });
  } catch (err) {
    console.warn("[public-platform-discovery] admin notify failed", err);
  }

  return {
    ok: true,
    success: true,
    contact_id: contactId,
    organisation_id: organisationId,
    maturity_score: maturity.score,
    maturity_grade: maturity.grade,
    summary: maturity.summary,
    priorities: maturity.priorities,
    recommendation,
    audit_report_url: maturity.audit?.report_url ?? "",
    redirect_url: "/discover/?discovery_sent=1",
  };
}
