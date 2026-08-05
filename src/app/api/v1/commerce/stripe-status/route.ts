import { getStripeSetupStatus } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

export async function GET() {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  return NextResponse.json({ data: getStripeSetupStatus() });
}
