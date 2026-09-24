import { NextResponse } from "next/server";
import {
  GEN2_SUPPORT_PLANS,
  GROWTH_APP_CATALOGUE,
  getOpportunityCustomOffer,
  isTemplateActivatable,
  listIndustries,
  setOpportunityCustomOffer,
  type CustomCommercialOffer,
} from "@dg/platform-core";

import { requirePlatformOperator } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 50);
}

function appOptions() {
  const industries = listIndustries().filter((industry) =>
    ["AVAILABLE", "EARLY_ACCESS", "FOUNDING"].includes(industry.status),
  );
  const industry = industries.map((item) => ({
    id: item.id,
    label: `${item.name} Industry App`,
    description: item.description,
  }));
  const templates = industries.flatMap((item) =>
    item.templates
      .filter((template) => isTemplateActivatable(template.status))
      .map((template) => ({
        id: template.id,
        parentId: item.id,
        label: template.name,
        description: template.description,
      })),
  );
  const growth = GROWTH_APP_CATALOGUE.map((app) => ({
    id: app.appId,
    label: app.label.replace("DigitalGate ", ""),
  }));
  return { industry, templates, growth };
}

function validatedSelections(body: Record<string, unknown>) {
  const options = appOptions();
  const industryIds = new Set(options.industry.map((item) => item.id));
  const selectedIndustries = stringList(body.industryApps).filter((id) => industryIds.has(id));
  const selectedIndustrySet = new Set(selectedIndustries);
  const templateParent = new Map(options.templates.map((item) => [item.id, item.parentId] as const));
  const selectedTemplates = stringList(body.industryTemplates).filter((id) => {
    const parentId = templateParent.get(id);
    return Boolean(parentId && selectedIndustrySet.has(parentId));
  });
  const growthIds = new Set(options.growth.map((item) => item.id));
  const selectedGrowth = stringList(body.premiumApps).filter((id) => growthIds.has(id));
  return {
    industryApps: [...new Set(selectedIndustries)],
    industryTemplates: [...new Set(selectedTemplates)],
    premiumApps: [...new Set(selectedGrowth)],
  };
}

function shareUrl(req: Request, token: string | null) {
  if (!token) return null;
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, "") || new URL(req.url).origin;
  return `${base}/custom-offer/${token}`;
}

export async function GET(req: Request) {
  const auth = await requirePlatformOperator(req);
  if (isNextResponse(auth)) return auth;
  const opportunityId = new URL(req.url).searchParams.get("opportunityId")?.trim();
  if (!opportunityId) return NextResponse.json({ error: { code: "validation_error", message: "opportunityId is required" } }, { status: 422 });
  const current = await getOpportunityCustomOffer({ organisationId: auth.session.organisationId, opportunityId });
  if (!current) return NextResponse.json({ error: { code: "not_found", message: "Opportunity not found" } }, { status: 404 });
  return NextResponse.json({
    data: {
      offer: current.offer,
      shareUrl: shareUrl(req, current.token),
      appOptions: appOptions(),
      locked: Boolean(current.claimedByOrganisationId),
      claimedAt: current.claimedAt,
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
  const platformTier = body?.platformTier === "starter" || body?.platformTier === "professional" || body?.platformTier === "business" ? body.platformTier : null;
  const supportPlan = body?.supportPlan === "priority" || body?.supportPlan === "success_partner" || body?.supportPlan === "enterprise_success" || body?.supportPlan === "standard" ? body.supportPlan : "standard";
  const seats = Number(body?.seats);
  const trialDays = Number(body?.trialDays);
  if (!opportunityId || !label || !Number.isInteger(amountCents) || amountCents <= 0 || !Number.isInteger(oneOffAmountCents) || oneOffAmountCents < 0 || (oneOffAmountCents > 0 && !oneOffLabel) || !cadence || !platformTier || !Number.isInteger(seats) || seats <= 0 || !Number.isInteger(trialDays) || trialDays < 0 || trialDays > 90) {
    return NextResponse.json({ error: { code: "validation_error", message: "Complete the custom pricing fields before saving." } }, { status: 422 });
  }
  const existing = await getOpportunityCustomOffer({ organisationId: auth.session.organisationId, opportunityId });
  if (!existing) return NextResponse.json({ error: { code: "not_found", message: "Opportunity not found" } }, { status: 404 });
  if (existing.claimedByOrganisationId) {
    return NextResponse.json(
      { error: { code: "offer_locked", message: "This offer has already been accepted and is locked." } },
      { status: 409 },
    );
  }
  const selections = validatedSelections(body ?? {});
  const offer: CustomCommercialOffer = {
    version: 1,
    id: existing.offer?.id ?? `custom-${opportunityId}`,
    label,
    status: "agreed",
    currency: "aud",
    amountCents,
    cadence,
    platformTier,
    industryApps: selections.industryApps,
    industryTemplates: selections.industryTemplates,
    premiumApps: selections.premiumApps,
    supportPlan,
    seats: Math.min(seats, 10000),
    trialDays,
    ...(oneOffAmountCents > 0 ? { oneOffAmountCents, oneOffLabel } : {}),
    agreedAt: existing.offer?.agreedAt ?? new Date().toISOString(),
    notes: typeof body?.notes === "string" ? body.notes.trim().slice(0, 2000) : undefined,
  };
  try {
    const saved = await setOpportunityCustomOffer({ organisationId: auth.session.organisationId, opportunityId, actorId: auth.session.clerkUserId, offer });
    return NextResponse.json({ data: { offer: saved.offer, shareUrl: shareUrl(req, saved.token) } });
  } catch (error) {
    return NextResponse.json({ error: { code: "custom_offer_error", message: error instanceof Error ? error.message : "Could not save custom pricing offer" } }, { status: 422 });
  }
}
