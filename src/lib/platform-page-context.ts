import { currentUser } from "@clerk/nextjs/server";
import {
  getDefaultEnabledAppIds,
  resolveEnabledAppIds,
  collectIndustrySelectionIds,
  type PlatformSession,
} from "@dg/platform-core";
import { cache } from "react";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import type { PortalProfile } from "@/lib/dg-api";
import { resolveNativePortalProfile } from "@/lib/native-portal-profile";

export type PlatformPageContext = {
  user: Awaited<ReturnType<typeof currentUser>>;
  email: string;
  name: string;
  clerkUserId: string | undefined;
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

  if (!clerkUserId || !email) {
    return { user, email, name, clerkUserId, portal: null, session: null };
  }

  // Native Gen 2 runtime is Neon-only. Legacy WordPress portal reads belong to
  // explicit migration/onboarding connector flows, never implicit shell fallback.
  const portal = await resolveNativePortalProfile(email, clerkUserId);
  const session = await resolveActivePlatformSession({
    clerkUserId,
    email,
    name,
    orgName: portal?.org_name,
  });

  return { user, email, name, clerkUserId, portal, session };
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
