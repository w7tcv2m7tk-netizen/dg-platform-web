import { listOperatorPlatformOpportunities } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { requirePlatformOperator } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

/** Lightweight badge counts for Command Centre sidebar. */
export async function GET(req: Request) {
  const auth = await requirePlatformOperator(req, "command.opportunities.read");
  if (isNextResponse(auth)) return auth;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ attentionCount: 0, opportunityCount: 0 });
  }

  const data = await listOperatorPlatformOpportunities(auth.operator, { limit: 40 });
  return NextResponse.json({
    attentionCount: data.attentionCount,
    opportunityCount: data.opportunityCount,
    generatedAt: data.generatedAt,
  });
}
