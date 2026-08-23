import { currentUser } from "@clerk/nextjs/server";
import {
  getDefaultEnabledAppIds,
  resolveEnabledAppIds,
  collectIndustrySelectionIds,
  type PlatformSession,
} from "@dg/platform-core";
import { cache } from "react";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe, type PortalProfile } from "@/lib/dg-api";

export type PlatformPageContext = {
  user: Awaited<ReturnType<typeof currentUser>>;
  email: string;
  name: string;
  clerkUserId: string | undefined;
  portal: PortalProfile | null;
  session: PlatformSession | null;
};

/** Dedupe Clerk + portal + session resolution within a single request. */
export const getPlatformPageContext = cache(async (): Promise<PlatformPageContext> => {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const clerkUserId = user?.id;
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  if (!clerkUserId || !email) {
    return { user, email, name, clerkUserId, portal: null, session: null };
  }

  const portal = await fetchPortalMe(email, clerkUserId);
  const session = await resolveActivePlatformSession({
    clerkUserId,
    email,
    name,
    orgName: portal?.org_name,
  });

  return { user, email, name, clerkUserId, portal, session };
});

/** Org enabled apps — uses cached session (avoids triple fetchPortalMe per page). */
export const getOrgEnabledAppIdsCached = cache(async (): Promise<string[]> => {
  const { session } = await getPlatformPageContext();

  if (!session || !process.env.DATABASE_URL) {
    return getDefaultEnabledAppIds();
  }

  const { prisma } = await import("@dg/database");
  const { filterAppsForAccBeta, filterAppsForReBeta, filterAppsForIndustryBetas } =
    await import("@dg/platform-core");
  const org = await prisma.organisation.findUnique({
    where: { id: session.organisationId },
    select: { settings: true },
  });

  const settings = org?.settings as OrgNavSettings | null;
  const enabled = resolveEnabledAppIds(settings ?? undefined);
  return filterAppsForIndustryBetas(
    filterAppsForAccBeta(
      filterAppsForReBeta(enabled, settings?.featureFlags),
      settings?.featureFlags,
    ),
    settings?.featureFlags,
  );
});

export type OrgNavSettings = {
  apps?: {
    enabled?: string[];
    planPreview?: { industryApps?: string[] };
  };
  profile?: { purchasedApps?: string[] };
  services?: { templateKey?: string };
  featureFlags?: Record<string, boolean>;
};

function readOrgNavSettings(
  settings: OrgNavSettings | null | undefined,
): OrgNavSettings | null {
  return settings ?? null;
}

/** Purchased Industry templates — separate sidebar app per add-on (Electrician, Cleaning, PM, …). */
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

  return collectIndustrySelectionIds(readOrgNavSettings(org?.settings as OrgNavSettings));
});
