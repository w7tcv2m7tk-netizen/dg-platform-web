import {
  getPersistedDreamscapeCustomerLink,
  upsertDreamscapeCustomerForOrg,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export const runtime = "nodejs";

/** GET /api/v1/infrastructure/customer — customer-safe provisioning state. */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "infrastructure.read");
  if (denied) return denied;

  const link = await getPersistedDreamscapeCustomerLink(session.organisationId);
  return NextResponse.json({ data: { connected: Boolean(link) } });
}

/** POST /api/v1/infrastructure/customer — provision from the active Business Profile. */
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
    return NextResponse.json({
      data: {
        connected: Boolean(link),
        message: "Infrastructure account is ready.",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "infrastructure_setup_failed",
          message: "Infrastructure setup could not be completed. Please try again.",
        },
      },
      { status: 502 },
    );
  }
}
