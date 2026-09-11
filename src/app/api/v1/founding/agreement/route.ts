import { NextResponse } from "next/server";
import {
  applyFoundingCommercialOfferToCustomer,
  findFoundingOpportunityByInviteToken,
  getOrganisationCommercialOffer,
  markFoundingAgreementSigned,
  saveFoundingOnboarding,
} from "@dg/platform-core";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

export async function POST(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const body = (await req.json().catch(() => null)) as { inviteToken?: string } | null;
  const inviteToken = body?.inviteToken?.trim();
  let offer = await getOrganisationCommercialOffer(session.organisationId);
  if (!offer && inviteToken) {
    const opportunity = await findFoundingOpportunityByInviteToken(inviteToken);
    if (opportunity) {
      offer = await applyFoundingCommercialOfferToCustomer({
        customerOrganisationId: session.organisationId,
        opportunityMetadata: opportunity.metadata,
      });
    }
  }
  let record = await markFoundingAgreementSigned({
    customerOrganisationId: session.organisationId,
    actorId: session.clerkUserId,
    inviteToken,
  });
  if (offer) {
    record = await saveFoundingOnboarding(session.organisationId, {
      commercialOfferSnapshot: offer,
    });
  }
  return NextResponse.json({ data: record });
}
