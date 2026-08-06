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
};

export type ResolvedWordPressConnector = {
  baseUrl: string;
  apiKey: string | undefined;
  label: string;
  source: "org" | "env";
};

export const WP_CONNECTOR_PRESETS: Record<
  string,
  { baseUrl: string; label: string }
> = {
  "real-estate": {
    baseUrl: "https://roerealty.com.au/wp-json/digitalgate/v1",
    label: "Roe Realty",
  },
  accommodation: {
    baseUrl: "https://currumbinvalleyhideaway.com.au/wp-json/digitalgate/v1",
    label: "Currumbin Valley Hideaway",
  },
};

function envWpBaseUrl(): string {
  return (
    process.env.DG_WP_CONNECTOR_BASE_URL?.replace(/\/$/, "") ??
    WP_CONNECTOR_PRESETS["real-estate"].baseUrl
  );
}

function envWpApiKey(): string | undefined {
  return (
    process.env.DG_WP_CONNECTOR_API_KEY?.trim() ||
    process.env.DG_API_KEY?.trim() ||
    undefined
  );
}

type OrgSettings = {
  connectors?: { wordpress?: OrgWordPressConnectorSettings };
};

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

/** Merge org connector with deployment env defaults. */
export function resolveWordPressConnector(
  orgSettings?: OrgWordPressConnectorSettings | null,
): ResolvedWordPressConnector {
  const baseUrl = orgSettings?.baseUrl?.trim() || envWpBaseUrl();
  const apiKey = orgSettings?.apiKey?.trim() || envWpApiKey();
  const label =
    orgSettings?.label?.trim() ||
    (() => {
      try {
        return orgSettings?.baseUrl
          ? new URL(baseUrl.replace(/\/wp-json.*/, "")).hostname
          : "WordPress";
      } catch {
        return "WordPress";
      }
    })();

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey,
    label,
    source: orgSettings?.baseUrl || orgSettings?.apiKey ? "org" : "env",
  };
}

export async function resolveOrgWordPressConnector(
  organisationId: string,
): Promise<ResolvedWordPressConnector> {
  const settings = await getOrgWordPressConnectorSettings(organisationId);
  return resolveWordPressConnector(settings);
}

export function seedWordPressConnectorForTemplate(
  template: "real-estate" | "accommodation" | "creator" | "default",
): OrgWordPressConnectorSettings | undefined {
  if (template === "real-estate") {
    return { ...WP_CONNECTOR_PRESETS["real-estate"] };
  }
  if (template === "accommodation") {
    return { ...WP_CONNECTOR_PRESETS.accommodation };
  }
  return undefined;
}
