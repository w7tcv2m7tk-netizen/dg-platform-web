import { getStripeSetupStatus } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "commerce.settings");
  if (denied) return denied;

  return NextResponse.json({ data: getStripeSetupStatus() });
}
