import {
  abrCredentialsConfigured,
  abrGuidEnvKeyPresent,
  getAbrConnectorStatus,
  lookupBusinessIdentityByAcn,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/business-identity/acn?acn=…
 * Auth-protected ABR SearchByASICv201408 → Business Identity.
 * Never returns the authentication GUID.
 */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const acn = new URL(req.url).searchParams.get("acn")?.trim() ?? "";
  if (!acn) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request",
          message: "Query param acn is required",
        },
        data: {
          configured: abrCredentialsConfigured(),
          guidEnvKeyPresent: abrGuidEnvKeyPresent(),
        },
      },
      { status: 400 },
    );
  }

  const result = await lookupBusinessIdentityByAcn(acn, session.organisationId);
  const status = result.abr.ok ? 200 : result.abr.code === "not_configured" ? 503 : 422;

  return NextResponse.json(
    {
      data: {
        connector: "abr",
        method: "SearchByASICv201408",
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

/**
 * POST /api/v1/business-identity/acn  { "acn": "…" }
 */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  let body: { acn?: string };
  try {
    body = (await req.json()) as { acn?: string };
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const acn = body.acn?.trim() ?? "";
  if (!acn) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Body field acn is required" } },
      { status: 400 },
    );
  }

  const result = await lookupBusinessIdentityByAcn(acn, session.organisationId);
  const status = result.abr.ok ? 200 : result.abr.code === "not_configured" ? 503 : 422;

  return NextResponse.json(
    {
      data: {
        connector: "abr",
        method: "SearchByASICv201408",
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
