import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Same-origin continuation after Google OAuth.
 *
 * Keeping this as an API route avoids the Clerk provider's external-OAuth
 * force redirect swallowing the intended Analytics destination. The next hop
 * is an ordinary same-origin navigation to the protected connector page.
 */
export async function GET(req: NextRequest) {
  const destination = new URL("/apps/analytics/connectors/google", req.nextUrl.origin);
  destination.searchParams.set("google", "connected");
  return NextResponse.redirect(destination);
}
