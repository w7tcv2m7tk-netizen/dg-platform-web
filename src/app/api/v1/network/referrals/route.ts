import {
  advanceBusinessReferral,
  createBusinessReferral,
  listOrganisationBusinessReferrals,
  normalizeBusinessReferralStatus,
  normalizeBusinessReferralType,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const referrals = await listOrganisationBusinessReferrals(session.organisationId);
  return NextResponse.json({ data: { referrals } });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));

  if (body.action === "advance") {
    const referralId = typeof body.referralId === "string" ? body.referralId : "";
    if (!referralId) {
      return NextResponse.json(
        { error: { code: "validation", message: "referralId required" } },
        { status: 422 },
      );
    }
    const status = normalizeBusinessReferralStatus(body.status) ?? undefined;
    const result = await advanceBusinessReferral({
      organisationId: session.organisationId,
      referralId,
      actorId: session.clerkUserId,
      status,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: { code: result.reason, message: result.message } },
        { status: result.reason === "not_found" ? 404 : 422 },
      );
    }
    return NextResponse.json({ data: result.referral });
  }

  const type = normalizeBusinessReferralType(body.type);
  if (!type) {
    return NextResponse.json(
      { error: { code: "validation", message: "Valid referral type required" } },
      { status: 422 },
    );
  }

  const contactId = typeof body.contactId === "string" ? body.contactId : "";
  if (!contactId) {
    return NextResponse.json(
      { error: { code: "validation", message: "contactId required" } },
      { status: 422 },
    );
  }

  const result = await createBusinessReferral({
    organisationId: session.organisationId,
    contactId,
    actorId: session.clerkUserId,
    type,
    recipientBusiness: typeof body.recipientBusiness === "string" ? body.recipientBusiness : "",
    feeDisclosure: typeof body.feeDisclosure === "string" ? body.feeDisclosure : undefined,
    disclosed: Boolean(body.disclosed),
    notes: typeof body.notes === "string" ? body.notes : undefined,
    industry: typeof body.industry === "string" ? body.industry : null,
    compliancePackEnabled: Boolean(body.compliancePackEnabled),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.reason, message: result.message } },
      { status: 422 },
    );
  }

  return NextResponse.json({ data: result.referral });
}
