import { NextResponse } from "next/server";
import {
  checkTenantWriteEntitlement,
  hasPlatformAuthority,
  type PlatformSession,
} from "@dg/platform-core";

import {
  shouldCheckTenantWriteEntitlement,
  writeBlockFor,
} from "@/lib/write-entitlement-policy";

export {
  WRITE_ENTITLEMENT_EXEMPT_PATHS,
  isWriteEntitlementExempt,
} from "@/lib/write-entitlement-policy";

function requestPathname(req: Request): string {
  try {
    return new URL(req.url).pathname;
  } catch {
    return "";
  }
}

/**
 * Central tenant write-entitlement gate (H-3).
 *
 * Applied inside requirePlatformAuth so every authenticated /api/v1 route
 * inherits it without per-route guards. Returns a response to block, or null to
 * allow.
 *
 * Decision order (see write-entitlement-policy):
 *  1. Non-write methods (GET/HEAD/OPTIONS) → allow (reads never affected).
 *  2. Platform operators (dg:staff or DG_COMMAND_CENTRE_ORG_IDS) → allow. They
 *     are not tenants; access is governed by platform authority (C-2). This is a
 *     read-only use of hasPlatformAuthority.
 *  3. Exempt recovery/billing/onboarding paths → allow.
 *  4. Otherwise consult the tenant subscription:
 *       - allow          → allow
 *       - read_only      → 403 (suspended/read-only subscription)
 *       - lookup_failed  → 503 (database failure → fail closed)
 */
export async function enforceWriteEntitlement(
  req: Request,
  session: PlatformSession,
): Promise<NextResponse | null> {
  const isPlatformOperator = hasPlatformAuthority({
    organisationId: session.organisationId,
    role: session.role,
    // API-key sessions are tenants, not operators: they do not receive the
    // platform-operator write-entitlement exemption.
    principalId: session.clerkUserId,
  });

  if (
    !shouldCheckTenantWriteEntitlement({
      method: req.method,
      isPlatformOperator,
      pathname: requestPathname(req),
    })
  ) {
    return null;
  }

  const result = await checkTenantWriteEntitlement(session.organisationId);
  const block = writeBlockFor(result);
  if (!block) return null;

  return NextResponse.json(
    { error: { code: block.code, message: block.message } },
    { status: block.status },
  );
}
