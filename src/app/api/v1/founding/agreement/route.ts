import { NextResponse } from "next/server";
import {
  getOrganisationCommercialOffer,
  markFoundingAgreementSigned,
  saveFoundingOnboarding,
} from "@dg/platform-core";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

export async function POST(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const body = (await req.json().catch(() => null)) as { inviteToken?: string } | null;
  const offer = await getOrganisationCommercialOffer(session.organisationId);
  let record = await markFoundingAgreementSigned({
    customerOrganisationId: session.organisationId,
    actorId: session.clerkUserId,
    inviteToken: body?.inviteToken?.trim(),
  });
  if (offer) {
    record = await saveFoundingOnboarding(session.organisationId, {
      commercialOfferSnapshot: offer,
    });
  }
  return NextResponse.json({ data: record });
}
