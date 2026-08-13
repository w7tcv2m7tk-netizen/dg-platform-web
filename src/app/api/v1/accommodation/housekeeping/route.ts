import {
  organisationUsesHousekeepingSot,
  updateUnitHousekeeping,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { accommodationConnectorForSession } from "@/lib/accommodation-connector";
import { patchWpAccommodationHousekeeping } from "@/lib/dg-api";
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

  const connector = await accommodationConnectorForSession(session.organisationId);
  const hkSot = await organisationUsesHousekeepingSot(session.organisationId);

  if (hkSot) {
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
    const mirror = await patchWpAccommodationHousekeeping(
      typed.map((u: HkPatch) => ({
        property_id: u.property_id ?? u.id ?? 0,
        status: u.status,
        notes: u.notes,
      })),
      connector,
    ).catch(() => null);

    return NextResponse.json({
      data: {
        ok: true,
        updated: neon.updated,
        count: neon.count,
        writePath: "neon_then_wp",
        wpMirror: mirror?.ok ?? false,
      },
    });
  }

  const result = await patchWpAccommodationHousekeeping(updates, connector);
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status: 422 },
    );
  }

  return NextResponse.json({ data: { ...result.data, writePath: "wordpress" } });
}
