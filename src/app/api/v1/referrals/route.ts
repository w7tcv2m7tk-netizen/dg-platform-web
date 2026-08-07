import {
  createReferralInvite,
  getReferAndEarnDashboard,
  requestCashPayoutStub,
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

  if (body.action === "cash_payout_stub") {
    const result = await requestCashPayoutStub({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: { code: result.reason, message: "Cash payout unavailable", ...result } },
        { status: 422 },
      );
    }
    return NextResponse.json({ data: result });
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
