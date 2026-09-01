import { NextResponse } from "next/server";
import { hasPlatformAuthority, type PlatformSession } from "@dg/platform-core";

import {
  shouldCheckTenantWriteEntitlement,
  type WriteBlock,
} from "@/lib/write-entitlement-policy";
import { tenantWriteEntitlementBlock } from "@/lib/tenant-write-entitlement";

export {
  WRITE_ENTITLEMENT_EXEMPT_PATHS,
  isWriteEntitlementExempt,
} from "@/lib/write-entitlement-policy";
export {
  tenantWriteEntitlementBlock,
  type TenantWriteEntitlementActor,
} from "@/lib/tenant-write-entitlement";

function requestPathname(req: Request): string {
  try {
    return new URL(req.url).pathname;
  } catch {
    return "";
  }
}

/** Standard JSON response for a blocked tenant write (403/503). */
export function writeEntitlementResponse(block: WriteBlock): NextResponse {
  return NextResponse.json(
    { error: { code: block.code, message: block.message } },
    { status: block.status },
  );
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
 *     are not tenants; access is governed by platform authority (C-2).
 *  3. Exempt recovery/billing/onboarding paths → allow.
 *  4. Otherwise the shared tenantWriteEntitlementBlock decision:
 *       - allow          → allow
 *       - read_only      → 403 entitlement_write_blocked
 *       - lookup_failed  → 503 entitlement_unavailable (fail closed)
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

  const block = await tenantWriteEntitlementBlock(session);
  return block ? writeEntitlementResponse(block) : null;
}
