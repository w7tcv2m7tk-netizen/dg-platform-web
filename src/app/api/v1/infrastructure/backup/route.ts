import { NextResponse } from "next/server";
import {
  exportOrganisationWebsiteBackup,
  getInfrastructureBackupOverview,
} from "@dg/platform-core";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const runtime = "nodejs";

/** GET /api/v1/infrastructure/backup — overview, or ?download=1 JSON export of Design Studio sites */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: { code: "no_database", message: "DATABASE_URL not configured" } },
      { status: 503 },
    );
  }

  if (download) {
    const payload = await exportOrganisationWebsiteBackup(
      session.organisationId,
      session.clerkUserId,
    );
    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="digitalgate-websites-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  }

  const data = await getInfrastructureBackupOverview(session.organisationId);
  return NextResponse.json({ data });
}
