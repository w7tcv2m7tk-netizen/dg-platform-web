import { decryptSecret, encryptSecret, isEncryptedSecret } from "../../crypto/secret-field";
import {
  GEN2_APEX_WP_RETIRED_MESSAGE,
  isGen2MarketingApexBaseUrl,
} from "./gen2-apex";

export type OrgWordPressConnectorSettings = {
  baseUrl?: string;
  /** Per-org Dev API key override (falls back to deployment env vars). */
  apiKey?: string;
  label?: string;
  lastVendorLeadSyncAt?: string;
  lastVendorLeadSync?: Record<string, unknown>;
  lastBuyerLeadSyncAt?: string;
  lastBuyerLeadSync?: Record<string, unknown>;
  lastBookingSyncAt?: string;
  lastBookingSync?: Record<string, unknown>;
  lastAccBookingSyncAt?: string;
  lastAccBookingSync?: Record<string, unknown>;
  lastPropertySyncAt?: string;
  lastPropertySync?: Record<string, unknown>;
};

export type ResolvedWordPressConnector = {
  /** Empty when the resolved host is a Gen 2 marketing apex (live WP APIs retired). */
  baseUrl: string;
  apiKey: string | undefined;
  label: string;
  source: "org" | "env" | "preset";
  /** True when public Gen 2 apex would have been used — do not call /wp-json. */
  apexRetired?: boolean;
  retiredApexBaseUrl?: string;
};

/**
 * Brand presets — apex URLs are kept for migration UI hints only.
 * `resolveWordPressConnector` nullifies them for live API calls.
 */
export const WP_CONNECTOR_PRESETS: Record<
  string,
  { baseUrl: string; label: string }
> = {
  digitalgate: {
    baseUrl: "https://digitalgate.com.au/wp-json/digitalgate/v1",
    label: "DigitalGate",
  },
  "real-estate": {
    baseUrl: "https://roerealty.com.au/wp-json/digitalgate/v1",
    label: "Roe Realty",
  },
  accommodation: {
    baseUrl: "https://currumbinvalleyhideaway.com.au/wp-json/digitalgate/v1",
    label: "Currumbin Valley Hideaway",
  },
  creator: {
    baseUrl: "https://aetherra.com.au/wp-json/digitalgate/v1",
    label: "Aëtherra",
  },
};

const BRAND_PRESET_TO_WP: Record<string, keyof typeof WP_CONNECTOR_PRESETS> = {
  digitalgate: "digitalgate",
  "roe-realty": "real-estate",
  cvh: "accommodation",
  aetherra: "creator",
};

function envWpBaseUrl(): string {
  return process.env.DG_WP_CONNECTOR_BASE_URL?.replace(/\/$/, "") || "";
}

function envWpApiKey(): string | undefined {
  return (
    process.env.DG_WP_CONNECTOR_API_KEY?.trim() ||
    process.env.DG_API_KEY?.trim() ||
    undefined
  );
}

/** Only reuse the deployment env key when it targets the same WordPress host. */
function envWpApiKeyForBaseUrl(baseUrl: string): string | undefined {
  const key = envWpApiKey();
  if (!key) return undefined;
  try {
    const targetHost = new URL(baseUrl).hostname;
    const envHost = new URL(envWpBaseUrl()).hostname;
    if (targetHost && envHost && targetHost === envHost) return key;
  } catch {
    /* ignore */
  }
  return undefined;
}

type OrgSettings = {
  connectors?: { wordpress?: OrgWordPressConnectorSettings };
};

function encryptApiKeyIfNeeded(apiKey: string | undefined): string | undefined {
  if (!apiKey?.trim()) return apiKey;
  if (isEncryptedSecret(apiKey)) return apiKey;
  return encryptSecret(apiKey.trim());
}

function decryptApiKeyIfNeeded(apiKey: string | undefined): string | undefined {
  if (!apiKey?.trim()) return apiKey;
  return decryptSecret(apiKey.trim());
}

/** True when this org saved a WordPress host or API key (not env/preset defaults). */
export async function organisationHasWordPressConnector(
  organisationId: string,
): Promise<boolean> {
  const settings = await getOrgWordPressConnectorSettings(organisationId);
  if (!settings) return false;
  return Boolean(settings.baseUrl?.trim() || settings.apiKey?.trim());
}

export async function getOrgWordPressConnectorSettings(
  organisationId: string,
): Promise<OrgWordPressConnectorSettings | null> {
  if (!process.env.DATABASE_URL) return null;

  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });
  const settings = (org?.settings as OrgSettings | null) ?? {};
  return settings.connectors?.wordpress ?? null;
}

