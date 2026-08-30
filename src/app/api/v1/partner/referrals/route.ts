import { NextResponse } from "next/server";
import {
  getPartnerByClerkUserId,
  createPartnerReferral,
} from "@dg/platform-core";
import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

export async function POST(req: Request) {
  const session = await requirePlatformSession(req);
  if (isNextResponse(session)) return session;

  const partner = await getPartnerByClerkUserId(session.clerkUserId);
  if (!partner) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "You are not a registered partner." } },
      { status: 403 },
    );
  }

  if (partner.status !== "active" && partner.status !== "pending") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Your partner account is not active." } },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    partnerId?: string;
    referralCode?: string;
    businessName?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    website?: string;
    industry?: string;
    notes?: string;
  } | null;

  if (!body?.businessName?.trim()) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Business name is required." } },
      { status: 400 },
    );
  }

  try {
    const referral = await createPartnerReferral({
      partnerId: partner.id,
      referralCode: partner.referralCode,
      businessName: body.businessName.trim(),
      contactName: body.contactName?.trim() || undefined,
      email: body.email?.trim() || undefined,
      phone: body.phone?.trim() || undefined,
      website: body.website?.trim() || undefined,
      industry: body.industry?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
      source: "warm_introduction",
    });
    return NextResponse.json({ data: referral }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not record this referral.";
    return NextResponse.json(
      { error: { code: "referral_rejected", message } },
      { status: 409 },
    );
  }
}
