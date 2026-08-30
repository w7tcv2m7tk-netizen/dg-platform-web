import {
  createOrganisationGoal,
  createPlatformCheckoutSession,
  getGen2OnboardingProgress,
  getOrganisationBusinessProfile,
  getOrganisationGoals,
  saveGen2OnboardingProgress,
  updateOrganisationBusinessProfile,
  type Gen2OnboardingStep,
  isGen2OnboardingStep,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import {
  isNextResponse,
  rejectDemoLiveAction,
  requirePermission,
  requirePlatformAuth,
} from "@/lib/platform-api";

const GOAL_METRIC_HINTS: Record<
  string,
  { metric: "custom" | "active_leads" | "seo" | "ai_visibility" | "business_health"; target: number }
> = {
  more_leads: { metric: "active_leads", target: 20 },
  seo: { metric: "seo", target: 80 },
  ai_visibility: { metric: "ai_visibility", target: 80 },
  website_performance: { metric: "business_health", target: 80 },
};

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const [progress, profile, goals] = await Promise.all([
    getGen2OnboardingProgress(session.organisationId),
    getOrganisationBusinessProfile(session.organisationId),
    getOrganisationGoals(session.organisationId).catch(() => []),
  ]);

  return NextResponse.json({
    data: {
      progress,
      profile,
      goals,
      organisationName: session.organisationName,
    },
  });
}

export async function PATCH(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const blocked = await rejectDemoLiveAction(session);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const markStepComplete = isGen2OnboardingStep(body.markStepComplete)
    ? (body.markStepComplete as Gen2OnboardingStep)
    : undefined;

  if (body.profile && typeof body.profile === "object") {
    const denied = requirePermission(session, {
      module: "settings",
      action: "manage",
      scope: "organisation",
    });
    if (denied) return denied;
    await updateOrganisationBusinessProfile(session.organisationId, body.profile);
  }

  if (Array.isArray(body.goals) && body.goals.length > 0) {
    const existing = await getOrganisationGoals(session.organisationId);
    const existingTitles = new Set(existing.map((g) => g.title.toLowerCase()));
    for (const g of body.goals.slice(0, 8)) {
      const id = typeof g === "string" ? g : g?.id;
      const title = typeof g === "string" ? g : g?.title ?? g?.label;
      if (!title || typeof title !== "string") continue;
      const trimmed = title.trim();
      if (trimmed.length < 2 || existingTitles.has(trimmed.toLowerCase())) continue;
      const hint = GOAL_METRIC_HINTS[String(id)] ?? {
        metric: "custom" as const,
        target: 1,
      };
      await createOrganisationGoal(session.organisationId, {
        title: trimmed,
        metric: hint.metric,
        target: hint.target,
        horizon: "quarter",
        status: "active",
      }).catch(() => null);
      existingTitles.add(trimmed.toLowerCase());
    }
  }

  const progress = await saveGen2OnboardingProgress(session.organisationId, {
    ...(typeof body.progress === "object" && body.progress ? body.progress : {}),
    markStepComplete,
    currentStep: isGen2OnboardingStep(body.currentStep) ? body.currentStep : undefined,
  });

  return NextResponse.json({ data: { progress } });
}

/** Start Stripe Checkout from onboarding order summary. */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const blocked = await rejectDemoLiveAction(session);
  if (blocked) return blocked;

  const denied = requirePermission(session, {
    module: "billing",
    action: "manage",
    scope: "organisation",
  });
  if (denied) return denied;

  const progress = await getGen2OnboardingProgress(session.organisationId);
  const body = await req.json().catch(() => ({}));
  const platformTier =
    (body.platformTier as string | undefined) ??
    progress.platformTier ??
    "professional";
  const billingCadence =
    body.billingCadence === "annual" || progress.billingCadence === "annual"
      ? ("annual" as const)
      : ("monthly" as const);

  try {
    const checkout = await createPlatformCheckoutSession({
      organisationId: session.organisationId,
      email: session.email,
      platformTier,
      industryApps: body.industryApps ?? progress.industryApps,
      premiumApps: body.premiumApps ?? progress.premiumApps,
      businessName: session.organisationName,
      billingCadence,
      successPath: "/onboarding?checkout=success",
      cancelPath: "/onboarding?checkout=cancelled",
    });

    await saveGen2OnboardingProgress(session.organisationId, {
      platformTier: platformTier as "starter" | "professional" | "business",
      billingCadence,
      industryApps: body.industryApps ?? progress.industryApps,
      premiumApps: body.premiumApps ?? progress.premiumApps,
      stripeCheckoutSessionId: checkout.sessionId,
      markStepComplete: "order_summary",
    });

    return NextResponse.json({ data: checkout });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json(
      { error: { code: "checkout_failed", message } },
      { status: 422 },
    );
  }
}
