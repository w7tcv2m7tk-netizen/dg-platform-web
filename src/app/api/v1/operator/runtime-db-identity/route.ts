import { assertPlatformOperator } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireClerkSession } from "@/lib/platform-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };
const EXPECTED_ROLE = "dg_app_runtime";
const EXPECTED_DATABASE = "neondb";
const EXPECTED_ENDPOINT = /^ep-bold-tree-a7bny92m(?:-pooler)?\./;

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/**
 * Operator-only, opt-in, read-only proof of the database connection used by
 * this exact Vercel function instance. Disabled by default, including on
 * Production. Never return the connection string, hostname, or credentials.
 */
export async function GET() {
  if (process.env.DG_RUNTIME_IDENTITY_DIAGNOSTIC_ENABLED !== "true") {
    return response({ error: "not_found" }, 404);
  }

  // Require a real Clerk session: deliberately do not accept API keys or
  // connector authentication for this operational diagnostic.
  const session = await requireClerkSession();
  if (isNextResponse(session)) {
    return response({ error: "unauthorized" }, 401);
  }
  const operator = assertPlatformOperator({
    clerkUserId: session.clerkUserId,
    organisationId: session.organisationId,
    role: session.role,
    email: session.email,
  });
  if (!operator) {
    return response({ error: "forbidden" }, 403);
  }

  try {
    const { prisma } = await import("@dg/database");
    const rows = await prisma.$queryRaw<Array<{
      runtime_role: string;
      session_role: string;
      database_name: string;
      no_bypass_rls: boolean;
      no_superuser: boolean;
    }>>`
      SELECT current_user::text AS runtime_role,
             session_user::text AS session_role,
             current_database()::text AS database_name,
             NOT r.rolbypassrls AS no_bypass_rls,
             NOT r.rolsuper AS no_superuser
      FROM pg_catalog.pg_roles AS r
      WHERE r.rolname = current_user
    `;
    const identity = rows[0];
    if (!identity) return response({ error: "identity_unavailable" }, 503);

    // Compare the configured host locally; the URL is never returned.
    // A role match alone does not prove which Neon endpoint is connected.
    let endpointMatches = false;
    try {
      const host = new URL(process.env.DATABASE_URL || "").hostname;
      endpointMatches = EXPECTED_ENDPOINT.test(host);
    } catch {
      endpointMatches = false;
    }

    const checks = {
      expected_role: identity.runtime_role === EXPECTED_ROLE,
      same_session_role: identity.session_role === identity.runtime_role,
      expected_database: identity.database_name === EXPECTED_DATABASE,
      expected_neon_endpoint: endpointMatches,
      no_bypass_rls: identity.no_bypass_rls,
      no_superuser: identity.no_superuser,
    };
    const passed = Object.values(checks).every((value) => value === true);
    return response({
      status: passed ? "pass" : "hold",
      checks,
      deployment_commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    }, passed ? 200 : 503);
  } catch {
    return response({ error: "identity_unavailable" }, 503);
  }
}
