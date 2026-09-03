import { updateUnitHousekeeping } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function PATCH(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));
  const updates = Array.isArray(body.updates) ? body.updates : [];
  if (!updates.length) {
    return NextResponse.json(
      { error: { code: "missing_updates", message: "updates[] is required" } },
      { status: 400 },
    );
  }

  type HkPatch = {
    property_id?: number;
    id?: number;
    platform_id?: string;
    status: string;
    notes?: string;
  };
  const typed: HkPatch[] = [];
  for (const raw of updates) {
    if (!raw || typeof raw !== "object") continue;
    const u = raw as Record<string, unknown>;
    if (typeof u.status !== "string") continue;
    typed.push({
      property_id: typeof u.property_id === "number" ? u.property_id : undefined,
      id: typeof u.id === "number" ? u.id : undefined,
      platform_id: typeof u.platform_id === "string" ? u.platform_id : undefined,
      status: u.status,
      notes: typeof u.notes === "string" ? u.notes : undefined,
    });
  }

  const neon = await updateUnitHousekeeping(session.organisationId, typed);

  return NextResponse.json({
    data: {
      ok: true,
      updated: neon.updated,
      count: neon.count,
      writePath: "neon",
    },
  });
}
