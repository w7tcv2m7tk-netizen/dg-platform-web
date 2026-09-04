import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
import {
  syncWordPressBuyerLeads,
  syncWordPressVendorLeads,
} from "@/lib/wordpress-sync";

type LeadImportResource = "vendor_leads" | "buyer_leads";

/**
 * Explicit legacy WordPress → Gen 2 lead migration boundary.
 * This endpoint is not part of the native CRM / Real Estate runtime surface.
 */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  if (session.role !== "owner" && session.role !== "admin" && session.role !== "dg:staff") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Organisation admin access required" } },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const resource = body.resource as LeadImportResource | undefined;

  if (resource !== "vendor_leads" && resource !== "buyer_leads") {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "resource must be vendor_leads or buyer_leads",
        },
      },
      { status: 422 },
    );
  }

  const outcome =
    resource === "buyer_leads"
      ? await syncWordPressBuyerLeads(session)
      : await syncWordPressVendorLeads(session);

  if (!outcome.ok) {
    return NextResponse.json(
      {
        error: {
          code: "wordpress_migration_failed",
          message: outcome.message,
        },
      },
      { status: 422 },
    );
  }

  return NextResponse.json({
    data: {
      resource,
      result: outcome.result,
    },
    boundary: "wordpress_to_platform_only",
  });
}
