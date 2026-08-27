import type {
  BusinessProfilePatch,
  OrganisationBusinessProfile,
} from "./business-profile-types";
import { serializeBrandColours } from "./brand-theme";

export type OrgBrandPresetKey =
  | "digitalgate"
  | "roe-realty"
  | "cvh"
  | "aetherra"
  | "wantd";

export type OrgBrandPreset = {
  key: OrgBrandPresetKey;
  label: string;
  patch: BusinessProfilePatch;
};

export const ORG_BRAND_PRESETS: Record<OrgBrandPresetKey, OrgBrandPreset> = {
  digitalgate: {
    key: "digitalgate",
    label: "DigitalGate",
    patch: {
      brandColours: serializeBrandColours("#3B82F6", "#10B981", "#0F172A"),
      // Relative paths resolve via absoluteBrandAssetUrl; letterhead picks on-dark vs navy from header.
      iconUrl: "/brand/icon-light.png",
      logoUrl: "/brand/logo-on-dark.png",
      websiteUrl: "https://digitalgate.com.au",
    },
  },
  "roe-realty": {
    key: "roe-realty",
    label: "Roe Realty",
    patch: {
      brandColours: serializeBrandColours("#C9A46C", "#1C2B2A", "#1C2B2A"),
      // Icon = R mark; logo = full wordmark (header / letterhead).
      iconUrl: "/brand/roe-icon.png",
      logoUrl: "/brand/roe-logo.png",
      websiteUrl: "https://roerealty.com.au",
    },
  },
  cvh: {
    key: "cvh",
    label: "Currumbin Valley Hideaway",
    patch: {
      brandColours: serializeBrandColours("#B9A48A", "#2C4137", "#2C4137"),
      iconUrl: "/brand/cvh-icon.png",
      logoUrl: "/brand/cvh-logo.png",
      websiteUrl: "https://currumbinvalleyhideaway.com.au",
    },
  },
  aetherra: {
    key: "aetherra",
    label: "Aëtherra",
    patch: {
      brandColours: serializeBrandColours("#B88952", "#C9B38C", "#1A1510"),
      iconUrl: "/brand/aetherra-icon.png",
      logoUrl: "/brand/aetherra-logo.png",
      websiteUrl: "https://aetherra.com.au",
    },
  },
  wantd: {
    key: "wantd",
    label: "Wantd",
    patch: {
      brandColours: serializeBrandColours("#C6F04A", "#121212", "#F7F5F1"),
      iconUrl: "/brand/wantd-icon.png",
      websiteUrl: "https://wantd.co.nz",
    },
  },
};

type OrgLike = {
  id: string;
  name: string;
  slug: string;
  industry?: string | null;
  settings?: unknown;
};

function wpBaseUrl(settings: unknown): string {
  const wp = (settings as { connectors?: { wordpress?: { baseUrl?: string } } } | null)
    ?.connectors?.wordpress?.baseUrl;
  return typeof wp === "string" ? wp.toLowerCase() : "";
}

