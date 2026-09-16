import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Recovery helper for a stale Google grant. We cannot revoke a user's Google
 * Account third-party connection on their behalf without a valid revocation
 * workflow, so send them to Google's connection manager and keep the intended
 * DigitalGate return path in the UI flow.
 */
export async function GET(_req: NextRequest) {
  return NextResponse.redirect("https://myaccount.google.com/connections");
}
