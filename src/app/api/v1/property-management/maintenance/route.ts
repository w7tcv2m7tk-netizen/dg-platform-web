import {
  createPmMaintenance,
  isLinkedPmRecordNotFoundError,
  listPmMaintenance,
  updatePmMaintenance,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import {
  isNextResponse,
  requireIndustryAppBeta,
  requirePermission,
  requirePlatformAuth,
} from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  {
    const betaDenied = await requireIndustryAppBeta(session, "property-management");
    if (betaDenied) return betaDenied;
  }
  const result = await listPmMaintenance(session.organisationId);
  return NextResponse.json({ data: result.items, meta: result.meta });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  {
    const betaDenied = await requireIndustryAppBeta(session, "property-management");
    if (betaDenied) return betaDenied;
  }
  const permissionDenied = requirePermission(session, {
    module: "industry",
    action: "edit",
    scope: "organisation",
    subModule: "property-management",
  });
  if (permissionDenied) return permissionDenied;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "title is required" } },
      { status: 422 },
    );
  }

  try {
    const request = await createPmMaintenance({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
      title: body.title,
      propertyId: typeof body.propertyId === "string" ? body.propertyId : undefined,
      contactId: typeof body.contactId === "string" ? body.contactId : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
      priority: typeof body.priority === "string" ? body.priority : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    });

    return NextResponse.json({ data: request }, { status: 201 });
  } catch (error) {
    if (isLinkedPmRecordNotFoundError(error)) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: 422 },
      );
    }
    throw error;
  }
}

export async function PATCH(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  {
    const betaDenied = await requireIndustryAppBeta(session, "property-management");
    if (betaDenied) return betaDenied;
  }
  const permissionDenied = requirePermission(session, {
    module: "industry",
    action: "edit",
    scope: "organisation",
    subModule: "property-management",
  });
  if (permissionDenied) return permissionDenied;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.id !== "string") {
    return NextResponse.json(
      { error: { code: "validation_error", message: "id is required" } },
      { status: 422 },
    );
  }

  try {
    const updated = await updatePmMaintenance({
      organisationId: session.organisationId,
      requestId: body.id,
      actorId: session.clerkUserId,
      title: typeof body.title === "string" ? body.title : undefined,
      propertyId:
        typeof body.propertyId === "string"
          ? body.propertyId
          : body.propertyId === null
            ? null
            : undefined,
      contactId:
        typeof body.contactId === "string"
          ? body.contactId
          : body.contactId === null
            ? null
            : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
      priority: typeof body.priority === "string" ? body.priority : undefined,
      notes: typeof body.notes === "string" ? body.notes : body.notes === null ? null : undefined,
    });

    if (!updated) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Maintenance request not found" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (isLinkedPmRecordNotFoundError(error)) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: 422 },
      );
    }
    throw error;
  }
}
