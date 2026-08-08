import {
  createReferralInvite,
  createStripeConnectOnboardingLink,
  getReferAndEarnDashboard,
  normalizeReferralTier,
  requestCashPayout,
  syncStripeConnectAccount,
  updateOrganisationReferralProgramme,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

function appBaseUrl(req: Request) {
  const env =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim()?.replace(/^/, "https://");
  if (env) return env.replace(/\/$/, "");
  return new URL(req.url).origin;
}

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const url = new URL(req.url);
  if (url.searchParams.get("syncConnect") === "1") {
    await syncStripeConnectAccount({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
    }).catch(() => null);
  }

  const dashboard = await getReferAndEarnDashboard(session.organisationId);
  return NextResponse.json({
    data: {
      ...dashboard,
      shareUrl: `${appBaseUrl(req)}${dashboard.sharePath}`,
    },
  });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));

  if (body.action === "cash_payout" || body.action === "cash_payout_stub") {
    const result = await requestCashPayout({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
    });
    if (!result.ok) {
      // Resolve reason → copy before `"message" in result` narrows away Connect reasons.
      const fallback =
        result.reason === "below_threshold"
          ? "Balance is below the cash payout threshold"
          : result.reason === "connect_not_configured"
            ? "Cash bank payouts are not enabled on this environment"
            : result.reason === "connect_incomplete"
              ? "Finish Stripe Connect onboarding before requesting a cash payout"
              : "Cash payout unavailable";
      const message =
        "message" in result && typeof result.message === "string"
          ? result.message
          : fallback;
      return NextResponse.json(
        { error: { code: result.reason, message, ...result } },
        { status: 422 },
      );
    }
    return NextResponse.json({ data: result });
  }

  if (body.action === "connect_onboarding") {
    if (session.role !== "owner" && session.role !== "admin") {
      return NextResponse.json(
        {
          error: {
            code: "forbidden",
            message: "Only owners and admins can connect a bank account",
          },
        },
        { status: 403 },
      );
    }
    try {
      const result = await createStripeConnectOnboardingLink({
        organisationId: session.organisationId,
        actorId: session.clerkUserId,
        email: typeof body.email === "string" ? body.email : undefined,
        returnPath: "/dashboard/settings/referrals",
      });
      if (!result.ok) {
        return NextResponse.json(
          {
            error: {
              code: result.reason,
              message: result.message,
            },
          },
          { status: 422 },
        );
      }
      return NextResponse.json({ data: result });
    } catch (err) {
      return NextResponse.json(
        {
          error: {
            code: "connect_onboarding_failed",
            message:
              err instanceof Error
                ? err.message
                : "Could not start Stripe Connect onboarding",
          },
        },
        { status: 422 },
      );
    }
  }

  if (body.action === "connect_sync") {
    const result = await syncStripeConnectAccount({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
    });
    return NextResponse.json({ data: result });
  }

  if (body.action === "set_referral_tier") {
    if (session.role !== "owner" && session.role !== "admin") {
      return NextResponse.json(
        {
          error: {
            code: "forbidden",
            message: "Only owners and admins can change referral tier",
          },
        },
        { status: 403 },
      );
    }
    const tier = normalizeReferralTier(body.tier);
    const programme = await updateOrganisationReferralProgramme({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
      tier,
      commissionBps:
        typeof body.commissionBps === "number" ? body.commissionBps : null,
    });
    return NextResponse.json({ data: programme });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "email required" } },
      { status: 422 },
    );
  }

  try {
    const result = await createReferralInvite({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
      email,
      name: typeof body.name === "string" ? body.name : undefined,
      appBaseUrl: appBaseUrl(req),
    });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "invite_failed",
          message: err instanceof Error ? err.message : "Invite failed",
        },
      },
      { status: 422 },
    );
  }
}
