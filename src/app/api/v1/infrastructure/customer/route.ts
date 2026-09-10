import {
  getPersistedDreamscapeCustomerLink,
  upsertDreamscapeCustomerForOrg,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export const runtime = "nodejs";

/** GET /api/v1/infrastructure/customer */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "infrastructure.read");
  if (denied) return denied;
  const link = await getPersistedDreamscapeCustomerLink(session.organisationId);
  return NextResponse.json({ data: link });
}

/** POST /api/v1/infrastructure/customer — upsert from Business Profile */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "infrastructure.write");
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { force?: boolean } | null;
  try {
    const link = await upsertDreamscapeCustomerForOrg({
      organisationId: session.organisationId,
      force: body?.force === true,
    });
    return NextResponse.json({ data: link });
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "provider_error",
          message: err instanceof Error ? err.message : "Customer upsert failed",
        },
      },
      { status: 502 },
    );
  }
}
