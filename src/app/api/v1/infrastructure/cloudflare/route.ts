import {
  CloudflareApiError,
  InfrastructureNotConfiguredError,
  getCloudflareInfrastructureOverview,
  hasPlatformAuthority,
  purgeCloudflareCache,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export const runtime = "nodejs";

function requireCloudflareOperator(session: {
  organisationId: string;
  role?: string | null;
  clerkUserId?: string | null;
}) {
  if (
    hasPlatformAuthority({
      organisationId: session.organisationId,
      role: session.role,
      principalId: session.clerkUserId,
    })
  ) {
    return null;
  }

  return NextResponse.json(
    { error: { code: "forbidden", message: "Platform operator access required." } },
    { status: 403 },
  );
}

/** GET /api/v1/infrastructure/cloudflare — platform zone status + analytics */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "infrastructure.read");
  if (denied) return denied;
  const operatorDenied = requireCloudflareOperator(session);
  if (operatorDenied) return operatorDenied;

  const overview = await getCloudflareInfrastructureOverview();
  return NextResponse.json({ data: { overview } });
}

/**
 * POST /api/v1/infrastructure/cloudflare
 * Body: { action: "purge_all" | "purge_urls", urls?: string[] }
 */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "infrastructure.write");
  if (denied) return denied;
  const operatorDenied = requireCloudflareOperator(session);
  if (operatorDenied) return operatorDenied;

  const body = (await req.json().catch(() => null)) as {
    action?: string;
    urls?: string[];
  } | null;

  const action = body?.action?.trim();
  if (!action) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "action is required (purge_all | purge_urls)",
        },
      },
      { status: 400 },
    );
  }

  try {
    if (action === "purge_all") {
      const result = await purgeCloudflareCache({ everything: true });
      return NextResponse.json({ data: { action, ...result } });
    }

    if (action === "purge_urls") {
      const urls = Array.isArray(body?.urls) ? body.urls : [];
      if (!urls.length) {
        return NextResponse.json(
          {
            error: {
              code: "validation_error",
              message: "urls array is required for purge_urls",
            },
          },
          { status: 400 },
        );
      }
      const result = await purgeCloudflareCache({ urls });
      return NextResponse.json({ data: { action, ...result } });
    }

    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "action must be purge_all | purge_urls",
        },
      },
      { status: 400 },
    );
  } catch (err) {
    if (err instanceof InfrastructureNotConfiguredError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: 503 },
      );
    }
    if (err instanceof CloudflareApiError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: 502 },
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "provider_error",
          message: err instanceof Error ? err.message : "Cloudflare action failed",
        },
      },
      { status: 502 },
    );
  }
}
