import {
  getEmailDomainAuthPlan,
  getEmailInfrastructureOverview,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const runtime = "nodejs";

/** GET /api/v1/infrastructure/email — overview (+ optional ?domain= auth plan) */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const url = new URL(req.url);
  const domain = url.searchParams.get("domain")?.trim();

  const overview = await getEmailInfrastructureOverview(
    session.organisationId,
  );

  return NextResponse.json({
    data: {
      overview,
      authPlan: domain
        ? getEmailDomainAuthPlan(domain, session.organisationId)
        : null,
    },
  });
}
