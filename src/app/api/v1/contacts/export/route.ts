import { exportContactsCsv } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePermission, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied =
    requireFeature(session, "crm.contacts.export") ??
    requirePermission(session, {
      module: "crm",
      action: "export",
      scope: "organisation",
    });
  if (denied) return denied;

  const csv = await exportContactsCsv(session.organisationId);
  const filename = `contacts-${session.organisationSlug}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
