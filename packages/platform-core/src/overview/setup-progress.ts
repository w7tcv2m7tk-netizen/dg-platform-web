import type { OrganisationBusinessProfile } from "../org/business-profile-types";
import type { PlatformSetupStatus } from "../org/setup-status";
import type { OverviewConnectorProbes } from "./connector-probes";
import type { OverviewSetupProgress, OverviewSetupStep } from "./types";

export interface BuildSetupProgressInput {
  setupStatus?: PlatformSetupStatus | null;
  businessProfile?: OrganisationBusinessProfile | null;
  connectorProbes?: OverviewConnectorProbes;
  enabledAppIds?: string[];
  hasSession?: boolean;
}

function profileComplete(profile?: OrganisationBusinessProfile | null): boolean {
  if (!profile?.businessName?.trim()) return false;
  return Boolean(
    profile.websiteUrl?.trim() ||
      profile.contactEmail?.trim() ||
      profile.businessEmail?.trim(),
  );
}

function planConfigured(
  profile?: OrganisationBusinessProfile | null,
  enabledAppIds?: string[],
): boolean {
  if (profile?.platformTier?.trim()) return true;
  if (profile?.purchaseLabel?.trim()) return true;
  return (enabledAppIds?.length ?? 0) >= 3;
}

function connectorsLinked(probes?: OverviewConnectorProbes): boolean {
  return Boolean(probes?.website?.ok || probes?.wordpress?.ok);
}

/** Compute platform setup progress for Overview. */
export function buildSetupProgress(input: BuildSetupProgressInput): OverviewSetupProgress {
  const { setupStatus, businessProfile, connectorProbes, enabledAppIds, hasSession } = input;

  const steps: OverviewSetupStep[] = [
    {
      id: "org",
      label: "Organisation provisioned",
      done: hasSession !== false && (setupStatus?.orgProvisioned ?? hasSession === true),
      href: "/dashboard",
    },
    {
      id: "profile",
      label: "Business profile",
      done: profileComplete(businessProfile),
      href: "/dashboard/business",
    },
    {
      id: "plan",
      label: "Plan & apps configured",
      done: planConfigured(businessProfile, enabledAppIds),
      href: "/dashboard/apps",
    },
    {
      id: "contacts",
      label: "First contact in CRM",
      done: setupStatus?.hasContacts ?? false,
      href: "/apps/crm/contacts",
      detail:
        setupStatus && setupStatus.contactCount > 0
          ? `${setupStatus.contactCount} contact${setupStatus.contactCount === 1 ? "" : "s"}`
          : undefined,
    },
    {
      id: "connectors",
      label: "Website or WordPress connected",
      done: connectorsLinked(connectorProbes),
      href: "/dashboard/settings/connectors",
    },
    {
      id: "team",
      label: "Team member linked",
      done: setupStatus?.hasTeamMember ?? false,
      href: "/dashboard/settings/team",
    },
    {
      id: "activity",
      label: "Timeline activity recorded",
      done: setupStatus?.hasTimelineActivity ?? false,
      detail:
        setupStatus && setupStatus.activityCount > 0
          ? `${setupStatus.activityCount} events`
          : undefined,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  return {
    percent,
    completed,
    total,
    complete: completed === total,
    steps,
  };
}
