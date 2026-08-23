import {
  createPmProperty,
  listPmProperties,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireIndustryAppBeta, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  {
    const betaDenied = await requireIndustryAppBeta(session, "property-management");
    if (betaDenied) return betaDenied;
  }
  const result = await listPmProperties(session.organisationId);
  return NextResponse.json({ data: result.items, meta: result.meta });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  {
    const betaDenied = await requireIndustryAppBeta(session, "property-management");
    if (betaDenied) return betaDenied;
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "name is required" } },
      { status: 422 },
    );
  }
  for (const key of ["addressLine1", "suburb"] as const) {
    if (typeof body[key] !== "string" || !(body[key] as string).trim()) {
      return NextResponse.json(
        { error: { code: "validation_error", message: `${key} is required` } },
        { status: 422 },
      );
    }
  }

  const property = await createPmProperty({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    name: body.name,
    addressLine1: body.addressLine1 as string,
    suburb: body.suburb as string,
    state: typeof body.state === "string" ? body.state : undefined,
    postcode: typeof body.postcode === "string" ? body.postcode : undefined,
    country: typeof body.country === "string" ? body.country : undefined,
    propertyType: typeof body.propertyType === "string" ? body.propertyType : undefined,
  });

  return NextResponse.json({ data: property }, { status: 201 });
}
