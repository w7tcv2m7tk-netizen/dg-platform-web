import { submitPublicPlatformDiscovery } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { spamGuardResponse } from "@/lib/public-form-spam-response";

/**
 * Public AI Platform Discovery form on digitalgate.com.au/discover/
 * Replaces WP `/wp-json/digitalgate/v1/discovery`.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json(
      { success: false, message: "JSON body required" },
      { status: 422 },
    );
  }

  const blocked = spamGuardResponse(req, body, "discovery");
  if (blocked) return blocked;

  const result = await submitPublicPlatformDiscovery({
    ...body,
    siteSlug: typeof body.siteSlug === "string" ? body.siteSlug : "digitalgate",
  });

  if (!result.ok) {
    return NextResponse.json(
      { success: false, message: result.message, code: result.code },
      { status: result.code === "validation_error" ? 422 : 500 },
    );
  }

  const { ok: _ok, ...payload } = result;
  return NextResponse.json(payload);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
