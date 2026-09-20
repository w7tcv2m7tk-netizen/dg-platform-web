import {
  abrCredentialsConfigured,
  abrGuidEnvKeyPresent,
  getAbrConnectorStatus,
  lookupBusinessIdentityByAbn,
  searchByName,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/business-identity/abn?abn=…
 * Auth-protected ABR SearchByABNv202001 → Business Identity.
 * Never returns the authentication GUID.
 */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const params = new URL(req.url).searchParams;
  const name = params.get("name")?.trim() ?? "";
  const abn = params.get("abn")?.trim() ?? "";

  if (name) {
    const result = await searchByName(name);
    const status = result.ok ? 200 : result.code === "not_configured" ? 503 : 422;
    return NextResponse.json(
      {
        data: {
          connector: "abr",
          method: "ABRSearchByNameAdvancedSimpleProtocol2017",
          status: getAbrConnectorStatus(),
          configured: abrCredentialsConfigured(),
          guidEnvKeyPresent: abrGuidEnvKeyPresent(),
          matches: result.ok ? result.matches : [],
          abr: result,
        },
      },
      { status },
    );
  }

  if (!abn) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request",
          message: "Query param abn or name is required",
        },
        data: {
          configured: abrCredentialsConfigured(),
          guidEnvKeyPresent: abrGuidEnvKeyPresent(),
        },
      },
      { status: 400 },
    );
  }

  const result = await lookupBusinessIdentityByAbn(abn, session.organisationId);
  const status = result.abr.ok ? 200 : result.abr.code === "not_configured" ? 503 : 422;

  return NextResponse.json(
    {
      data: {
        connector: "abr",
        method: "SearchByABNv202001",
        status: getAbrConnectorStatus(),
        configured: result.configured,
        /** Env key name only — never the GUID value */
        guidEnvKeyPresent: abrGuidEnvKeyPresent(),
        identity: result.identity,
        profilePatch: result.profilePatch,
        abr: result.abr,
      },
    },
    { status },
  );
}

/**
 * POST /api/v1/business-identity/abn  { "abn": "…" }
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

  const result = await lookupBusinessIdentityByAbn(abn, session.organisationId);
  const status = result.abr.ok ? 200 : result.abr.code === "not_configured" ? 503 : 422;

  return NextResponse.json(
    {
      data: {
        connector: "abr",
        method: "SearchByABNv202001",
        status: getAbrConnectorStatus(),
        configured: result.configured,
        guidEnvKeyPresent: abrGuidEnvKeyPresent(),
        identity: result.identity,
        profilePatch: result.profilePatch,
        abr: result.abr,
      },
    },
    { status },
  );
}
