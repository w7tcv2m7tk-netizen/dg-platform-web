import {
  resolvePlatformSession,
  type ResolveSessionInput,
} from "@dg/platform-core";

import { readActiveOrganisationId } from "@/lib/active-org-cookie";

export type ActiveSessionInput = Omit<ResolveSessionInput, "activeOrganisationId">;

/** Resolve platform session using the active-org cookie when set. */
export async function resolveActivePlatformSession(input: ActiveSessionInput) {
  const activeOrganisationId = await readActiveOrganisationId();
  return resolvePlatformSession({ ...input, activeOrganisationId });
}
