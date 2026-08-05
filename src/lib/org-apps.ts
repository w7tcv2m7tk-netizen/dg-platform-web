import { currentUser } from "@clerk/nextjs/server";
import {
  getDefaultEnabledAppIds,
  resolveEnabledAppIds,
  resolvePlatformSession,
} from "@dg/platform-core";

import { fetchPortalMe } from "@/lib/dg-api";

export async function getOrgEnabledAppIds(): Promise<string[]> {
  const user = await currentUser();
  if (!user?.id) {
    return getDefaultEnabledAppIds();
  }

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user.fullName ??
    [user.firstName, user.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email ? await fetchPortalMe(email, user.id) : null;
  const session = await resolvePlatformSession({
    clerkUserId: user.id,
    email,
    name,
    orgName: portal?.org_name,
  });

  if (!session || !process.env.DATABASE_URL) {
    return getDefaultEnabledAppIds();
  }

  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: session.organisationId },
    select: { settings: true },
  });

  const settings = org?.settings as { apps?: { enabled?: string[] } } | null;
  return resolveEnabledAppIds(settings ?? undefined);
}
