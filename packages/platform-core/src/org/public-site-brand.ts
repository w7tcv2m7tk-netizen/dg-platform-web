import type { OrganisationBusinessProfile } from "./business-profile-types";
import {
  applyBrandPresetToProfile,
  ORG_BRAND_PRESETS,
  resolveOrgBrandPresetKey,
  type OrgBrandPresetKey,
} from "./brand-presets";
import { absoluteBrandAssetUrl } from "./brand-theme";

/** Public website slug (host map) → organisation slug in Postgres. */
const PUBLIC_TO_ORG_SLUG: Record<string, string> = {
  wantd: "wantd",
  digitalgate: "digitalgate",
  "roe-realty": "roe-realty",
  "currumbin-valley-hideaway": "currumbin-valley-hideaway",
};

export type PublicSiteBrand = {
  publicSlug: string;
  organisationId: string;
  organisationName: string;
  profile: OrganisationBusinessProfile;
  iconUrl?: string;
  logoUrl?: string;
};

function presetForPublicSlug(publicSlug: string): OrgBrandPresetKey | null {
  if (publicSlug === "wantd") return "wantd";
  if (publicSlug === "digitalgate" || publicSlug.startsWith("digitalgate-")) {
    return "digitalgate";
  }
  if (publicSlug.includes("roe-realty")) return "roe-realty";
  if (publicSlug.includes("currumbin") || publicSlug.includes("hideaway")) return "cvh";
  return null;
}

function presetBrand(publicSlug: string): PublicSiteBrand | null {
  const presetKey = presetForPublicSlug(publicSlug);
  if (!presetKey) return null;
  const preset = ORG_BRAND_PRESETS[presetKey];
  return {
    publicSlug,
    organisationId: "",
    organisationName: preset.label,
    profile: preset.patch as OrganisationBusinessProfile,
    iconUrl: absoluteBrandAssetUrl(preset.patch.iconUrl),
    logoUrl: absoluteBrandAssetUrl(preset.patch.logoUrl),
  };
}

/** Resolve brand icon/logo for a public host slug (e.g. wantd.co.nz → wantd). */
export async function getPublicSiteBrand(
  publicSlug: string,
): Promise<PublicSiteBrand | null> {
  if (!process.env.DATABASE_URL) return presetBrand(publicSlug);

  try {
    const orgSlug = PUBLIC_TO_ORG_SLUG[publicSlug] ?? publicSlug;
    const { prisma } = await import("@dg/database");
    const org = await prisma.organisation.findUnique({
      where: { slug: orgSlug },
      select: { id: true, name: true, slug: true, industry: true, settings: true },
    });

    if (!org) return presetBrand(publicSlug);

    const settings = (org.settings as { profile?: OrganisationBusinessProfile } | null) ?? {};
    const profile = applyBrandPresetToProfile(org, settings.profile ?? {});
    const presetKey = resolveOrgBrandPresetKey(org) ?? presetForPublicSlug(publicSlug);
    const preset = presetKey ? ORG_BRAND_PRESETS[presetKey] : null;

    const iconUrl =
      absoluteBrandAssetUrl(profile.iconUrl) ||
      absoluteBrandAssetUrl(preset?.patch.iconUrl) ||
      undefined;
    const logoUrl =
      absoluteBrandAssetUrl(profile.logoUrl) ||
      absoluteBrandAssetUrl(preset?.patch.logoUrl) ||
      iconUrl;

    return {
      publicSlug,
      organisationId: org.id,
      organisationName: org.name,
      profile,
      iconUrl,
      logoUrl,
    };
  } catch {
    return presetBrand(publicSlug);
  }
}
