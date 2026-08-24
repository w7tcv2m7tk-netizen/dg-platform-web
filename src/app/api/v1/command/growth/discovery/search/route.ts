import {
  listDiscoveryProviderStatuses,
  searchBusinessDiscovery,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse } from "@/lib/platform-api";
import { requireProspectingEngine } from "@/lib/prospecting-api";

export async function GET(req: Request) {
  const session = await requireProspectingEngine(req, "command.growth.read");
  if (isNextResponse(session)) return session;

  return NextResponse.json({ data: { providers: listDiscoveryProviderStatuses() } });
}

/** Search business-data providers — returns ephemeral candidates (not CRM). */
export async function POST(req: Request) {
  const session = await requireProspectingEngine(req, "command.growth.manage");
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: { code: "validation_error", message: "JSON body required" } },
      { status: 422 },
    );
  }

  const industry = typeof body.industry === "string" ? body.industry : undefined;
  const location = typeof body.location === "string" ? body.location : undefined;
  const businessType =
    typeof body.businessType === "string" ? body.businessType : undefined;
  const q = typeof body.q === "string" ? body.q : undefined;
  const radiusRaw = body.radiusKm;
  const radiusKm =
    radiusRaw === 5 || radiusRaw === 10 || radiusRaw === 25 || radiusRaw === 50
      ? radiusRaw
      : undefined;
  const limit =
    typeof body.limit === "number" && Number.isFinite(body.limit)
      ? Math.floor(body.limit)
      : undefined;

  if (!industry?.trim() && !location?.trim() && !businessType?.trim() && !q?.trim()) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "Provide industry, location, businessType, or q",
        },
      },
      { status: 422 },
    );
  }

  const result = await searchBusinessDiscovery({
    industry,
    location,
    businessType,
    q,
    radiusKm,
    limit,
  });

  return NextResponse.json({ data: result });
}
