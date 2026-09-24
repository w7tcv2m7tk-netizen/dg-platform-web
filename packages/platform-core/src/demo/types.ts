export const DEMO_ORG_SLUG = "harbour-and-co-demo";
export const DEMO_ORG_NAME = "Harbour & Co (Demo)";
export const DEMO_SEED_VERSION = 1;

const LEGACY_DEMO_NAME_RE = /^DigitalGate Demo Business(?:\b|\s|$)/i;
const LEGACY_DEMO_SLUG_RE = /^digitalgate-demo(?:-|$)/i;

export function isCanonicalDemoOrganisation(input: {
  name?: string | null;
  slug?: string | null;
  status?: string | null;
  settings?: unknown;
}): boolean {
  if (input.slug === DEMO_ORG_SLUG) return true;
  if (input.status === "demo") return true;
  return Boolean(parseDemoSettings(input.settings)?.enabled);
}

export function isLegacyDemoOrganisation(input: {
  name?: string | null;
  slug?: string | null;
}): boolean {
  const name = input.name?.trim() ?? "";
  const slug = input.slug?.trim() ?? "";
  return LEGACY_DEMO_NAME_RE.test(name) || LEGACY_DEMO_SLUG_RE.test(slug);
}

export type DemoAccess = "customer" | "partner" | "staff";

export type DemoOrgSettings = {
  enabled: true;
  seedVersion: number;
  seededAt: string;
};

export function parseDemoSettings(settings: unknown): DemoOrgSettings | null {
  if (!settings || typeof settings !== "object") return null;
  const demo = (settings as { demo?: unknown }).demo;
  if (!demo || typeof demo !== "object") return null;
  const rec = demo as { enabled?: unknown };
  if (rec.enabled !== true) return null;
  return {
    enabled: true,
    seedVersion: Number((demo as { seedVersion?: unknown }).seedVersion) || 0,
    seededAt: String((demo as { seededAt?: unknown }).seededAt || ""),
  };
}

export const DEMO_RESTRICTED_MESSAGE =
  "This is a demonstration organisation. That action is disabled so sample data and live services stay safe.";

export const DEMO_BANNER_COPY =
  "DEMO ENVIRONMENT — You're exploring a demonstration organisation. No live customer data or external services are connected.";
