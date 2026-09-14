import type { OrganisationBusinessProfile } from "@dg/platform-core";

export type PlatformAppearancePreference = "dark" | "light" | "system";
export type VipConnectionProvider = "google_workspace" | "microsoft_365" | "apple_icloud";
export type VipConnectionCapability = "contacts" | "calendar" | "mail";
export type VipConnectionStatus = "not_started" | "planned" | "connected" | "attention_required";
export type VipContactImportFormat = "csv" | "vcard";

export type VipPlatformSetup = {
  version: 1;
  completedAt?: string;
  rerunRequestedAt?: string;
  appearance: PlatformAppearancePreference;
  timezone: string;
  locale: string;
  currency: string;
  website: {
    domain?: string;
    migrationIntent?: "migrate" | "replace" | "connect" | "none";
  };
  brand: {
    extractedColours?: string[];
    colourSource?: "logo" | "website" | "manual";
    manuallyOverridden?: boolean;
  };
  channels: {
    primaryLeadSources?: string[];
    preferredContactChannels?: string[];
  };
  data: {
    contactImport?: {
      requested?: boolean;
      format?: VipContactImportFormat;
      sourceLabel?: string;
      importedAt?: string;
      importedCount?: number;
      skippedDuplicateCount?: number;
    };
    connections?: Partial<
      Record<
        VipConnectionProvider,
        {
          status: VipConnectionStatus;
          requestedCapabilities: VipConnectionCapability[];
          connectedCapabilities?: VipConnectionCapability[];
          accountLabel?: string;
          connectedAt?: string;
        }
      >
    >;
    deferUntilLater?: boolean;
  };
  ai: {
    advicePriorities?: string[];
    reportingPriorities?: string[];
    setupBriefGeneratedAt?: string;
  };
};

export type VipSetupReadiness = {
  ready: boolean;
  score: number;
  missing: string[];
};

/**
 * The setup gate is deliberately about first-value readiness, not billing or RBAC.
 * Operational data is never reset when this profile is rerun.
 */
export function vipSetupReadiness(
  profile: OrganisationBusinessProfile | null | undefined,
  setup: VipPlatformSetup | null | undefined,
): VipSetupReadiness {
  const missing: string[] = [];
  if (!profile?.businessName?.trim() && !profile?.tradingName?.trim()) missing.push("business identity");
  if (!profile?.industryVertical?.trim()) missing.push("industry");
  if (!profile?.brandVoice?.services?.trim()) missing.push("services or products");
  if (!profile?.brandVoice?.targetAudience?.trim()) missing.push("target customers");
  if (!profile?.logoUrl?.trim() && !profile?.iconUrl?.trim()) missing.push("logo or icon");
  if (!profile?.brandColours?.trim()) missing.push("brand colours");
  if (!setup?.timezone?.trim()) missing.push("timezone");
  if (!setup?.appearance) missing.push("appearance preference");

  const total = 8;
  const score = Math.round(((total - missing.length) / total) * 100);
  return { ready: missing.length === 0, score, missing };
}

export const VIP_CONNECTION_CATALOG = [
  {
    id: "google_workspace" as const,
    label: "Google Workspace",
    description: "Bring Google contacts, calendar and Gmail into your DigitalGate workday.",
    capabilities: ["contacts", "calendar", "mail"] as VipConnectionCapability[],
  },
  {
    id: "microsoft_365" as const,
    label: "Microsoft 365",
    description: "Connect Outlook contacts, calendar and mail through your Microsoft work account.",
    capabilities: ["contacts", "calendar", "mail"] as VipConnectionCapability[],
  },
  {
    id: "apple_icloud" as const,
    label: "Apple / iCloud",
    description: "Bring business contact and calendar data from Apple using supported import or connection pathways.",
    capabilities: ["contacts", "calendar"] as VipConnectionCapability[],
  },
];

export const DEFAULT_VIP_PLATFORM_SETUP: VipPlatformSetup = {
  version: 1,
  appearance: "system",
  timezone: "Australia/Brisbane",
  locale: "en-AU",
  currency: "AUD",
  website: {},
  brand: {},
  channels: {},
  data: {},
  ai: {},
};
