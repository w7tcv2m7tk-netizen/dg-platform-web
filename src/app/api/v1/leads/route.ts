import {
  createLead,
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

  const leadType = (body.leadType as "vendor" | "buyer" | undefined) ?? "vendor";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const title =
    (typeof body.title === "string" && body.title.trim()) ||
    name ||
    (typeof body.propertyAddress === "string" && body.propertyAddress.trim()) ||
    "";

  if (!title) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "title, name, or propertyAddress is required",
        },
      },
      { status: 422 },
    );
  }

  const stage =
    leadType === "buyer"
      ? ((body.stage as BuyerStage | undefined) ?? "inquiry")
      : ((body.stage as VendorStage | undefined) ?? "vendor_lead");

  if (leadType === "buyer" && !BUYER_STAGES.includes(stage as BuyerStage)) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "valid buyer stage required" } },
      { status: 422 },
    );
  }
  if (leadType === "vendor" && !VENDOR_STAGES.includes(stage as VendorStage)) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "valid vendor stage required" } },
      { status: 422 },
    );
  }

  const propertyAddress =
    typeof body.propertyAddress === "string" ? body.propertyAddress.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  const lead = await createLead({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    source: leadType === "buyer" ? "buyer_enquiry" : body.source || "manual",
    title,
    description: notes || undefined,
    status: "new",
    metadata: {
      lead_type: leadType,
      stage,
      ...(name ? { contact_name: name } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      ...(propertyAddress ? { property_address: propertyAddress } : {}),
    },
  });

  return NextResponse.json({ data: lead }, { status: 201 });
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
