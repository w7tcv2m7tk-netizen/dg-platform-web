import type { OrganisationBusinessProfile } from "./business-profile-types";

export const DEFAULT_ORG_PRIMARY = "#3b82f6";
export const DEFAULT_ORG_ACCENT = "#10b981";
/** Document letterhead / print header band — navy, not a bright primary or purple default */
export const DEFAULT_ORG_BACKGROUND = "#0f172a";

export type OrgBrandTheme = {
  businessName: string;
  logoUrl?: string;
  iconUrl?: string;
  primaryColor: string;
  accentColor: string;
  /** Header / letterhead band colour for white print documents */
  backgroundColor: string;
  hasCustomBrand: boolean;
};

export type OrgShellPalette = {
  bgBase: string;
  bgElevated: string;
  bgSurface: string;
  bgSurfaceHover: string;
  bgInset: string;
  border: string;
  borderSubtle: string;
  textMuted: string;
  gradient: string;
};

function hexLuminance(hex: string): number {
  const normalized = normalizeHex(hex)?.slice(1);
  if (!normalized || normalized.length < 6) return 0.5;
  const channels = [0, 2, 4].map((i) => {
    const value = parseInt(normalized.slice(i, i + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function atmosphereColor(primary: string, accent: string): string {
  const primaryLum = hexLuminance(primary);
  const accentLum = hexLuminance(accent);
  if (accentLum <= 0.22) return accent;
  if (primaryLum <= 0.22) return primary;
  return `color-mix(in srgb, ${accent} 34%, ${primary} 18%, #0a0e14)`;
}

/** Derive dark shell surfaces from brand primary + accent. */
export function resolveOrgShellPalette(
  primary: string,
  accent: string,
): OrgShellPalette {
  const ink = "#050709";
  const slateInk = "#0a0e14";
  const atmosphere = atmosphereColor(primary, accent);

  const bgBase = `color-mix(in srgb, ${atmosphere} 26%, ${ink})`;
  const bgElevated = `color-mix(in srgb, ${atmosphere} 18%, ${slateInk})`;
  const bgSurface = `color-mix(in srgb, ${primary} 10%, color-mix(in srgb, ${atmosphere} 14%, #111820))`;
  const bgSurfaceHover = `color-mix(in srgb, ${primary} 16%, #1a2230)`;
  const bgInset = `color-mix(in srgb, ${atmosphere} 22%, ${ink})`;

  return {
    bgBase,
    bgElevated,
    bgSurface,
    bgSurfaceHover,
    bgInset,
    // Keep borders lighter than surfaces so cards stay outlined on dark shells.
    border: `color-mix(in srgb, ${primary} 28%, #64748b)`,
    borderSubtle: `color-mix(in srgb, ${primary} 18%, #475569)`,
    textMuted: `color-mix(in srgb, ${primary} 28%, #94a3b8)`,
    gradient: [
      `radial-gradient(ellipse 120% 80% at 100% -20%, color-mix(in srgb, ${primary} 24%, transparent), transparent 55%)`,
      `radial-gradient(ellipse 90% 70% at 0% 100%, color-mix(in srgb, ${atmosphere} 20%, transparent), transparent 52%)`,
      bgBase,
    ].join(", "),
  };
}

export function orgBrandCssVariables(theme: OrgBrandTheme): Record<string, string> {
  const shell = resolveOrgShellPalette(theme.primaryColor, theme.accentColor);
  return {
    "--org-primary": theme.primaryColor,
    "--org-accent": theme.accentColor,
    "--dg-blue": theme.primaryColor,
    "--org-bg-base": shell.bgBase,
    "--org-bg-elevated": shell.bgElevated,
    "--org-bg-surface": shell.bgSurface,
    "--org-bg-surface-hover": shell.bgSurfaceHover,
    "--org-bg-inset": shell.bgInset,
    "--org-border": shell.border,
    "--org-border-subtle": shell.borderSubtle,
    "--org-text-muted": shell.textMuted,
    "--org-shell-gradient": shell.gradient,
  };
}

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

export function serializeBrandColours(
  primary: string,
  accent?: string,
  background?: string,
): string {
  const colours = [
    normalizeHex(primary),
    normalizeHex(accent),
    normalizeHex(background),
  ].filter(Boolean) as string[];
  return colours.join(", ");
}

/** brandColours[2] when set; otherwise navy letterhead fallback (never purple AI default). */
export function resolveDocumentBackgroundColor(
  brandColours?: string | string[] | null,
): string {
  const colours = Array.isArray(brandColours)
    ? (brandColours.map(normalizeHex).filter(Boolean) as string[])
    : parseBrandColours(brandColours ?? undefined);
  return colours[2] ?? DEFAULT_ORG_BACKGROUND;
}

/** Readable ink for text sitting on a brand background band. */
export function contrastInkForBackground(background: string): "#ffffff" | "#0f172a" {
  return hexLuminance(background) < 0.45 ? "#ffffff" : "#0f172a";
}

export function isDarkBackground(background: string): boolean {
  return hexLuminance(background) < 0.45;
}

/**
 * Normalise brand asset URLs for print/PDF and email clients.
 * Absolute https preferred; http → https; root-relative paths get app origin.
 */
export function absoluteBrandAssetUrl(
  url: string | undefined | null,
): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  if (/^https:\/\//i.test(trimmed)) return trimmed;
  if (/^http:\/\//i.test(trimmed)) return trimmed.replace(/^http:/i, "https:");
  if (/^data:/i.test(trimmed) || /^blob:/i.test(trimmed)) return trimmed;
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof process.env.VERCEL_URL === "string" && process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`
      : "") ||
    "https://app.digitalgate.com.au"
  ).replace(/\/$/, "");
  return `${base}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

export type LetterheadBrandAsset = {
  src?: string;
  /**
   * When true, wrap the mark in a small dark plate.
   * Prefer a coloured letterhead band instead; plate is a last resort on light bands.
   */
  needsContrastPlate: boolean;
};

export type ResolveLetterheadOptions = {
  /** Letterhead band colour — drives light vs dark asset remapping */
  headerBackground?: string;
};

/**
 * Resolve a brand wordmark for white print documents (invoices / quotes).
 * Picks on-dark vs on-light DigitalGate assets from header luminance; plates
 * unknown white marks only when the header band itself is light.
 */
export function resolveLetterheadBrandAsset(
  url: string | undefined | null,
  options?: ResolveLetterheadOptions,
): LetterheadBrandAsset {
  const trimmed = url?.trim();
  if (!trimmed) return { needsContrastPlate: false };

  const headerBg = normalizeHex(options?.headerBackground) ?? DEFAULT_ORG_BACKGROUND;
  const darkHeader = isDarkBackground(headerBg);

  // DigitalGate paired assets
  if (/logo-on-dark\.png(?:\?|$)/i.test(trimmed)) {
    return {
      src: absoluteBrandAssetUrl(
        darkHeader ? "/brand/logo-on-dark.png" : "/brand/logo-navy.png",
      ),
      needsContrastPlate: false,
    };
  }
  if (/logo-navy\.png(?:\?|$)/i.test(trimmed) || /logo-dark\.png(?:\?|$)/i.test(trimmed)) {
    return {
      src: absoluteBrandAssetUrl(
        darkHeader ? "/brand/logo-on-dark.png" : trimmed.includes("logo-navy")
          ? "/brand/logo-navy.png"
          : "/brand/logo-dark.png",
      ),
      needsContrastPlate: false,
    };
  }
  if (/logo-light\.png(?:\?|$)/i.test(trimmed)) {
    return {
      src: absoluteBrandAssetUrl(
        darkHeader ? "/brand/logo-on-dark.png" : "/brand/logo-navy.png",
      ),
      needsContrastPlate: false,
    };
  }

  const absolute = absoluteBrandAssetUrl(trimmed);
  if (!absolute) return { needsContrastPlate: false };

  const looksWhiteOnTransparent =
    /(?:^|[/_-])(?:logo-on-dark|icon-on-dark|white|on-dark)(?:[._-]|$)/i.test(
      absolute,
    ) || /Aetherra-White/i.test(absolute);

  const looksDarkOnTransparent =
    /(?:^|[/_-])(?:logo-navy|logo-dark|on-light|black)(?:[._-]|$)/i.test(absolute);

  if (darkHeader) {
    // White/light marks sit correctly on the brand band; dark marks need a light plate.
    return {
      src: absolute,
      needsContrastPlate: looksDarkOnTransparent && !looksWhiteOnTransparent,
    };
  }

  // Light header band (or cream paper): white marks need a dark plate or remapped asset
  return {
    src: absolute,
    needsContrastPlate: looksWhiteOnTransparent,
  };
}

export function resolveOrgBrandTheme(input: {
  profile?: OrganisationBusinessProfile | null;
  organisationName: string;
}): OrgBrandTheme {
  const colours = parseBrandColours(input.profile?.brandColours);
  const primaryColor = colours[0] ?? DEFAULT_ORG_PRIMARY;
  const accentColor = colours[1] ?? primaryColor;
  const backgroundColor = colours[2] ?? DEFAULT_ORG_BACKGROUND;
  const logoUrl =
    absoluteBrandAssetUrl(input.profile?.logoUrl) || undefined;
  const iconUrl =
    absoluteBrandAssetUrl(input.profile?.iconUrl) || logoUrl || undefined;
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
    backgroundColor,
    hasCustomBrand: Boolean(
      logoUrl || iconUrl || colours.length > 0,
    ),
  };
}
