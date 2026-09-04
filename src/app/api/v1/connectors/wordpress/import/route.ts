import { NextResponse } from "next/server";

import { isNextResponse, requirePermission, requirePlatformAuth } from "@/lib/platform-api";
import {
  syncWordPressBookings,
  syncWordPressBuyerLeads,
  syncWordPressProperties,
  syncWordPressVendorLeads,
} from "@/lib/wordpress-sync";

type ImportResource = "vendor_leads" | "buyer_leads" | "bookings" | "properties";

/**
 * Explicit legacy migration endpoint.
 *
 * WordPress is a one-way onboarding source only. Normal Gen 2 CRM/RE runtime must
 * never call this endpoint implicitly or use it as a fallback read/write path.
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
  const resource = body.resource as ImportResource | undefined;

  const runners: Record<
    ImportResource,
    () => ReturnType<typeof syncWordPressVendorLeads>
  > = {
    vendor_leads: () => syncWordPressVendorLeads(session),
    buyer_leads: () => syncWordPressBuyerLeads(session),
    bookings: () => syncWordPressBookings(session),
    properties: () => syncWordPressProperties(session),
  };

  if (!resource || !(resource in runners)) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "resource must be vendor_leads, buyer_leads, bookings, or properties",
        },
      },
      { status: 422 },
    );
  }

  const outcome = await runners[resource]();
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
