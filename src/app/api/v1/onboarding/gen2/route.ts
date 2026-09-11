import {
  createNegotiatedCommercialCheckoutSession,
  createOrganisationGoal,
  createPlatformCheckoutSession,
  getFoundingOnboarding,
  getGen2OnboardingProgress,
  getOrganisationBillingStatus,
  getOrganisationBusinessProfile,
  getOrganisationCommercialOffer,
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

const VERIFIED_CHECKOUT_KINDS = new Set(["trial", "subscribed", "cancel_at_period_end"]);
const CLIENT_CHECKLIST_KEYS = new Set([
  "business_identity",
  "business_profile",
  "goals",
  "plan",
  "apps",
  "implementation",
]);

async function effectiveCommercialOffer(organisationId: string) {
  const [programmeRecord, current] = await Promise.all([
    getFoundingOnboarding(organisationId),
    getOrganisationCommercialOffer(organisationId),
  ]);
  return programmeRecord?.commercialOfferSnapshot ?? current;
}

function safeClientProgress(raw: unknown) {
  if (!raw || typeof raw !== "object") return {};
  const source = raw as Record<string, unknown>;
  const safe: Record<string, unknown> = {};

  if (["starter", "professional", "business"].includes(String(source.platformTier))) {
    safe.platformTier = source.platformTier;
  }
  if (source.billingCadence === "monthly" || source.billingCadence === "annual") {
    safe.billingCadence = source.billingCadence;
  }
  if (Array.isArray(source.industryApps)) {
    safe.industryApps = source.industryApps
      .filter((value): value is string => typeof value === "string" && value.length <= 80)
      .slice(0, 20);
  }
  if (Array.isArray(source.premiumApps)) {
    safe.premiumApps = source.premiumApps
      .filter((value): value is string => typeof value === "string" && value.length <= 80)
      .slice(0, 20);
  }
  if (source.checklist && typeof source.checklist === "object") {
    const checklist: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(source.checklist as Record<string, unknown>)) {
      if (CLIENT_CHECKLIST_KEYS.has(key) && value === true) checklist[key] = true;
    }
    if (Object.keys(checklist).length > 0) safe.checklist = checklist;
  }

  return safe;
}

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const [progress, profile, goals, commercialOffer] = await Promise.all([
    getGen2OnboardingProgress(session.organisationId),
    getOrganisationBusinessProfile(session.organisationId),
    getOrganisationGoals(session.organisationId).catch(() => []),
    effectiveCommercialOffer(session.organisationId),
  ]);

  return NextResponse.json({
    data: {
      progress,
      profile,
      goals,
      commercialOffer,
      organisationName: session.organisationName,
    },
  });
}

export async function PATCH(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requirePermission(session, {
    module: "settings",
    action: "edit",
    scope: "organisation",
  });
  if (denied) return denied;
  const blocked = await rejectDemoLiveAction(session);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const markStepComplete = isGen2OnboardingStep(body.markStepComplete)
    ? (body.markStepComplete as Gen2OnboardingStep)
    : undefined;

  if (markStepComplete === "stripe") {
    const billing = await getOrganisationBillingStatus(session.organisationId);
    if (
      !billing ||
      !billing.hasStripeCustomer ||
      !VERIFIED_CHECKOUT_KINDS.has(billing.kind)
    ) {
      return NextResponse.json(
        {
          error: {
            code: "checkout_not_confirmed",
            message:
              "Your Stripe checkout has not been confirmed yet. Please try again in a moment.",
          },
        },
        { status: 409 },
      );
    }
  }

  if (body.profile && typeof body.profile === "object") {
    const profileDenied = requirePermission(session, {
      module: "settings",
      action: "manage",
      scope: "organisation",
    });
    if (profileDenied) return profileDenied;
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

  const offer = await effectiveCommercialOffer(session.organisationId);
  const clientProgress = safeClientProgress(body.progress);
  const lockedProgress = offer
    ? {
        ...clientProgress,
        platformTier: offer.platformTier,
        billingCadence: offer.cadence,
        industryApps: offer.industryApps,
        premiumApps: offer.premiumApps,
      }
    : clientProgress;
  const progress = await saveGen2OnboardingProgress(session.organisationId, {
    ...lockedProgress,
    ...(markStepComplete === "stripe"
      ? { subscriptionActivatedAt: new Date().toISOString() }
      : {}),
    markStepComplete,
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

  const [progress, offer] = await Promise.all([
    getGen2OnboardingProgress(session.organisationId),
    effectiveCommercialOffer(session.organisationId),
  ]);
  const body = await req.json().catch(() => ({}));
  const platformTier = offer?.platformTier ??
    (body.platformTier as string | undefined) ??
    progress.platformTier ??
    "professional";
  const billingCadence = offer?.cadence ??
    (body.billingCadence === "annual" || progress.billingCadence === "annual"
      ? ("annual" as const)
      : ("monthly" as const));
  const industryApps = offer?.industryApps ?? body.industryApps ?? progress.industryApps;
  const premiumApps = offer?.premiumApps ?? body.premiumApps ?? progress.premiumApps;

  try {
    const checkout = offer
      ? await createNegotiatedCommercialCheckoutSession({
          organisationId: session.organisationId,
          email: session.email,
          businessName: session.organisationName,
          offer,
          successPath: "/onboarding?checkout=success",
          cancelPath: "/onboarding?checkout=cancelled",
        })
      : await createPlatformCheckoutSession({
          organisationId: session.organisationId,
          email: session.email,
          platformTier,
          industryApps,
          premiumApps,
          businessName: session.organisationName,
          billingCadence,
          successPath: "/onboarding?checkout=success",
          cancelPath: "/onboarding?checkout=cancelled",
        });

    await saveGen2OnboardingProgress(session.organisationId, {
      platformTier: platformTier as "starter" | "professional" | "business",
      billingCadence,
      industryApps,
      premiumApps,
      stripeCheckoutSessionId: checkout.sessionId,
      markStepComplete: "order_summary",
    });

    return NextResponse.json({ data: checkout });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "checkout_failed",
          message: "We couldn't start subscription checkout. Please try again or contact DigitalGate.",
        },
      },
      { status: 422 },
    );
  }
}