export async function updateOrgWordPressConnectorSettings(
  organisationId: string,
  patch: Partial<
    Pick<OrgWordPressConnectorSettings, "baseUrl" | "apiKey" | "label">
  >,
): Promise<OrgWordPressConnectorSettings> {
  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });

  const settings = (org?.settings as OrgSettings | null) ?? {};
  const prev = settings.connectors?.wordpress ?? {};
  const next: OrgWordPressConnectorSettings = {
    ...prev,
    ...patch,
  };

  if (patch.apiKey === "") {
    delete next.apiKey;
  } else if (patch.apiKey !== undefined) {
    next.apiKey = encryptApiKeyIfNeeded(patch.apiKey);
  }

  await prisma.organisation.update({
    where: { id: organisationId },
    data: {
      settings: {
        ...settings,
        connectors: {
          ...settings.connectors,
          wordpress: next,
        },
      } as unknown as InputJsonValue,
    },
  });

  return next;
}

/** Merge org connector with deployment env defaults. Gen 2 apex hosts → no live baseUrl. */
export function resolveWordPressConnector(
  orgSettings?: OrgWordPressConnectorSettings | null,
  options?: { source?: "org" | "env" | "preset" },
): ResolvedWordPressConnector {
  const rawBase = (orgSettings?.baseUrl?.trim() || envWpBaseUrl()).replace(/\/$/, "");
  const label =
    orgSettings?.label?.trim() ||
    (() => {
      try {
        return orgSettings?.baseUrl
          ? new URL(rawBase.replace(/\/wp-json.*/, "")).hostname
          : "WordPress";
      } catch {
        return "WordPress";
      }
    })();

  const source =
    options?.source ??
    (orgSettings?.baseUrl || orgSettings?.apiKey ? "org" : "env");

  if (!rawBase) {
    return {
      baseUrl: "",
      apiKey: undefined,
      label: "WordPress (not configured)",
      source,
    };
  }

  if (isGen2MarketingApexBaseUrl(rawBase)) {
    return {
      baseUrl: "",
      apiKey: undefined,
      label: `${label} (Gen 2)`,
      source,
      apexRetired: true,
      retiredApexBaseUrl: rawBase,
    };
  }

  const apiKey =
    decryptApiKeyIfNeeded(orgSettings?.apiKey?.trim()) ||
    envWpApiKeyForBaseUrl(rawBase);

  return {
    baseUrl: rawBase,
    apiKey,
    label,
    source,
  };
}

export async function resolveOrgWordPressConnector(
  organisationId: string,
): Promise<ResolvedWordPressConnector> {
  if (!process.env.DATABASE_URL) {
    return resolveWordPressConnector(null);
  }

  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { id: true, name: true, slug: true, industry: true, settings: true },
  });

  const settings = (org?.settings as OrgSettings | null) ?? {};
  const wordpress = settings.connectors?.wordpress ?? null;

  const { resolveOrgBrandPresetKey } = await import("../../org/brand-presets");
  const brandKey = org ? resolveOrgBrandPresetKey(org) : null;
  const wpKey = brandKey ? BRAND_PRESET_TO_WP[brandKey] : undefined;

  // Org has an explicit URL — but correct DigitalGate if it was stuck on the old Roe env fallback.
  if (wordpress?.baseUrl?.trim()) {
    const looksLikeRoe = wordpress.baseUrl.includes("roerealty.com.au");
    if (brandKey === "digitalgate" && looksLikeRoe && wpKey) {
      return resolveWordPressConnector(
        { ...wordpress, ...WP_CONNECTOR_PRESETS[wpKey] },
        { source: "preset" },
      );
    }
    return resolveWordPressConnector(wordpress, { source: "org" });
  }

  if (wpKey && WP_CONNECTOR_PRESETS[wpKey]) {
    const preset = WP_CONNECTOR_PRESETS[wpKey];
    if (isGen2MarketingApexBaseUrl(preset.baseUrl)) {
      return resolveWordPressConnector(
        { ...wordpress, label: preset.label },
        { source: "preset" },
      );
    }
    return resolveWordPressConnector(
      {
        ...wordpress,
        ...preset,
      },
      { source: "preset" },
    );
  }

  return resolveWordPressConnector(wordpress);
}

export function seedWordPressConnectorForTemplate(
  template: "real-estate" | "accommodation" | "creator" | "default" | "services",
): OrgWordPressConnectorSettings | undefined {
  // Do not seed Gen 2 cutover brands with retired apex /wp-json URLs.
  if (
    template === "real-estate" ||
    template === "accommodation" ||
    template === "creator"
  ) {
    const key =
      template === "real-estate"
        ? "real-estate"
        : template === "accommodation"
          ? "accommodation"
          : "creator";
    return {
      label: WP_CONNECTOR_PRESETS[key].label,
      baseUrl: "",
    };
  }
  return undefined;
}

export { GEN2_APEX_WP_RETIRED_MESSAGE, isGen2MarketingApexBaseUrl };
