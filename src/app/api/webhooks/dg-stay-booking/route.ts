import {
  resolveOrganisationIdForStaySync,
  syncWpBookingWithPlatformAuthority,
  type WpAccBookingRow,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import {
  resolveWebhookOrganisation,
  verifyWebhookSecret,
  webhookAllowedOrganisationIds,
} from "@/lib/webhook-auth";

function asBookingRow(raw: unknown): WpAccBookingRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "number" ? row.id : Number(row.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    platform_id:
      typeof row.platform_id === "string" && row.platform_id.trim()
        ? row.platform_id.trim()
        : undefined,
    ref: typeof row.ref === "string" ? row.ref : undefined,
    guest_name:
      typeof row.guest_name === "string"
        ? row.guest_name
        : typeof row.name === "string"
          ? row.name
          : undefined,
    email: typeof row.email === "string" ? row.email : undefined,
    phone: typeof row.phone === "string" ? row.phone : undefined,
    accommodation:
      typeof row.accommodation === "string"
        ? row.accommodation
        : typeof row.accommodation_name === "string"
          ? row.accommodation_name
          : undefined,
    accommodation_id:
      typeof row.accommodation_id === "number"
        ? row.accommodation_id
        : Number.isFinite(Number(row.accommodation_id))
          ? Number(row.accommodation_id)
          : undefined,
    checkin: typeof row.checkin === "string" ? row.checkin : undefined,
    checkout: typeof row.checkout === "string" ? row.checkout : undefined,
    nights: typeof row.nights === "number" ? row.nights : undefined,
    guests: typeof row.guests === "number" ? row.guests : undefined,
    status: typeof row.status === "string" ? row.status : undefined,
    source: typeof row.source === "string" ? row.source : undefined,
    total: typeof row.total === "number" ? row.total : undefined,
    paid: typeof row.paid === "string" ? row.paid : null,
    payment_method:
      typeof row.payment_method === "string" ? row.payment_method : null,
    message: typeof row.message === "string" ? row.message : undefined,
  };
}

/**
 * WP → Gen 2 booking projection. StayBooking is the canonical identity and
 * commercial record; WordPress remains a connector and migration source.
 */
export async function POST(req: Request) {
  const auth = verifyWebhookSecret(req, [
    "DG_STAY_BOOKING_WEBHOOK_SECRET",
    // Legacy fallback during WP cutover — remove once WordPress is updated.
    "DG_WP_ACCOMMODATION_API_KEY",
  ] as const);
  if (!auth.ok) {
    return NextResponse.json(
      { error: { code: auth.code, message: auth.message } },
      { status: auth.code === "not_configured" ? 503 : 401 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: { code: "database_not_configured", message: "DATABASE_URL not set" } },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "JSON body required" } },
      { status: 422 },
    );
  }

  const requestedOrganisationId =
    typeof body.organisationId === "string"
      ? body.organisationId
      : typeof body.organisation_id === "string"
        ? body.organisation_id
        : undefined;

  // Resolve server-side first; the body value may only confirm that answer.
  const serverResolved = await resolveOrganisationIdForStaySync({
    siteUrl:
      typeof body.siteUrl === "string"
        ? body.siteUrl
        : typeof body.site_url === "string"
          ? body.site_url
          : undefined,
  });

  const target = resolveWebhookOrganisation({
    requested: requestedOrganisationId,
    resolved: serverResolved,
    allowed: webhookAllowedOrganisationIds("DG_STAY_BOOKING_WEBHOOK_ORG_IDS"),
  });

  if (!target.ok) {
    return NextResponse.json(
      { error: { code: target.code, message: target.message } },
      { status: target.code === "forbidden" ? 403 : 422 },
    );
  }

  const organisationId = target.organisationId;

  const rows: WpAccBookingRow[] = [];
  if (Array.isArray(body.bookings)) {
    for (const raw of body.bookings) {
      const row = asBookingRow(raw);
      if (row) rows.push(row);
    }
  } else {
    const single = asBookingRow(body.booking ?? body);
    if (single) rows.push(single);
  }

  if (!rows.length) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "booking{id,…} or bookings[] required",
        },
      },
      { status: 422 },
    );
  }

  const result = {
    created: 0,
    updated: 0,
    skipped: 0,
    identities: [] as Array<{ wp_id: number; platform_id: string }>,
  };

  for (const row of rows) {
    try {
      const synced = await syncWpBookingWithPlatformAuthority(organisationId, row);
      if (synced.outcome === "created") result.created++;
      else if (synced.outcome === "updated") result.updated++;
      else result.skipped++;

      if (row.id && synced.platformId) {
        result.identities.push({ wp_id: row.id, platform_id: synced.platformId });
      }
    } catch (err) {
      return NextResponse.json(
        {
          error: {
            code: "booking_authority_rejected",
            message: err instanceof Error ? err.message : "StayBooking authority sync failed",
            wp_id: row.id ?? null,
          },
        },
        { status: 409 },
      );
    }
  }

  return NextResponse.json({
    data: {
      organisationId,
      ...result,
      sot: "StayBooking",
    },
  });
}
