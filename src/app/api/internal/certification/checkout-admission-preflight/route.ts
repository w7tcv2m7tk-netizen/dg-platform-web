import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "node:crypto";
import { prepareStandardPlatformCheckout } from "@dg/platform-core/billing/platform-checkout";
import { checkoutPurchaseFingerprint } from "@dg/platform-core/billing/checkout-coordinator";

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

    // Transactional rollback rehearsal: evaluates the real checkout reservation
    // sequence, creates no persistent attempt/admission and never calls Stripe.create.
    // Deliberate rollback happens regardless of success. Do not reuse outside staging.
    let reservationStage = "not_run";
    let reservationErrorCode = "none";
    const reservationStarted = Date.now();
    class RehearsalRollback extends Error {}
    try {
      const { prisma } = await import("@dg/database");
      const { parameters } = await prepareStandardPlatformCheckout({
        organisationId: "cert-tenant-a", clerkUserId: userId, email: session.email,
        businessName: "Synthetic A", platformTier: progress.platformTier,
        industryApps: progress.industryApps, premiumApps: progress.premiumApps,
        supportPlan: progress.supportPlan, billingCadence: progress.billingCadence,
      });
      const fingerprint = checkoutPurchaseFingerprint(parameters);
      await prisma.$transaction(async tx => {
        reservationStage = "advisory_lock";
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${prepared.organisationId}, 0))`;
        reservationStage = "organisation_lookup";
        const org = await tx.organisation.findUniqueOrThrow({ where: { id: prepared.organisationId } });
        reservationStage = "subscription_lookup";
        await tx.platformSubscription.findUnique({ where: { organisationId: prepared.organisationId } });
        reservationStage = "attempt_lookup";
        const current = await tx.platformCheckoutAttempt.findUnique({ where: { currentOrganisationId: prepared.organisationId } });
        if (current) { reservationStage = "existing_attempt"; throw new RehearsalRollback(); }
        reservationStage = "admission_lock";
        await verifyCheckoutAdmission(tx, { organisationId: prepared.organisationId,
          clerkUserId: prepared.clerkUserId, providerScope: prepared.providerScope, terms: prepared.terms });
        reservationStage = "attempt_create";
        const now = new Date(), params = structuredClone(parameters);
        delete params.metadata?.contact_email; delete params.metadata?.business_name;
        params.expires_at = Math.floor((now.getTime() + 3600000) / 1000);
        const attempt = await tx.platformCheckoutAttempt.create({ data: {
          organisationId: org.id, currentOrganisationId: org.id,
          purchaseFingerprint: fingerprint,
          requestParameters: params as never,
          idempotencyKey: `platform-checkout-rehearsal-${randomUUID()}`,
          providerScope: prepared.providerScope,
          expiresAt: new Date(params.expires_at * 1000),
          replayUntil: new Date(now.getTime() + 23 * 3600000),
          legacySessionIds: [],
        } });
        reservationStage = "admission_bind";
        await verifyCheckoutAdmission(tx, {
          organisationId: prepared.organisationId, clerkUserId: prepared.clerkUserId,
          providerScope: prepared.providerScope, terms: prepared.terms,
          attemptId: attempt.id,
        }, true);
        reservationStage = "gate_reverify";
        await verifyCheckoutAdmission(tx, {
          organisationId: prepared.organisationId, clerkUserId: prepared.clerkUserId,
          providerScope: prepared.providerScope, terms: prepared.terms,
          attemptId: attempt.id,
        }, true);
        reservationStage = "gate_sql_update";
        const gate = await tx.$queryRaw<Array<{ expiresAt: bigint }>>`
          UPDATE platform_checkout_creation_gate
          SET last_admission_expires_at = GREATEST(
            last_admission_expires_at,
            COALESCE(to_timestamp(${params.expires_at}::double precision),
              date_trunc('second', clock_timestamp()) + interval '35 minutes')
          )
          WHERE id = 1 AND subscription_webhooks_held = false
            AND (blocked = false OR ${"rehearsal-authorized"}::text IS NOT NULL)
          RETURNING EXTRACT(EPOCH FROM last_admission_expires_at)::bigint AS "expiresAt"
        `;
        if (gate.length !== 1) { reservationStage = "gate_no_row"; throw new Error("gate_no_row"); }
        reservationStage = "lease_update";
        await tx.platformCheckoutAttempt.update({ where: { id: attempt.id },
          data: { leaseToken: randomUUID(), leaseUntil: new Date(now.getTime() + 60000) } });
        reservationStage = "all_passed_rolled_back";
        throw new RehearsalRollback();
      }, { maxWait: 1000, timeout: 5000 });
    } catch (error: unknown) {
      if (!(error instanceof RehearsalRollback)) {
        const candidate = error as { code?: unknown; meta?: { code?: unknown } };
        const code = String(candidate?.code ?? candidate?.meta?.code ?? "");
        reservationErrorCode = /^(P20[0-9]{2}|P10[0-9]{2}|42501|55P03|57014)$/.test(code) ? code : "other";
      }
    }

    return NextResponse.json({
      reservationStage,
      reservationErrorCode,
      reservationDurationMs: Date.now() - reservationStarted,
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
