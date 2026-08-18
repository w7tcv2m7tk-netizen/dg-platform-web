import type { DigitalTwinSnapshot } from "../twin/types";
import type { OrganisationBusinessProfile } from "./business-profile-types";
import { absoluteBrandAssetUrl, parseBrandColours } from "./brand-theme";
import { getOrganisationBusinessProfile } from "./onboarding-profile";
import { getOrganisationGoals, type OrganisationGoal } from "./goals";

export type BusinessContextIdentity = {
  businessName: string;
  tradingName?: string;
  logoUrl?: string;
  iconUrl?: string;
  brandColours?: string[];
  industry?: string;
  abn?: string;
  acn?: string;
  website?: string;
  timezone?: string;
  businessHours?: string;
  locations: Array<{ label?: string; formatted: string }>;
};

export type BusinessContextContact = {
  primaryName?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  businessEmail?: string;
  businessPhone?: string;
  supportEmail?: string;
  supportPhone?: string;
  social: Record<string, string>;
};

export type BusinessContextBrandVoice = {
  tagline?: string;
  tone?: string;
  services?: string;
  targetAudience?: string;
  competitors?: string;
};

export type BusinessContextTwinSummary = {
  businessHealth?: number;
  aiVisibility?: number;
  seo?: number;
  websiteHealth?: number;
  contactCount?: number;
  activeLeads?: number;
  pipelineValue?: number;
  revenueMtdCents?: number;
  connectedSystems: string[];
  websites: string[];
};

export type BusinessContext = {
  organisationId: string;
  organisationName: string;
  locale: string;
  currency: string;
  enabledAppIds: string[];
  identity: BusinessContextIdentity;
  contact: BusinessContextContact;
  brandVoice: BusinessContextBrandVoice;
  twin: BusinessContextTwinSummary;
  profile: OrganisationBusinessProfile | null;
  goals: OrganisationGoal[];
  capturedAt: string;
};

