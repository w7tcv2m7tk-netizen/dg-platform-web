import { NextResponse } from "next/server";
import {
  acceptPartnerProgrammeTerms,
  FOUNDING_RESELLER_TERMS_VERSION,
  getPartnerByClerkUserId,
} from "@dg/platform-core";
import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

export async function POST(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const partner = await getPartnerByClerkUserId(session.clerkUserId);
  if (!partner) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "You are not a registered partner." } },
      { status: 403 },
    );
  }

  if (partner.partnerType === "IMPLEMENTATION_PARTNER") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Delivery partners do not accept reseller terms." } },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    termsVersion?: string;
    accepted?: boolean;
  } | null;

  if (!body?.accepted) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "You must confirm acceptance." } },
      { status: 400 },
    );
  }

  const version = body.termsVersion?.trim() || FOUNDING_RESELLER_TERMS_VERSION;

  try {
    const updated = await acceptPartnerProgrammeTerms(partner.id, version);
    return NextResponse.json({ data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not record acceptance.";
    return NextResponse.json(
      { error: { code: "terms_accept_failed", message } },
      { status: 500 },
    );
  }
}
