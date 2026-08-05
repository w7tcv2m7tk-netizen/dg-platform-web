import {
  listLeads,
  syncVendorLeadsFromWordPress,
  updateLeadStage,
  VENDOR_STAGES,
  type VendorStage,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { fetchWpVendorLeads } from "@/lib/dg-api";
import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  const result = await listLeads({
    organisationId: session.organisationId,
    status,
  });

  return NextResponse.json({ data: result.items, meta: result.meta });
}

export async function POST(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;

  if (action === "sync_wordpress") {
    const wp = await fetchWpVendorLeads(100);
    if (!wp.ok) {
      return NextResponse.json(
        {
          error: {
            code: wp.code,
            message: wp.message,
            status: wp.status,
          },
        },
        { status: 422 },
      );
    }

    const result = await syncVendorLeadsFromWordPress({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
      leads: wp.leads,
    });

    return NextResponse.json({ data: result });
  }

  return NextResponse.json(
    { error: { code: "unknown_action", message: "Unsupported action" } },
    { status: 400 },
  );
}

export async function PATCH(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const leadId = body?.id as string | undefined;
  const stage = body?.stage as VendorStage | undefined;

  if (!leadId || !stage || !VENDOR_STAGES.includes(stage)) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "id and valid stage required" } },
      { status: 422 },
    );
  }

  const updated = await updateLeadStage(
    session.organisationId,
    leadId,
    stage,
    session.clerkUserId,
  );

  if (!updated) {
    return NextResponse.json(
      { error: { code: "lead_not_found", message: "Lead not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: updated });
}
