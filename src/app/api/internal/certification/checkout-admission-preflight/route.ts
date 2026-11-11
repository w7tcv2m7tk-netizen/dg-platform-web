import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getGen2OnboardingProgress } from "@dg/platform-core/onboarding/gen2-progress";
import { prepareStandardCheckoutAdmission, verifyCheckoutAdmission } from "@dg/platform-core/billing/checkout-admission";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

/**
 * TEMPORARY staging-only checkout admission preflight for cert-tenant-a.
 * Read-only: never issues an admission, mutates the gate or creates Stripe sessions.
 * Remove after isolated certification. No secrets or PII in the response.
 */
export async function GET(req: Request) {
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
  if (process.env.VERCEL_ENV !== "preview" || process.env.DG_NEON_ENV !== "preview") {
    return new NextResponse(null, { status: 404, headers });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, code: "not_authenticated" }, { status: 401, headers });
  }
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  if (session.organisationId !== "cert-tenant-a" || session.clerkUserId !== userId) {
    return NextResponse.json({ ok: false, code: "not_authorised" }, { status: 403, headers });
  }

  try {
    const progress = await getGen2OnboardingProgress("cert-tenant-a");
    if (progress.platformTier !== "professional" ||
        progress.billingCadence !== "monthly" ||
        progress.supportPlan !== "standard" ||
        progress.industryApps?.length !== 1 || progress.industryApps[0] !== "finance" ||
        progress.premiumApps?.length !== 1 || progress.premiumApps[0] !== "reviews") {
      return NextResponse.json({ ok: false, code: "selection_changed" }, { status: 409, headers });
    }

    const prepared = await prepareStandardCheckoutAdmission({
      organisationId: "cert-tenant-a",
      clerkUserId: userId,
      email: session.email,
      businessName: "Synthetic A",
      platformTier: progress.platformTier,
      industryApps: progress.industryApps,
      premiumApps: progress.premiumApps,
      supportPlan: progress.supportPlan,
      billingCadence: progress.billingCadence,
    });

    const terms = prepared.terms as {
      line_items?: Array<{ quantity?: number; price_data?: { unit_amount?: number } }>;
      subscription_data?: { trial_period_days?: number };
    };
    const total = terms.line_items?.reduce((sum, item) =>
      sum + (item.quantity ?? 1) * (item.price_data?.unit_amount ?? 0), 0);
    if (prepared.providerScope !== "acct_1Tkx8JD7LDT1v2Sj:test:2025-02-24.acacia" ||
        total !== 39800 || terms.subscription_data?.trial_period_days !== 14) {
      return NextResponse.json({ ok: false, code: "commercial_preflight_failed" }, { status: 409, headers });
    }

    // Read-only, transactional admission verification, same code path as the
    // checkout coordinator. No admission binding, attempt, or Stripe session.
    let admissionCheck: "passed" | "denied" | "database_error" = "database_error";
    try {
      const { prisma } = await import("@dg/database");
      const confirmed = await prisma.$transaction(async tx =>
        verifyCheckoutAdmission(tx, {
          organisationId: prepared.organisationId,
          clerkUserId: prepared.clerkUserId,
          providerScope: prepared.providerScope,
          terms: prepared.terms,
        }),
        { maxWait: 1000, timeout: 5000 },
      );
      admissionCheck = confirmed ? "passed" : "denied";
    } catch {
      admissionCheck = "database_error";
    }

    return NextResponse.json({
      admissionCheck,
      ok: admissionCheck === "passed",
      organisationId: prepared.organisationId,
      clerkUserId: prepared.clerkUserId,
      providerScope: prepared.providerScope,
      termsHash: prepared.termsHash,
      terms: prepared.terms,
    }, { headers });
  } catch {
    return NextResponse.json({ ok: false, code: "preflight_unavailable" }, { status: 503, headers });
  }
}
