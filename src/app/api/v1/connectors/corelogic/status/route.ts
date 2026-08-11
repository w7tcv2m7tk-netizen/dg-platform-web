import {
  bootConnectorEngine,
  coreLogicCredentialsConfigured,
  probeCoreLogicConnection,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

bootConnectorEngine();

/** GET /api/v1/connectors/corelogic/status — Cotality/CoreLogic platform credentials health. */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const configured = coreLogicCredentialsConfigured();
  const clientIdSet = Boolean(process.env.CORELOGIC_CLIENT_ID?.trim());
  const secretSet = Boolean(process.env.CORELOGIC_CLIENT_SECRET?.trim());

  let probe: Awaited<ReturnType<typeof probeCoreLogicConnection>> | null = null;
  if (configured) {
    probe = await probeCoreLogicConnection();
  }

  return NextResponse.json({
    data: {
      connectorId: "corelogic",
      name: "Cotality (CoreLogic / RP Data)",
      platform: {
        configured,
        clientIdSet,
        secretSet,
        tokenUrl:
          process.env.CORELOGIC_TOKEN_URL?.trim() ||
          "https://api-sbox.corelogic.asia/access/as/token.oauth2",
        searchBase:
          process.env.CORELOGIC_SEARCH_BASE?.trim() ||
          process.env.CORELOGIC_API_BASE?.trim() ||
          "https://api-sbox.corelogic.asia/search",
        propertyDetailsBase:
          process.env.CORELOGIC_PROPERTY_DETAILS_BASE?.trim() ||
          "https://api-sbox.corelogic.asia/property-details",
        avmBase:
          process.env.CORELOGIC_AVM_BASE?.trim() ||
          "https://api-sbox.corelogic.asia/avm",
        clientName:
          process.env.CORELOGIC_CLIENT_NAME?.trim() || "digitalgate-property-data",
        probe,
      },
      organisation: {
        id: session.organisationId,
        name: session.organisationName,
        /** Platform-level OAuth client — not per-org connect yet. */
        connected: configured,
      },
    },
  });
}
