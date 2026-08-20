/**
 * DigitalGate (Command Centre) is the platform operator org — not a customer
 * Industry tenant. Strip Industry App installs and Industry-shaped demo profile
 * fields so Services/Real Estate sample data never lives on DigitalGate itself.
 */

export const PLATFORM_OPERATOR_ORG_SLUGS = ["digitalgate"] as const;

/** Industry / vertical app ids that customers install — never default on the operator org. */
export const INDUSTRY_APP_IDS = [
  "real-estate",
  "accommodation",
  "property-management",
  "commercial",
  "property-development",
  "services",
  "finance",
  "automotive",
  "creator",
] as const;

export const DIGITALGATE_PLATFORM_BRAND_VOICE = {
  tagline: "The Gateway to Your Digital World™",
  tone: "Professional, warm, expert",
  services:
    "Business Operating Platform, Industry Apps, Growth Apps, Infrastructure, Intelligence",
  targetAudience:
    "Australian businesses across Property, Hospitality & Accommodation, Services, Finance and more",
  competitors: "Fragmented SaaS stacks and agency-only CRMs",
} as const;

export function isPlatformOperatorOrgSlug(slug: string | null | undefined): boolean {
  const s = (slug ?? "").toLowerCase().trim();
  return (
    s === "digitalgate" ||
    s.startsWith("digitalgate-") ||
    (PLATFORM_OPERATOR_ORG_SLUGS as readonly string[]).includes(s)
  );
}

export type SanitizePlatformOrgResult = {
  organisationId: string;
  slug: string;
  removedAppInstalls: string[];
  clearedServicesTemplate: boolean;
  clearedIndustryPlanPreview: boolean;
  brandVoiceUpdated: boolean;
  deletedProperties: number;
};

/**
 * Remove Industry App pollution from the DigitalGate operator organisation.
 */
export async function sanitizePlatformOperatorOrg(input?: {
  slug?: string;
}): Promise<SanitizePlatformOrgResult | null> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL required");
  }

  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  const slug = input?.slug ?? "digitalgate";
  const org = await prisma.organisation.findUnique({
    where: { slug },
    select: { id: true, slug: true, settings: true },
  });
  if (!org || !isPlatformOperatorOrgSlug(org.slug)) return null;

  const settings = (org.settings as Record<string, unknown> | null) ?? {};
  const apps = (settings.apps as Record<string, unknown> | undefined) ?? {};
  const enabledRaw = Array.isArray(apps.enabled) ? (apps.enabled as string[]) : [];
  const enabled = enabledRaw.filter(
    (id) => !(INDUSTRY_APP_IDS as readonly string[]).includes(id),
  );

  const planPreview = (apps.planPreview as Record<string, unknown> | undefined) ?? {};
  const hadIndustryPreview =
    Array.isArray(planPreview.industryApps) &&
    (planPreview.industryApps as unknown[]).length > 0;

  const profile = (settings.profile as Record<string, unknown> | undefined) ?? {};
  const brandVoice =
    (profile.brandVoice as Record<string, unknown> | undefined) ?? {};
  const servicesText =
    typeof brandVoice.services === "string" ? brandVoice.services : "";
  const looksLikeCleanerTemplate =
    /regular clean|end of lease|deep clean|office clean/i.test(servicesText);
  const industryVertical =
    typeof profile.industryVertical === "string" ? profile.industryVertical : "";

  const nextBrandVoice = {
    ...brandVoice,
    tagline:
      typeof brandVoice.tagline === "string" && brandVoice.tagline.trim()
        ? brandVoice.tagline
        : DIGITALGATE_PLATFORM_BRAND_VOICE.tagline,
    tone:
      typeof brandVoice.tone === "string" && brandVoice.tone.trim()
        ? brandVoice.tone
        : DIGITALGATE_PLATFORM_BRAND_VOICE.tone,
    services: looksLikeCleanerTemplate
      ? DIGITALGATE_PLATFORM_BRAND_VOICE.services
      : servicesText.trim() || DIGITALGATE_PLATFORM_BRAND_VOICE.services,
    targetAudience:
      typeof brandVoice.targetAudience === "string" &&
      brandVoice.targetAudience.trim() &&
      !looksLikeCleanerTemplate
        ? brandVoice.targetAudience
        : DIGITALGATE_PLATFORM_BRAND_VOICE.targetAudience,
    competitors:
      typeof brandVoice.competitors === "string" && brandVoice.competitors.trim()
        ? brandVoice.competitors
        : DIGITALGATE_PLATFORM_BRAND_VOICE.competitors,
  };

  const nextSettings: Record<string, unknown> = {
    ...settings,
    apps: {
      ...apps,
      enabled,
      planPreview: {
        ...planPreview,
        industryApps: [],
        appliedAt: new Date().toISOString(),
      },
    },
    profile: {
      ...profile,
      industryVertical:
        industryVertical === "services" ||
        industryVertical === "real-estate" ||
        industryVertical === "real_estate"
          ? "software"
          : industryVertical || "software",
      brandVoice: nextBrandVoice,
      updatedAt: new Date().toISOString(),
    },
  };
  delete nextSettings.services;

  const industryInstalls = await prisma.appInstallation.findMany({
    where: {
      organisationId: org.id,
      appId: { in: [...INDUSTRY_APP_IDS] },
    },
    select: { appId: true },
  });
  const removedAppIds = industryInstalls.map((r) => r.appId);

  if (removedAppIds.length) {
    await prisma.appInstallation.deleteMany({
      where: {
        organisationId: org.id,
        appId: { in: removedAppIds },
      },
    });
  }

  const deletedProperties = await prisma.property.deleteMany({
    where: { organisationId: org.id },
  });

  await prisma.organisation.update({
    where: { id: org.id },
    data: {
      industry: "Software Company",
      settings: nextSettings as unknown as InputJsonValue,
    },
  });

  return {
    organisationId: org.id,
    slug: org.slug,
    removedAppInstalls: removedAppIds,
    clearedServicesTemplate: Boolean(settings.services),
    clearedIndustryPlanPreview: hadIndustryPreview,
    brandVoiceUpdated: looksLikeCleanerTemplate || industryVertical === "services",
    deletedProperties: deletedProperties.count,
  };
}
