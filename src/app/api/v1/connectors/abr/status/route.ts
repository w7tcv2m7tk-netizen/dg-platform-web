import {
  abrCredentialsConfigured,
  abrGuidEnvKeyPresent,
  getAbrConnectorStatus,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

/** GET /api/v1/connectors/abr/status — ABR connector health (no GUID). */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  return NextResponse.json({
    data: {
      connectorId: "abr",
      name: "Australian Business Register (ABR)",
      status: getAbrConnectorStatus(),
      configured: abrCredentialsConfigured(),
      guidEnvKeyPresent: abrGuidEnvKeyPresent(),
      methods: ["SearchByABNv202001", "SearchByASICv201408"],
      organisation: {
        id: session.organisationId,
        name: session.organisationName,
      },
    },
  });
}
