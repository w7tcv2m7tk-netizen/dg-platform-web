import { getCommerceFinancialSnapshot } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "commerce.read");
  if (denied) return denied;

  const snapshot = await getCommerceFinancialSnapshot(session.organisationId);
  return NextResponse.json({ data: snapshot });
}
