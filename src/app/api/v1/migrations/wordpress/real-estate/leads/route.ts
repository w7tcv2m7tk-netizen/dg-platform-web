import { NextResponse } from "next/server";

import { isNextResponse, requirePermission, requirePlatformAuth } from "@/lib/platform-api";
import { syncWordPressBuyerLeads, syncWordPressVendorLeads } from "@/lib/wordpress-sync";

type LeadImportResource = "vendor_leads" | "buyer_leads";

/**
 * Explicit legacy WordPress → Gen 2 lead migration boundary.
 *
 * Normal CRM and Real Estate runtime must never invoke WordPress imports or use
 * WordPress as a fallback authority. This route exists only for deliberate
 * legacy onboarding/cutover work by users who can manage organisation settings.
 */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requirePermission(session, {
    module: "settings",
    action: "manage",
    scope: "organisation",
  });
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const resource = body.resource as LeadImportResource | undefined;

  const runner =
    resource === "vendor_leads"
      ? () => syncWordPressVendorLeads(session)
      : resource === "buyer_leads"
        ? () => syncWordPressBuyerLeads(session)
        : null;

  if (!runner) {
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

  const outcome = await runner();
  if (!outcome.ok) {
    return NextResponse.json(
      { error: { code: "migration_import_failed", message: outcome.message } },
      { status: 422 },
    );
  }

  return NextResponse.json({
    data: {
      direction: "wordpress_to_gen2",
      migrationOnly: true,
      resource,
      result: outcome.result,
    },
  });
}
