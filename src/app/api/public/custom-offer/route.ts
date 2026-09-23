import { NextResponse } from "next/server";
import {
  claimOpportunityCustomOffer,
  findOpportunityCustomOfferByToken,
} from "@dg/platform-core";

import { isNextResponse, rejectDemoLiveAction, requirePermission, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim();
  if (!token) return NextResponse.json({ error: { code: "validation_error", message: "token is required" } }, { status: 422 });
  const found = await findOpportunityCustomOfferByToken(token);
  if (!found) return NextResponse.json({ error: { code: "not_found", message: "Custom pricing offer not found" } }, { status: 404 });
  const { offer } = found;
  return NextResponse.json({
    data: {
      offer: {
        label: offer.label,
        currency: offer.currency,
        amountCents: offer.amountCents,
        cadence: offer.cadence,
        platformTier: offer.platformTier,
        industryApps: offer.industryApps,
        premiumApps: offer.premiumApps,
        supportPlan: offer.supportPlan ?? "standard",
        seats: offer.seats,
        trialDays: offer.trialDays,
        oneOffAmountCents: offer.oneOffAmountCents,
        oneOffLabel: offer.oneOffLabel,
        notes: offer.notes,
      },
    },
  });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requirePermission(session, { module: "billing", action: "manage", scope: "organisation" });
  if (denied) return denied;
  const blocked = await rejectDemoLiveAction(session);
  if (blocked) return blocked;
  const body = (await req.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token?.trim();
  if (!token) return NextResponse.json({ error: { code: "validation_error", message: "token is required" } }, { status: 422 });
  const offer = await claimOpportunityCustomOffer({ customerOrganisationId: session.organisationId, token });
  if (!offer) return NextResponse.json({ error: { code: "not_found", message: "Custom pricing offer not found" } }, { status: 404 });
  return NextResponse.json({ data: { offer, onboardingUrl: "/onboarding?customOffer=accepted" } });
}
