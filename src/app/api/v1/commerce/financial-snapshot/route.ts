import { getCommerceFinancialSnapshot } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

export async function GET() {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const snapshot = await getCommerceFinancialSnapshot(session.organisationId);
  return NextResponse.json({ data: snapshot });
}
