import { assertPlatformOperator, type PlatformOperatorContext } from "@dg/platform-core";
import { cache } from "react";

import { getPlatformPageContext } from "@/lib/platform-page-context";

/**
 * Resolve the server-only platform-operator capability for Command Centre work.
 *
 * Route visibility is not sufficient proof for deliberately cross-tenant
 * services. Callers must pass this branded capability into operator service
 * wrappers before platform-wide data can be read.
 */
export const getPlatformOperatorContext = cache(
  async (): Promise<PlatformOperatorContext | null> => {
    const { session, clerkUserId, email, name } = await getPlatformPageContext();

    if (!session || !clerkUserId) return null;

    return assertPlatformOperator({
      clerkUserId,
      organisationId: session.organisationId,
      role: session.role,
      email,
      name,
    });
  },
);

export async function requirePlatformOperatorContext(): Promise<PlatformOperatorContext> {
  const operator = await getPlatformOperatorContext();
  if (!operator) {
    throw new Error("Platform operator capability required");
  }
  return operator;
}
