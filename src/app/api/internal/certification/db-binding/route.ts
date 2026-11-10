import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

/**
 * Temporary P0 certification probe. Never exposes database credentials,
 * endpoint hostnames, role names, connection strings, or SQL errors.
 * Remove immediately after staging binding certification.
 */
export async function GET(req: Request) {
  if (process.env.VERCEL_ENV !== "preview" || process.env.DG_NEON_ENV !== "preview") {
    return new NextResponse(null, { status: 404 });
  }

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, code: "not_authenticated" }, { status: 401 });

  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  if (session.clerkUserId !== userId || session.organisationId !== "cert-tenant-a") {
    return NextResponse.json({ ok: false, code: "not_authorised" }, { status: 403 });
  }

  try {
    const { prisma } = await import("@dg/database");
    const [identity] = await prisma.$queryRaw<Array<{ database_name: string; role_name: string }>>`
      SELECT current_database() AS database_name, current_user AS role_name`;
    const [gate] = await prisma.$queryRaw<Array<{ blocked: boolean; revision: number }>>`
      SELECT blocked, revision FROM public.platform_checkout_creation_gate WHERE id = 1`;

    const databaseMatches = identity?.database_name === "dg_p0_cert";
    const roleMatches = identity?.role_name === "dg_app_runtime";
    const gateBlocked = gate?.blocked === true && gate.revision === 2;
    return NextResponse.json(
      { ok: databaseMatches && roleMatches && gateBlocked,
        checks: { databaseMatches, roleMatches, gateBlocked } },
      { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, code: "certification_probe_failed" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