function normalizeBrandHaystack(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/** Match an organisation to a known brand preset. */
export function resolveOrgBrandPresetKey(org: OrgLike): OrgBrandPresetKey | null {
  const hay = normalizeBrandHaystack(`${org.name} ${org.slug} ${org.industry ?? ""}`);
  const wp = normalizeBrandHaystack(wpBaseUrl(org.settings));

  if (hay.includes("wantd") || hay.includes("want d") || wp.includes("wantdproperty")) {
    return "wantd";
  }
  if (
    hay.includes("aetherra") ||
    hay.includes("aetheriel") ||
    hay.includes("aether") ||
    wp.includes("aetherra")
  ) {
    return "aetherra";
  }
  if (
    hay.includes("currumbin") ||
    hay.includes("hideaway") ||
    hay.includes("cvh") ||
    wp.includes("currumbinvalleyhideaway")
  ) {
    return "cvh";
  }
  if (
    hay.includes("roe") ||
    hay.includes("realty") ||
    hay.includes("real_estate") ||
    wp.includes("roerealty")
  ) {
    return "roe-realty";
  }
  if (hay.includes("digitalgate") || hay.includes("digital gate")) return "digitalgate";

  if (org.industry === "marketplace") return "wantd";
  if (org.industry === "hospitality") return "cvh";
  if (org.industry === "real_estate") return "roe-realty";
  if (org.industry?.toLowerCase().includes("software")) return "digitalgate";

  return null;
}

/** Fill missing brand fields from a matched preset (onboarding / checkout). */
export function applyBrandPresetToProfile(
  org: OrgLike,
  profile: OrganisationBusinessProfile,
): OrganisationBusinessProfile {
  if (profile.brandColours && profile.logoUrl && profile.iconUrl) return profile;

  const presetKey = resolveOrgBrandPresetKey(org);
  if (!presetKey) return profile;

  const preset = ORG_BRAND_PRESETS[presetKey];
  return {
    ...profile,
    brandColours: profile.brandColours ?? preset.patch.brandColours,
    iconUrl: profile.iconUrl ?? preset.patch.iconUrl,
    logoUrl: profile.logoUrl ?? preset.patch.logoUrl,
    websiteUrl: profile.websiteUrl ?? preset.patch.websiteUrl,
  };
}

export type SeedOrgBrandProfilesResult = {
  organisationId: string;
  organisationName: string;
  preset: OrgBrandPresetKey | null;
  updated: boolean;
  skipped?: string;
};

/** Apply brand preset patches to all organisations that match a known business. */
export async function seedOrgBrandProfiles(options?: {
  force?: boolean;
  clearWpApex?: boolean;
  organisationIds?: string[];
}): Promise<SeedOrgBrandProfilesResult[]> {
  if (!process.env.DATABASE_URL) return [];

  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  const orgs = await prisma.organisation.findMany({
    where: options?.organisationIds?.length
      ? { id: { in: options.organisationIds } }
      : undefined,
    select: { id: true, name: true, slug: true, industry: true, settings: true },
  });

  const results: SeedOrgBrandProfilesResult[] = [];

  for (const org of orgs) {
    const presetKey = resolveOrgBrandPresetKey(org);
    if (!presetKey) {
      results.push({
        organisationId: org.id,
        organisationName: org.name,
        preset: null,
        updated: false,
        skipped: "No matching brand preset",
      });
      continue;
    }

    const preset = ORG_BRAND_PRESETS[presetKey];
    const settings = (org.settings as Record<string, unknown> | null) ?? {};
    const profile = (settings.profile as Record<string, unknown> | undefined) ?? {};

    const shouldSkip =
      !options?.force &&
      profile.brandColours &&
      profile.logoUrl &&
      profile.iconUrl;

    if (shouldSkip) {
      results.push({
        organisationId: org.id,
        organisationName: org.name,
        preset: presetKey,
        updated: false,
        skipped: "Brand already configured",
      });
      continue;
    }

    const nextProfile = {
      ...profile,
      ...preset.patch,
      updatedAt: new Date().toISOString(),
    };

    const nextSettings = { ...settings, profile: nextProfile } as Record<string, unknown>;

    const connectors = (nextSettings.connectors as Record<string, unknown> | undefined) ?? {};
    const wordpress = (connectors.wordpress as Record<string, unknown> | undefined) ?? {};
    if (presetKey === "digitalgate" || presetKey === "cvh" || presetKey === "roe-realty" || presetKey === "aetherra") {
      const nextWp: Record<string, unknown> = {
        ...wordpress,
        label: `${preset.label} (Gen 2)`,
      };
      if (options?.clearWpApex) {
        delete nextWp.baseUrl;
        delete nextWp.apiKey;
      }
      nextSettings.connectors = {
        ...connectors,
        wordpress: nextWp,
      };
    }

    await prisma.organisation.update({
      where: { id: org.id },
      data: { settings: nextSettings as InputJsonValue },
    });

    results.push({
      organisationId: org.id,
      organisationName: org.name,
      preset: presetKey,
      updated: true,
    });
  }

  return results;
}
