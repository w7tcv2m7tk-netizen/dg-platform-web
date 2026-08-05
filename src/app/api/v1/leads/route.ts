import {
  listLeads,
  updateLeadStage,
  VENDOR_STAGES,
  type VendorStage,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";
import { syncWordPressVendorLeads } from "@/lib/wordpress-sync";

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
  if (body.action !== "sync_wordpress") {
    return NextResponse.json(
      { error: { code: "unknown_action", message: "Unsupported action" } },
      { status: 400 },
    );
  }

  const outcome = await syncWordPressVendorLeads(session);
  if (!outcome.ok) {
    return NextResponse.json(
      { error: { code: "sync_failed", message: outcome.message } },
      { status: 422 },
    );
  }

  return NextResponse.json({ data: outcome.result });
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
