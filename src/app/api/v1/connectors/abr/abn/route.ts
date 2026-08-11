import {
  abrCredentialsConfigured,
  abrGuidEnvKeyPresent,
  searchByAbn,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/connectors/abr/abn  { "abn": "…" }
 * Auth-protected ABR SearchByABNv202001. Never returns GUID.
 */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  let body: { abn?: string };
  try {
    body = (await req.json()) as { abn?: string };
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const abn = body.abn?.trim() ?? "";
  if (!abn) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Body field abn is required" } },
      { status: 400 },
    );
  }

  if (!abrCredentialsConfigured()) {
    return NextResponse.json(
      {
        error: {
          code: "not_configured",
          message:
            "ABR GUID not configured. Set ABN_LOOKUP_GUID or ABR_GUID in server .env.local.",
        },
        data: { configured: false, guidEnvKeyPresent: null },
      },
      { status: 503 },
    );
  }

  const abr = await searchByAbn(abn);
  return NextResponse.json(
    {
      data: {
        connectorId: "abr",
        method: "SearchByABNv202001",
        configured: true,
        guidEnvKeyPresent: abrGuidEnvKeyPresent(),
        organisationId: session.organisationId,
        abr,
      },
    },
    { status: abr.ok ? 200 : 422 },
  );
}
