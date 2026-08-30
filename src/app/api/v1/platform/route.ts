import { getPlatformApiCatalog } from "@dg/platform-core";
import { NextResponse } from "next/server";

import {
  extractApiKeyFromRequest,
  isNextResponse,
  requireClerkSession,
  requirePlatformAuth,
} from "@/lib/platform-api";

export async function GET(req: Request) {
  const catalog = getPlatformApiCatalog();
  const apiKey = extractApiKeyFromRequest(req);

  if (apiKey) {
    const session = await requirePlatformAuth(req);
    if (isNextResponse(session)) return session;
    return NextResponse.json({
      data: {
        ...catalog,
        organisation: {
          id: session.organisationId,
          name: session.organisationName,
          slug: session.organisationSlug,
        },
      },
    });
  }

  const session = await requireClerkSession(req);
  if (!isNextResponse(session)) {
    return NextResponse.json({
      data: {
        ...catalog,
        organisation: {
          id: session.organisationId,
          name: session.organisationName,
          slug: session.organisationSlug,
        },
      },
    });
  }

  return NextResponse.json({ data: catalog });
}