function formatLocation(
  loc: NonNullable<OrganisationBusinessProfile["locations"]>[number],
): string {
  return [
    loc.street,
    loc.city,
    loc.state,
    loc.postcode,
    loc.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function profileToIdentity(
  profile: OrganisationBusinessProfile | null,
  org: { name: string; industry?: string | null; timezone?: string | null },
): BusinessContextIdentity {
  const locations: BusinessContextIdentity["locations"] = [];

  if (profile?.locations?.length) {
    for (const loc of profile.locations) {
      const formatted = formatLocation(loc);
      if (formatted) locations.push({ label: loc.label, formatted });
    }
  } else if (profile?.address) {
    const formatted = [
      profile.address.street,
      profile.address.city,
      profile.address.state,
      profile.address.postcode,
      profile.address.country,
    ]
      .filter(Boolean)
      .join(", ");
    if (formatted) locations.push({ label: "Primary", formatted });
  }

  const logoUrl = absoluteBrandAssetUrl(profile?.logoUrl);
  const iconUrl =
    absoluteBrandAssetUrl(profile?.iconUrl) || logoUrl || undefined;

  return {
    businessName: profile?.businessName?.trim() || org.name,
    tradingName: profile?.tradingName,
    logoUrl,
    iconUrl,
    brandColours: (() => {
      const colours = parseBrandColours(profile?.brandColours);
      return colours.length ? colours : undefined;
    })(),
    industry: profile?.industryVertical || org.industry || undefined,
    abn: profile?.abn,
    acn: profile?.acn,
    website: profile?.websiteUrl,
    timezone: profile?.businessHours?.timezone || org.timezone || undefined,
    businessHours: profile?.businessHours?.schedule,
    locations,
  };
}

function profileToContact(profile: OrganisationBusinessProfile | null): BusinessContextContact {
  const social: Record<string, string> = {};
  const s = profile?.social;
  if (s?.googleBusiness) social.googleBusiness = s.googleBusiness;
  if (s?.facebook) social.facebook = s.facebook;
  if (s?.instagram) social.instagram = s.instagram;
  if (s?.linkedin) social.linkedin = s.linkedin;
  if (s?.youtube) social.youtube = s.youtube;
  if (s?.tiktok) social.tiktok = s.tiktok;
  if (s?.x) social.x = s.x;
  if (s?.pinterest) social.pinterest = s.pinterest;

  return {
    primaryName: profile?.contactName,
    primaryEmail: profile?.contactEmail ?? profile?.businessEmail,
    primaryPhone: profile?.contactPhone ?? profile?.businessPhone,
    businessEmail: profile?.businessEmail,
    businessPhone: profile?.businessPhone,
    supportEmail: profile?.supportEmail,
    supportPhone: profile?.supportPhone,
    social,
  };
}

function snapshotToTwinSummary(snapshot?: DigitalTwinSnapshot | null): BusinessContextTwinSummary {
  if (!snapshot) {
    return { connectedSystems: [], websites: [] };
  }
  return {
    businessHealth: snapshot.scores.businessHealth ?? snapshot.scores.businessGrowth,
    aiVisibility: snapshot.scores.aiVisibility,
    seo: snapshot.scores.seo,
    websiteHealth: snapshot.scores.websiteHealth,
    contactCount: snapshot.metrics.contactCount,
    activeLeads: snapshot.metrics.activeLeads,
    pipelineValue: snapshot.metrics.pipelineValue,
    revenueMtdCents: snapshot.metrics.revenueMtdCents,
    connectedSystems: snapshot.connectors,
    websites: snapshot.websites,
  };
}

export type GetBusinessContextInput = {
  organisationId: string;
  organisationName: string;
  locale?: string;
  currency?: string;
  timezone?: string | null;
  industry?: string | null;
  enabledAppIds?: string[];
  twinSnapshot?: DigitalTwinSnapshot | null;
  profileOverride?: OrganisationBusinessProfile | null;
  goalsOverride?: OrganisationGoal[] | null;
};

/** Single read path for apps and AI — Business Profile + Twin summary */
export async function getBusinessContext(
  input: GetBusinessContextInput,
): Promise<BusinessContext> {
  const [profile, goals] = await Promise.all([
    input.profileOverride !== undefined
      ? Promise.resolve(input.profileOverride)
      : getOrganisationBusinessProfile(input.organisationId),
    input.goalsOverride !== undefined
      ? Promise.resolve(input.goalsOverride ?? [])
      : getOrganisationGoals(input.organisationId),
  ]);

  const orgMeta = {
    name: input.organisationName,
    industry: input.industry,
    timezone: input.timezone,
  };

  return {
    organisationId: input.organisationId,
    organisationName: input.organisationName,
    locale: input.locale ?? "en-AU",
    currency: input.currency ?? "AUD",
    enabledAppIds: input.enabledAppIds ?? [],
    identity: profileToIdentity(profile, orgMeta),
    contact: profileToContact(profile),
    brandVoice: {
      tagline: profile?.brandVoice?.tagline,
      tone: profile?.brandVoice?.tone,
      services: profile?.brandVoice?.services,
      targetAudience: profile?.brandVoice?.targetAudience,
      competitors: profile?.brandVoice?.competitors,
    },
    twin: snapshotToTwinSummary(input.twinSnapshot),
    profile,
    goals,
    capturedAt: new Date().toISOString(),
  };
}

/** System prompt prefix for AI Service / assistant */
export function buildAiSystemPrompt(context: BusinessContext): string {
  const lines: string[] = [
    "You are the AI assistant for a business on the DigitalGate platform.",
    "Use the following business context automatically — never ask for information already provided.",
    "",
    "## Business identity",
    `Name: ${context.identity.businessName}`,
  ];

  if (context.identity.tradingName) lines.push(`Trading name: ${context.identity.tradingName}`);
  if (context.identity.industry) lines.push(`Industry: ${context.identity.industry}`);
  if (context.identity.brandColours?.length) {
    lines.push(`Brand colours: ${context.identity.brandColours.join(", ")}`);
  }
  if (context.identity.website) lines.push(`Website: ${context.identity.website}`);
  if (context.identity.abn) lines.push(`ABN: ${context.identity.abn}`);
  if (context.identity.locations.length) {
    lines.push(
      `Locations: ${context.identity.locations.map((l) => l.formatted).join("; ")}`,
    );
  }
  if (context.identity.businessHours) {
    lines.push(`Business hours: ${context.identity.businessHours}`);
  }

  if (context.brandVoice.tone || context.brandVoice.services) {
    lines.push("", "## Brand voice");
    if (context.brandVoice.tagline) lines.push(`Tagline: ${context.brandVoice.tagline}`);
    if (context.brandVoice.tone) lines.push(`Tone: ${context.brandVoice.tone}`);
    if (context.brandVoice.services) lines.push(`Services: ${context.brandVoice.services}`);
    if (context.brandVoice.targetAudience) {
      lines.push(`Target audience: ${context.brandVoice.targetAudience}`);
    }
    if (context.brandVoice.competitors) {
      lines.push(`Competitors: ${context.brandVoice.competitors}`);
    }
  }

  const socialEntries = Object.entries(context.contact.social);
  if (socialEntries.length) {
    lines.push("", "## Online presence");
    for (const [key, url] of socialEntries) {
      lines.push(`${key}: ${url}`);
    }
  }

  if (context.twin.websiteHealth || context.twin.aiVisibility) {
    lines.push("", "## Digital Twin signals");
    if (context.twin.websiteHealth != null) {
      lines.push(`Website health: ${context.twin.websiteHealth}/100`);
    }
    if (context.twin.aiVisibility != null) {
      lines.push(`AI Visibility: ${context.twin.aiVisibility}/100`);
    }
    if (context.twin.seo != null) lines.push(`SEO score: ${context.twin.seo}/100`);
  }

  const activeGoals = context.goals.filter((goal) => goal.status === "active");
  if (activeGoals.length) {
    lines.push("", "## Goals");
    for (const goal of activeGoals) {
      lines.push(
        `- ${goal.title} (target ${goal.target} ${goal.metric}, ${goal.horizon}${goal.dueAt ? `, due ${goal.dueAt}` : ""})`,
      );
    }
    lines.push("Prioritise actions that move these goals.");
  }

  if (context.enabledAppIds.length) {
    lines.push("", `Enabled apps: ${context.enabledAppIds.join(", ")}`);
  }

  return lines.join("\n");
}

export type AiGenerateAction =
  | "social_post"
  | "email_draft"
  | "briefing"
  | "lead_follow_up"
  | "lead_summary"
  | "opportunity_follow_up"
  | "opportunity_summary"
  | "contact_follow_up"
  | "contact_summary"
  | "listing_description";

export type CrmAssistEntity = {
  kind: "lead" | "opportunity" | "contact" | "property";
  id: string;
  title?: string | null;
  status?: string | null;
  stage?: string | null;
  source?: string | null;
  description?: string | null;
  propertyAddress?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  valueCents?: number | null;
  currency?: string | null;
  notes?: string[];
};

/** Template generation using full business context — no external LLM required */
export function generateFromBusinessContext(
  context: BusinessContext,
  action: AiGenerateAction,
  entity?: CrmAssistEntity | null,
): string {
  const name = context.identity.businessName;
  const industry = context.identity.industry ?? "your industry";
  const tone = context.brandVoice.tone ?? "professional, approachable";
  const services = context.brandVoice.services ?? "our core services";
  const audience = context.brandVoice.targetAudience ?? "local customers";
  const location = context.identity.locations[0]?.formatted;
  const contactFirst =
    entity?.contactName?.trim()?.split(/\s+/)[0] || "{{first_name}}";
  const entityLabel =
    entity?.title ||
    entity?.propertyAddress ||
    (entity?.kind === "opportunity" ? "this opportunity" : "this lead");

  switch (action) {
    case "social_post":
      return [
        `📣 ${name}`,
        context.brandVoice.tagline ? context.brandVoice.tagline : "",
        "",
        `We're here for ${audience}${location ? ` in ${location.split(",")[0]}` : ""}.`,
        `Specialising in ${services}.`,
        "",
        `#${industry.replace(/\s+/g, "")} #${name.replace(/\s+/g, "")}`,
        "",
        `(Generated in ${tone} voice — edit before publishing)`,
      ]
        .filter(Boolean)
        .join("\n");
    case "email_draft":
      return [
        `Subject: Following up from ${name}`,
        "",
        `Hi ${contactFirst},`,
        "",
        `Thank you for connecting with ${name}. We help ${audience} with ${services}.`,
        location ? `We're based in ${location}.` : "",
        "",
        `Would you like to book a quick call this week?`,
        "",
        `Best regards,`,
        context.contact.primaryName ?? name,
      ]
        .filter(Boolean)
        .join("\n");
    case "briefing": {
      const activeGoals = context.goals.filter((goal) => goal.status === "active");
      return [
        `Daily briefing for ${name}`,
        "",
        `Industry: ${industry}`,
        context.twin.contactCount != null
          ? `Contacts in CRM: ${context.twin.contactCount}`
          : "",
        context.twin.activeLeads != null
          ? `Active leads: ${context.twin.activeLeads}`
          : "",
        context.twin.websiteHealth != null
          ? `Website health: ${context.twin.websiteHealth}/100`
          : "",
        activeGoals.length
          ? `Goals: ${activeGoals.map((goal) => goal.title).join("; ")}`
          : "No goals set yet.",
        "",
        activeGoals.length
          ? `Focus today: move the goals above using open opportunities and follow-up.`
          : `Focus today: set business goals, then follow up on open opportunities.`,
      ]
        .filter(Boolean)
        .join("\n");
    }
    case "lead_follow_up":
    case "opportunity_follow_up":
    case "contact_follow_up":
      return [
        `Subject: Following up — ${entityLabel}`,
        "",
        `Hi ${contactFirst},`,
        "",
        `Thanks for your interest with ${name}.`,
        entity?.propertyAddress
          ? `I wanted to follow up regarding ${entity.propertyAddress}.`
          : `I wanted to follow up on ${entityLabel}.`,
        entity?.stage
          ? `We're currently at the ${entity.stage.replace(/_/g, " ")} stage and happy to help with next steps.`
          : `Happy to help with next steps when you're ready.`,
        "",
        `Would a short call this week work for you?`,
        "",
        `Best regards,`,
        context.contact.primaryName ?? name,
        "",
        `(${tone} draft — review before sending)`,
      ]
        .filter(Boolean)
        .join("\n");
    case "lead_summary":
    case "opportunity_summary":
    case "contact_summary": {
      const value =
        entity?.valueCents != null
          ? new Intl.NumberFormat("en-AU", {
              style: "currency",
              currency: entity.currency || "AUD",
            }).format(entity.valueCents / 100)
          : null;
      const nextStep =
        action === "lead_summary"
          ? "Send a personalised follow-up and confirm appraisal / discovery timing."
          : action === "contact_summary"
            ? "Send a personalised check-in and confirm how you can help next."
            : "Advance the opportunity stage or schedule a decision call.";
      return [
        `Summary — ${entityLabel}`,
        "",
        entity?.kind ? `Type: ${entity.kind}` : "",
        entity?.status ? `Status: ${entity.status}` : "",
        entity?.stage ? `Stage: ${entity.stage.replace(/_/g, " ")}` : "",
        entity?.source ? `Source: ${entity.source}` : "",
        entity?.propertyAddress ? `Property: ${entity.propertyAddress}` : "",
        entity?.contactName ? `Contact: ${entity.contactName}` : "",
        entity?.contactEmail ? `Email: ${entity.contactEmail}` : "",
        entity?.contactPhone ? `Phone: ${entity.contactPhone}` : "",
        value ? `Pipeline value: ${value}` : "",
        entity?.description ? `Notes: ${entity.description}` : "",
        entity?.notes?.length
          ? `Recent activity:\n${entity.notes
              .slice(0, 5)
              .map((n) => `• ${n}`)
              .join("\n")}`
          : "",
        "",
        `Suggested next step: ${nextStep}`,
        `(Generated for ${name} — edit before sharing)`,
      ]
        .filter(Boolean)
        .join("\n");
    }
    case "listing_description": {
      const facts = entity?.notes?.length
        ? entity.notes.join("\n")
        : [
            entity?.propertyAddress ? `Address: ${entity.propertyAddress}` : "",
            entity?.description ? `Existing description:\n${entity.description}` : "",
          ]
            .filter(Boolean)
            .join("\n");
      return [
        facts || `Listing facts for ${entityLabel} are limited.`,
        "",
        entity?.propertyAddress
          ? `Located at ${entity.propertyAddress}, this property is presented by ${name}.`
          : `This property is presented by ${name}.`,
        "",
        "This is an AI draft from Cotality and listing facts — review and edit before publishing. It is not a valuation.",
        `(${tone} voice — Cotality does not supply marketing description)`,
      ]
        .filter(Boolean)
        .join("\n");
    }
    default:
      return `Context loaded for ${name}.`;
  }
}
