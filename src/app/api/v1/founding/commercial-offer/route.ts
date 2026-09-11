import { NextResponse } from "next/server";
import {
  foundingCommercialOfferFromMetadata,
  foundingCommercialOfferLocked,
  getOpportunity,
  setFoundingCommercialOffer,
  type NegotiatedCommercialOffer,
} from "@dg/platform-core";

import { requirePlatformOperator } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 50);
}

async function loadFoundingOpportunity(organisationId: string, opportunityId: string) {
  const opportunity = await getOpportunity(organisationId, opportunityId);
  if (!opportunity || opportunity.pipelineId !== "founding_10") return null;
  return opportunity;
}

export async function GET(req: Request) {
  const auth = await requirePlatformOperator(req);
  if (isNextResponse(auth)) return auth;
  const opportunityId = new URL(req.url).searchParams.get("opportunityId")?.trim();
  if (!opportunityId) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "opportunityId is required" } },
      { status: 422 },
    );
  }
  const opportunity = await loadFoundingOpportunity(auth.session.organisationId, opportunityId);
  if (!opportunity) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Founding opportunity not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({
    data: {
      offer: foundingCommercialOfferFromMetadata(opportunity.metadata),
      locked: foundingCommercialOfferLocked({
        stage: opportunity.stage,
        metadata: opportunity.metadata,
      }),
    },
  });
}

export async function POST(req: Request) {
  const auth = await requirePlatformOperator(req);
  if (isNextResponse(auth)) return auth;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const opportunityId = typeof body?.opportunityId === "string" ? body.opportunityId.trim() : "";
  const label = typeof body?.label === "string" ? body.label.trim().slice(0, 160) : "";
  const amountCents = Number(body?.amountCents);
  const oneOffAmountCents = Number(body?.oneOffAmountCents ?? 0);
  const oneOffLabel = typeof body?.oneOffLabel === "string" ? body.oneOffLabel.trim().slice(0, 160) : "";
  const cadence = body?.cadence === "annual" ? "annual" : body?.cadence === "monthly" ? "monthly" : null;
  const platformTier =
    body?.platformTier === "starter" ||
    body?.platformTier === "professional" ||
    body?.platformTier === "business"
      ? body.platformTier
      : null;
  const seats = Number(body?.seats);
  const trialDays = Number(body?.trialDays);

  if (
    !opportunityId ||
    !label ||
    !Number.isInteger(amountCents) ||
    amountCents <= 0 ||
    !Number.isInteger(oneOffAmountCents) ||
    oneOffAmountCents < 0 ||
    (oneOffAmountCents > 0 && !oneOffLabel) ||
    !cadence ||
    !platformTier ||
    !Number.isInteger(seats) ||
    seats <= 0 ||
    !Number.isInteger(trialDays) ||
    trialDays < 0 ||
    trialDays > 90
  ) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Complete the commercial offer fields before saving." } },
      { status: 422 },
    );
  }

  const opportunity = await loadFoundingOpportunity(auth.session.organisationId, opportunityId);
  if (!opportunity) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Founding opportunity not found" } },
      { status: 404 },
    );
  }
  const existing = foundingCommercialOfferFromMetadata(opportunity.metadata);
  const offer: NegotiatedCommercialOffer = {
    version: 1,
    id: existing?.id ?? `founding-${opportunityId}`,
    label,
    status: "agreed",
    currency: "aud",
    amountCents,
    cadence,
    platformTier,
    industryApps: stringList(body?.industryApps),
    premiumApps: stringList(body?.premiumApps),
    seats: Math.min(seats, 10000),
    trialDays,
    ...(oneOffAmountCents > 0 ? { oneOffAmountCents, oneOffLabel } : {}),
    agreedAt: existing?.agreedAt ?? new Date().toISOString(),
    notes: typeof body?.notes === "string" ? body.notes.trim().slice(0, 2000) : undefined,
  };

  try {
    const saved = await setFoundingCommercialOffer({
      organisationId: auth.session.organisationId,
      opportunityId,
      actorId: auth.session.clerkUserId,
      offer,
    });
    return NextResponse.json({ data: { offer: saved, locked: false } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save commercial offer";
    return NextResponse.json(
      { error: { code: "commercial_offer_error", message } },
      { status: message.includes("locked") ? 409 : 422 },
    );
  }
}
