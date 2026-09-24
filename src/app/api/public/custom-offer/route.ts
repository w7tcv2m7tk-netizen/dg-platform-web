import { NextResponse } from "next/server";
import {
  GEN2_SUPPORT_PLANS,
  GROWTH_APP_CATALOGUE,
  claimOpportunityCustomOffer,
  findOpportunityCustomOfferByToken,
  getTemplate,
  industryIdForAppOrTemplate,
  listIndustries,
} from "@dg/platform-core";

import { isNextResponse, rejectDemoLiveAction, requirePermission, requirePlatformAuth } from "@/lib/platform-api";

function displayIndustry(id: string) {
  const parentId = industryIdForAppOrTemplate(id) ?? id;
  const industry = listIndustries().find((item) => item.id === parentId);
  return { id: parentId, label: industry ? `${industry.name} Industry App` : id.replaceAll("-", " ") };
}

function displayTemplate(id: string) {
  const template = getTemplate(id);
  return { id, label: template?.name ?? id.replaceAll("-", " ") };
}

function displayGrowth(id: string) {
  const app = GROWTH_APP_CATALOGUE.find((item) => item.appId === id);
  return { id, label: app?.label?.replace("DigitalGate ", "") ?? id.replaceAll("-", " ") };
}

function supportLabel(id: string) {
  return GEN2_SUPPORT_PLANS.find((plan) => plan.id === id)?.name ?? id.replaceAll("_", " ");
}

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
        platformLabel: offer.platformTier === "professional" ? "Growth" : offer.platformTier === "business" ? "Scale" : "Starter",
        industryApps: offer.industryApps.map(displayIndustry),
        industryTemplates: offer.industryTemplates.map(displayTemplate),
        premiumApps: offer.premiumApps.map(displayGrowth),
        supportPlan: offer.supportPlan ?? "standard",
        supportLabel: supportLabel(offer.supportPlan ?? "standard"),
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
  try {
    const offer = await claimOpportunityCustomOffer({ customerOrganisationId: session.organisationId, token });
    if (!offer) return NextResponse.json({ error: { code: "not_found", message: "Custom pricing offer not found" } }, { status: 404 });
    return NextResponse.json({ data: { offer, onboardingUrl: "/onboarding?customOffer=accepted" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not accept this offer.";
    const alreadyAccepted = /already been accepted|being accepted elsewhere/i.test(message);
    return NextResponse.json(
      { error: { code: alreadyAccepted ? "offer_already_claimed" : "offer_claim_failed", message } },
      { status: alreadyAccepted ? 409 : 422 },
    );
  }
}
