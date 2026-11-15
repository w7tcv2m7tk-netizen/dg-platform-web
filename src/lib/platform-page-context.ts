import { currentUser } from "@clerk/nextjs/server";
import {
  getDefaultEnabledAppIds,
  resolveEnabledAppIds,
  type PlatformSession,
} from "@dg/platform-core";
import { cache } from "react";
import { organisationIndustrySelectionIds } from "@/lib/industry-app-selection";

import { readActiveOrganisationId } from "@/lib/active-org-cookie";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import type { PortalProfile } from "@/lib/dg-api";
import { resolveNativePortalProfile } from "@/lib/native-portal-profile";

export type PlatformPageContext = {
  user: Awaited<ReturnType<typeof currentUser>>;
  email: string;
  name: string;
  clerkUserId: string | undefined;
  activeOrganisationId: string | null;
  portal: PortalProfile | null;
  session: PlatformSession | null;
};

/** Dedupe Clerk + native Neon profile + session resolution within a single request. */
export const getPlatformPageContext = cache(async (): Promise<PlatformPageContext> => {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const clerkUserId = user?.id;
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;
  const activeOrganisationId = await readActiveOrganisationId().catch(() => undefined) ?? null;

  if (!clerkUserId || !email) {
    return { user, email, name, clerkUserId, activeOrganisationId, portal: null, session: null };
  }

  // Resolve the authoritative tenant session before anywhere that could use a
  // cached email or a different membership. A stale tenant cookie yields no
  // portal profile until an explicit valid switch repairs the cookie.
  const session = await resolveActivePlatformSession({
    clerkUserId,
    email,
    name,
  });
  if (!session) {
    return { user, email, name, clerkUserId, activeOrganisationId, portal: null, session: null };
  }

  // Native Gen 2 runtime is Neon-only. Bind the profile to the exact active
  // membership; never infer identity from cached email.
  const portal = await resolveNativePortalProfile(email, clerkUserId, session.organisationId);
  return { user, email, name, clerkUserId, activeOrganisationId, portal, session };
});

/** Org enabled apps — uses cached native session. */
export const getOrgEnabledAppIdsCached = cache(async (): Promise<string[]> => {
  const { session } = await getPlatformPageContext();

  if (!session || !process.env.DATABASE_URL) {
    return getDefaultEnabledAppIds();
  }

  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: session.organisationId },
    select: { settings: true },
  });

  const settings = org?.settings as OrgNavSettings | null;
  // Persist Apps toggles as-is. Closed-beta flags still gate deep routes / mutations;
  // do not strip Industry apps from the enabled list on read (they must toggle independently).
  return resolveEnabledAppIds(settings ?? undefined);
});

export type OrgNavSettings = {
  apps?: {
    enabled?: string[];
    planPreview?: {
      industryApps?: string[];
      industryTemplates?: string[];
    };
  };
  profile?: { purchasedApps?: string[] };
  services?: { templateKey?: string };
  industry?: { templates?: Record<string, { active?: boolean }> };
  gen2Onboarding?: {
    operatingProfile?: {
      primaryIndustry?: string;
      secondaryIndustries?: string[];
      primaryTemplate?: string;
      templates?: string[];
    };
  };
  featureFlags?: Record<string, boolean>;
};

function readOrgNavSettings(
  settings: OrgNavSettings | null | undefined,
): OrgNavSettings | null {
  return settings ?? null;
}

/** Active Industry business types — exact customer profiles used for personalisation. */
export const getOrgIndustrySelectionIdsCached = cache(async (): Promise<string[]> => {
  const { session } = await getPlatformPageContext();

  if (!session || !process.env.DATABASE_URL) {
    return [];
  }

  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: session.organisationId },
    select: { settings: true },
  });

  const settings = readOrgNavSettings(org?.settings as OrgNavSettings);
  return organisationIndustrySelectionIds(settings);
});
