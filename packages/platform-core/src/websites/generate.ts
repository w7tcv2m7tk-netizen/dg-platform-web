/**
 * AI Site Generator — Business Profile + brief → structured page/component JSON.
 * Falls back to deterministic industry templates when LLM is unavailable.
 */

import { llmChat, llmConfigured } from "../ai/llm";
import type { OrganisationBusinessProfile } from "../org/business-profile-types";
import { parseBrandColours, resolveOrgBrandTheme } from "../org/brand-theme";
import { parseGeneratedSiteModel } from "./schema";
import {
  buildIndustrySiteModel,
  resolveWebsiteTemplateId,
} from "./templates";
import type {
  GeneratedSiteModel,
  WebsiteTemplateId,
  WebsiteTheme,
} from "./types";

function servicesList(profile: OrganisationBusinessProfile | null): string[] {
  const raw = profile?.brandVoice?.services?.trim();
  if (!raw) return ["Consulting", "Strategy", "Support"];
  return raw
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function displayName(
  profile: OrganisationBusinessProfile | null,
  orgName: string,
): string {
  return (
    profile?.tradingName?.trim() ||
    profile?.businessName?.trim() ||
    orgName
  );
}

function themeFromProfile(
  profile: OrganisationBusinessProfile | null,
  orgName: string,
): WebsiteTheme {
  const theme = resolveOrgBrandTheme({
    organisationName: orgName,
    profile,
  });
  const colours = parseBrandColours(profile?.brandColours);
  return {
    primaryColor: theme.primaryColor,
    accentColor: theme.accentColor,
    backgroundColor: theme.backgroundColor || colours[2],
    logoUrl: theme.logoUrl,
    iconUrl: theme.iconUrl,
    businessName: theme.businessName,
    fontHeading: "Fraunces",
    fontBody: "Source Sans 3",
  };
}

/** Deterministic MVP site when LLM is off or parse fails */
export function buildTemplateSiteModel(input: {
  organisationName: string;
  profile: OrganisationBusinessProfile | null;
  brief?: string | null;
  template?: WebsiteTemplateId | "auto";
  enabledAppIds?: string[];
}): GeneratedSiteModel {
  const name = displayName(input.profile, input.organisationName);
  const services = servicesList(input.profile);
  const tagline =
    input.profile?.brandVoice?.tagline?.trim() ||
    input.brief?.trim()?.slice(0, 140) ||
    `Professional ${input.profile?.industryVertical || "business"} services`;
  const about =
    input.brief?.trim() ||
    input.profile?.brandVoice?.targetAudience?.trim() ||
    `${name} helps clients with ${services.slice(0, 3).join(", ")}.`;
  const phone =
    input.profile?.businessPhone || input.profile?.contactPhone || undefined;
  const email =
    input.profile?.businessEmail || input.profile?.contactEmail || undefined;
  const theme = themeFromProfile(input.profile, input.organisationName);
  const template = resolveWebsiteTemplateId({
    explicit: input.template ?? "auto",
    industryVertical: input.profile?.industryVertical,
    enabledAppIds: input.enabledAppIds,
  });

  return buildIndustrySiteModel({
    name,
    tagline,
    about,
    services,
    phone,
    email,
    theme,
    template,
  });
}

export async function generateSiteModel(input: {
  organisationName: string;
  profile: OrganisationBusinessProfile | null;
  brief?: string | null;
  template?: WebsiteTemplateId | "auto";
  enabledAppIds?: string[];
}): Promise<{
  model: GeneratedSiteModel;
  source: "llm" | "template";
  template: WebsiteTemplateId;
  error?: string;
}> {
  const template = resolveWebsiteTemplateId({
    explicit: input.template ?? "auto",
    industryVertical: input.profile?.industryVertical,
    enabledAppIds: input.enabledAppIds,
  });
  const fallback = buildTemplateSiteModel({ ...input, template });

  if (!llmConfigured()) {
    return { model: fallback, source: "template", template };
  }

  const name = displayName(input.profile, input.organisationName);
  const services = servicesList(input.profile);
  const theme = themeFromProfile(input.profile, input.organisationName);

  const pageHint =
    template === "real_estate"
      ? "Include pages: home, listings (appraisals CTA), about, contact. Contact must include contact_form. CTAs should favour Book an appraisal."
      : template === "accommodation"
        ? "Include pages: home, stay (units), about, contact. Contact must include contact_form. CTAs should favour Check availability / Enquire to book."
        : "Include pages: home, services, about, contact. Contact page must include contact_form.";

  try {
    const result = await llmChat({
      maxTokens: 4000,
      tier: "standard",
      messages: [
        {
          role: "system",
          content: [
            "You are DigitalGate AI Website Generator.",
            "Emit ONLY valid JSON for a structured website model — never raw HTML.",
            "Schema: { name?, seo?: {title, description, ogTitle?, ogDescription?, ogImage?}, theme?: {}, pages: [{ title, slug, intent, seo?, components: [{ id?, type, props }] }] }",
            `Allowed component types: nav, hero, trust, services, about, testimonials, cta, faq, contact_form, footer.`,
            pageHint,
            "Use Australian English (en-AU). Do not invent awards or false claims.",
            "Match brand voice from the profile. Keep copy concise.",
            `Industry template: ${template}`,
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              businessName: name,
              industry: input.profile?.industryVertical,
              template,
              services,
              tagline: input.profile?.brandVoice?.tagline,
              tone: input.profile?.brandVoice?.tone,
              targetAudience: input.profile?.brandVoice?.targetAudience,
              locations: input.profile?.locations,
              contact: {
                phone:
                  input.profile?.businessPhone || input.profile?.contactPhone,
                email:
                  input.profile?.businessEmail || input.profile?.contactEmail,
              },
              theme,
              brief: input.brief?.trim() || null,
            },
            null,
            2,
          ),
        },
      ],
    });

    const parsed = parseGeneratedSiteModel(result.text);
    if (!parsed) {
      return {
        model: fallback,
        source: "template",
        template,
        error: "LLM returned unparseable JSON — used template",
      };
    }

    parsed.theme = { ...theme, ...parsed.theme };
    return { model: parsed, source: "llm", template };
  } catch (err) {
    return {
      model: fallback,
      source: "template",
      template,
      error: err instanceof Error ? err.message : "LLM error",
    };
  }
}
