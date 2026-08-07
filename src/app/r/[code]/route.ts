import {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_MAX_AGE_SEC,
  resolveReferralCode,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ code: string }>;
}

/**
 * Public Refer & Earn landing — sets attribution cookie and redirects to signup.
 * First-touch; single-level only (no MLM).
 */
export async function GET(req: Request, context: RouteContext) {
  const { code: raw } = await context.params;
  const resolved = await resolveReferralCode(raw);
  const origin = new URL(req.url).origin;

  if (!resolved) {
    return NextResponse.redirect(new URL("/signup?ref=invalid", origin));
  }

  const res = NextResponse.redirect(
    new URL(`/signup?ref=${encodeURIComponent(resolved.code)}`, origin),
  );
  res.cookies.set(REFERRAL_COOKIE, resolved.code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REFERRAL_COOKIE_MAX_AGE_SEC,
  });
  return res;
}
