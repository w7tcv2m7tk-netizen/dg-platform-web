import {
  bootConnectorEngine,
  listConnectorCatalogForOrg,
  toConnectorHealth,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

bootConnectorEngine();

/** GET /api/v1/connectors — Connector Engine catalog + org health. */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const catalog = await listConnectorCatalogForOrg(session.organisationId);
  return NextResponse.json({
    data: {
      organisationId: session.organisationId,
      connectors: catalog.map((item) => ({
        ...item,
        health: toConnectorHealth(session.organisationId, item),
      })),
    },
  });
}
