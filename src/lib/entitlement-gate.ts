import {
  assertEntitlement,
  hasPlatformAuthority,
  type PlatformSession,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import {
  isMutatingMethod,
  isWriteGateExemptPath,
} from "@/lib/entitlement-gate-rules";

/**
 * Central subscription write gate (H-3).
 *
 * Entitlement was previously advisory: `assertEntitlement` was called at four
 * routes and never with `"write"`, so a SUSPENDED organisation could still
 * mutate tenant data through every normal CRUD endpoint. Adding a check to
 * each route would mean ~166 edits and would drift the moment someone adds a
 * route.
 *
 * The enforcement point is the authentication helpers in `platform-api.ts`,
 * because every authenticated API route already funnels through exactly one of
 * them and passes the `Request`. The method tells us whether the call mutates;
 * the pathname tells us whether it is an exempt recovery path. New routes are
 * therefore covered by default — the safe direction for a security control.
 *
 * Reads are never gated here. `canView` and `canExport` remain available at
 * every level except NONE, so a suspended organisation keeps access to its own
 * data.
 */

/**
 * Returns a 403 when this request mutates tenant data but the organisation's
 * subscription entitlement does not permit writes. Returns null otherwise.
 */
export async function enforceWriteEntitlement(
  session: PlatformSession,
  req: Request,
): Promise<NextResponse | null> {
  if (!isMutatingMethod(req.method)) return null;

  let pathname = "";
  try {
    pathname = new URL(req.url).pathname;
  } catch {
    // Unparseable URL — fall through and evaluate the entitlement anyway.
  }

  if (pathname && isWriteGateExemptPath(pathname)) return null;

  // DigitalGate operators act on the platform, not as a paying tenant.
  if (
    hasPlatformAuthority({
      organisationId: session.organisationId,
      role: session.role,
    })
  ) {
    return null;
  }

  const gate = await assertEntitlement(session.organisationId, "write");
  if (gate.ok) return null;

  return NextResponse.json(
    {
      error: {
        code: "entitlement_blocked",
        message: gate.message,
        entitlement: gate.entitlement.level,
        commercialStatus: gate.entitlement.commercialStatus,
        // Distinguishes a real suspension from an infrastructure failure.
        reason: gate.entitlement.source,
      },
    },
    { status: 403 },
  );
}

export { isMutatingMethod, isWriteGateExemptPath };
