import {
  listLeads,
  updateBuyerLeadStage,
  updateLeadStage,
  BUYER_STAGES,
  VENDOR_STAGES,
  type BuyerStage,
  type VendorStage,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
import { syncWordPressBuyerLeads, syncWordPressVendorLeads } from "@/lib/wordpress-sync";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const leadType = searchParams.get("leadType") as "vendor" | "buyer" | null;

  const result = await listLeads({
    organisationId: session.organisationId,
    status,
    leadType: leadType ?? undefined,
  });

  return NextResponse.json({ data: result.items, meta: result.meta });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));

  if (body.action === "sync_wordpress") {
    const outcome = await syncWordPressVendorLeads(session);
    if (!outcome.ok) {
      return NextResponse.json(
        { error: { code: "sync_failed", message: outcome.message } },
        { status: 422 },
      );
    }
    return NextResponse.json({ data: outcome.result });
  }

  if (body.action === "sync_wordpress_buyers") {
    const outcome = await syncWordPressBuyerLeads(session);
    if (!outcome.ok) {
      return NextResponse.json(
        { error: { code: "sync_failed", message: outcome.message } },
        { status: 422 },
      );
    }
    return NextResponse.json({ data: outcome.result });
  }

  return NextResponse.json(
    { error: { code: "unknown_action", message: "Unsupported action" } },
    { status: 400 },
  );
}

export async function PATCH(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const leadId = body?.id as string | undefined;
  const stage = body?.stage as string | undefined;
  const leadType = body?.leadType as "vendor" | "buyer" | undefined;

  if (!leadId || !stage) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "id and stage required" } },
      { status: 422 },
    );
  }

  if (leadType === "buyer" || BUYER_STAGES.includes(stage as BuyerStage)) {
    if (!BUYER_STAGES.includes(stage as BuyerStage)) {
      return NextResponse.json(
        { error: { code: "validation_error", message: "valid buyer stage required" } },
        { status: 422 },
      );
    }

    const updated = await updateBuyerLeadStage(
      session.organisationId,
      leadId,
      stage as BuyerStage,
      session.clerkUserId,
    );

    if (!updated) {
      return NextResponse.json(
        { error: { code: "lead_not_found", message: "Buyer lead not found" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: updated });
  }

  if (!VENDOR_STAGES.includes(stage as VendorStage)) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "valid vendor stage required" } },
      { status: 422 },
    );
  }

  const updated = await updateLeadStage(
    session.organisationId,
    leadId,
    stage as VendorStage,
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
