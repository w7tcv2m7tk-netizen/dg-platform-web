import { resolvePortalProfileFromNeon } from "@dg/platform-core";

import type { PortalProfile } from "@/lib/dg-api";

function unlinkedProfile(email: string): PortalProfile {
  return {
    linked: false,
    email,
    setup: {
      account_created: true,
      payment_done: false,
      onboarding_done: false,
      platform_live: false,
    },
  };
}

/**
 * Resolve the authenticated Gen 2 profile from Platform Core / Neon only.
 *
 * Normal native runtime must never fall back to WordPress. Legacy WordPress
 * profile reads remain available through the explicit migration connector path
 * in dg-api, but are not part of app shell/session resolution.
 */
export async function resolveNativePortalProfile(
  email: string,
  clerkUserId?: string,
): Promise<PortalProfile> {
  if (!process.env.DATABASE_URL) {
    return unlinkedProfile(email);
  }

  const neon = await resolvePortalProfileFromNeon({ email, clerkUserId });
  return neon ? (neon as PortalProfile) : unlinkedProfile(email);
}
