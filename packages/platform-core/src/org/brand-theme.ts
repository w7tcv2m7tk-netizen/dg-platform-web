import type { OrganisationBusinessProfile } from "./business-profile-types";

export const DEFAULT_ORG_PRIMARY = "#3b82f6";
export const DEFAULT_ORG_ACCENT = "#10b981";

export type OrgBrandTheme = {
  businessName: string;
  logoUrl?: string;
  iconUrl?: string;
  primaryColor: string;
  accentColor: string;
  hasCustomBrand: boolean;
};

export function parseBrandColours(raw?: string): string[] {
  if (!raw?.trim()) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map(String).map(normalizeHex).filter(Boolean) as string[];
      }
    } catch {
      /* fall through */
    }
  }
  return trimmed
    .split(/[,;]+/)
    .map((c) => c.trim())
    .map(normalizeHex)
    .filter(Boolean) as string[];
}

export function normalizeHex(color?: string): string | undefined {
  if (!color?.trim()) return undefined;
  const c = color.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(c)) return c.length === 4 ? expandShortHex(c) : c;
  if (/^[0-9a-fA-F]{3,8}$/.test(c)) {
    const withHash = `#${c}`;
    return c.length === 3 ? expandShortHex(withHash) : withHash;
  }
  return undefined;
}

function expandShortHex(hex: string): string {
  if (hex.length !== 4) return hex;
  return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
}

export function serializeBrandColours(primary: string, accent?: string): string {
  const colours = [normalizeHex(primary), normalizeHex(accent)].filter(Boolean) as string[];
  return colours.join(", ");
}

export function resolveOrgBrandTheme(input: {
  profile?: OrganisationBusinessProfile | null;
  organisationName: string;
}): OrgBrandTheme {
  const colours = parseBrandColours(input.profile?.brandColours);
  const primaryColor = colours[0] ?? DEFAULT_ORG_PRIMARY;
  const accentColor = colours[1] ?? primaryColor;
  const logoUrl = input.profile?.logoUrl?.trim() || undefined;
  const iconUrl =
    input.profile?.iconUrl?.trim() || logoUrl || undefined;
  const businessName =
    input.profile?.tradingName?.trim() ||
    input.profile?.businessName?.trim() ||
    input.organisationName;

  return {
    businessName,
    logoUrl,
    iconUrl,
    primaryColor,
    accentColor,
    hasCustomBrand: Boolean(
      logoUrl || iconUrl || colours.length > 0,
    ),
  };
}
