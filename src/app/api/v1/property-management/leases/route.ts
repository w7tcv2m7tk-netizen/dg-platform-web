import { createPmLease, listPmLeases } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const result = await listPmLeases(session.organisationId);
  return NextResponse.json({ data: result.items, meta: result.meta });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "title is required" } },
      { status: 422 },
    );
  }

  const rentRaw = body.rentCents;
  const rentCents =
    typeof rentRaw === "number"
      ? rentRaw
      : typeof rentRaw === "string" && rentRaw.trim()
        ? Number.parseInt(rentRaw, 10)
        : undefined;

  const lease = await createPmLease({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    title: body.title,
    addressLine1: typeof body.addressLine1 === "string" ? body.addressLine1 : undefined,
    suburb: typeof body.suburb === "string" ? body.suburb : undefined,
    stage: typeof body.stage === "string" ? body.stage : undefined,
    ownerContactId:
      typeof body.ownerContactId === "string" ? body.ownerContactId : undefined,
    tenantContactId:
      typeof body.tenantContactId === "string" ? body.tenantContactId : undefined,
    rentCents: rentCents !== undefined && !Number.isNaN(rentCents) ? rentCents : undefined,
    startDate: typeof body.startDate === "string" ? body.startDate : undefined,
    endDate: typeof body.endDate === "string" ? body.endDate : undefined,
    notes: typeof body.notes === "string" ? body.notes : undefined,
  });

  return NextResponse.json({ data: lease }, { status: 201 });
}
