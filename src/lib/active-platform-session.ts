import {
  resolvePlatformSession,
  REFERRAL_COOKIE,
  type ResolveSessionInput,
} from "@dg/platform-core";
import { cookies } from "next/headers";

import { readActiveOrganisationId } from "@/lib/active-org-cookie";

export type ActiveSessionInput = Omit<
  ResolveSessionInput,
  "activeOrganisationId" | "referralCode"
>;

/** Resolve platform session using the active-org cookie when set. */
export async function resolveActivePlatformSession(input: ActiveSessionInput) {
  const activeOrganisationId = await readActiveOrganisationId();
  let referralCode: string | null = null;
  try {
    const jar = await cookies();
    referralCode = jar.get(REFERRAL_COOKIE)?.value ?? null;
  } catch {
    referralCode = null;
  }
  return resolvePlatformSession({
    ...input,
    activeOrganisationId,
    referralCode,
  });
}