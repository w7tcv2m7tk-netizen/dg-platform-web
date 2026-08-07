import { listStayBookings, stayBookingToWpRow, updateStayBooking } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { accommodationConnectorForSession } from "@/lib/accommodation-connector";
import {
  fetchWpAccommodationBookings,
  fetchWpAccommodationHousekeeping,
  fetchWpAccommodationSummary,
  fetchWpAccommodationUnits,
  listWpAccommodationSites,
  createWpAccommodationBookings,
  deleteWpAccommodationBookings,
  patchWpAccommodationBookings,
  patchWpAccommodationGuests,
  patchWpAccommodationHousekeeping,
  patchWpAccommodationUnits,
  syncWpAccommodationOtaCalendars,
} from "@/lib/dg-api";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
import { syncWordPressAccBookings } from "@/lib/wordpress-sync";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");
  const resource = searchParams.get("resource") ?? "summary";
  const source = searchParams.get("source");
  const connector = await accommodationConnectorForSession(session.organisationId);

  if (resource === "sites") {
    return NextResponse.json({ data: listWpAccommodationSites() });
  }

  if (resource === "units" || resource === "properties") {
    const units = await fetchWpAccommodationUnits(siteId, connector);
    if (!units.ok) {
      return NextResponse.json(
        { error: { code: units.code, message: units.message } },
        { status: 422 },
      );
    }
    return NextResponse.json({ data: units.units, meta: { site: units.site } });
  }

  if (resource === "bookings") {
    const limit = Number(searchParams.get("limit") ?? 50);

    if (source === "wp") {
      const bookings = await fetchWpAccommodationBookings(siteId, limit, connector);
      if (!bookings.ok) {
        return NextResponse.json(
          { error: { code: bookings.code, message: bookings.message } },
          { status: 422 },
        );
      }
      return NextResponse.json({
        data: bookings.bookings,
        meta: { total: bookings.total, site: bookings.site, source: "wordpress" },
      });
    }

    const stored = await listStayBookings(session.organisationId, limit);
    if (stored.length > 0) {
      return NextResponse.json({
        data: stored.map(stayBookingToWpRow),
        meta: { total: stored.length, source: "postgres" },
      });
    }

    const bookings = await fetchWpAccommodationBookings(siteId, limit, connector);
    if (!bookings.ok) {
      return NextResponse.json(
        { error: { code: bookings.code, message: bookings.message } },
        { status: 422 },
      );
    }
    return NextResponse.json({
      data: bookings.bookings,
      meta: { total: bookings.total, site: bookings.site, source: "wordpress" },
    });
  }

  if (resource === "housekeeping") {
    const board = await fetchWpAccommodationHousekeeping(siteId, connector);
    if (!board.ok) {
      return NextResponse.json(
        { error: { code: board.code, message: board.message } },
        { status: 422 },
      );
    }
    return NextResponse.json({
      data: {
        items: board.items,
        summary: board.summary,
        statuses: board.statuses,
      },
      meta: { site: board.site },
    });
  }

  const summary = await fetchWpAccommodationSummary(siteId, 30, connector);
  if (!summary.ok) {
    return NextResponse.json(
      { error: { code: summary.code, message: summary.message } },
      { status: 422 },
    );
  }

  return NextResponse.json({ data: summary.data });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));

  if (body.action === "sync_wordpress") {
    const outcome = await syncWordPressAccBookings(session);
    if (!outcome.ok) {
      return NextResponse.json(
        { error: { code: "sync_failed", message: outcome.message } },
        { status: 422 },
      );
    }
    return NextResponse.json({ data: outcome.result });
  }

  if (body.action === "sync_ota") {
    const connector = await accommodationConnectorForSession(session.organisationId);
    const result = await syncWpAccommodationOtaCalendars(connector, {
      propertyId: typeof body.propertyId === "number" ? body.propertyId : undefined,
      source: body.source === "airbnb" || body.source === "bookingcom" ? body.source : "all",
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: { code: result.code, message: result.message } },
        { status: 422 },
      );
    }
    return NextResponse.json({ data: result.data });
  }

  if (body.action === "create_booking") {
    const connector = await accommodationConnectorForSession(session.organisationId);
    const payload: Record<string, unknown> =
      body.booking && typeof body.booking === "object"
        ? (body.booking as Record<string, unknown>)
        : (() => {
            const { action: _action, ...rest } = body as Record<string, unknown>;
            return rest;
          })();

    const result = await createWpAccommodationBookings(payload, connector);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: {
            code: result.code,
            message:
              result.message ??
              "Could not create booking — deploy DG Platform plugin v10.65.0+ on CVH.",
          },
        },
        { status: 422 },
      );
    }

    // Mirror into Postgres StayBooking.
    const { syncAccBookingsFromWordPress } = await import("@dg/platform-core");
    const created = result.data.created ?? [];
    if (created.length) {
      await syncAccBookingsFromWordPress({
        organisationId: session.organisationId,
        bookings: created,
        actorId: session.clerkUserId,
      }).catch(() => null);
    }

    return NextResponse.json({ data: result.data });
  }

  if (body.action === "update_guest_profile") {
    const contactId =
      typeof body.contactId === "string"
        ? body.contactId
        : typeof body.contact_id === "string"
          ? body.contact_id
          : "";
    if (!contactId) {
      return NextResponse.json(
        { error: { code: "missing_contact", message: "contactId is required" } },
        { status: 400 },
      );
    }

    const connector = await accommodationConnectorForSession(session.organisationId);
    const { updateAccommodationGuestProfile } = await import("@dg/platform-core");
    const updated = await updateAccommodationGuestProfile(
      session.organisationId,
      contactId,
      {
        vip: typeof body.vip === "boolean" ? body.vip : undefined,
        marketingConsent:
          body.marketingConsent === null
            ? null
            : typeof body.marketingConsent === "boolean"
              ? body.marketingConsent
              : undefined,
        preferences: typeof body.preferences === "string" ? body.preferences : undefined,
        specialRequests:
          typeof body.specialRequests === "string" ? body.specialRequests : undefined,
        guestNotes: typeof body.guestNotes === "string" ? body.guestNotes : undefined,
        favouriteUnit:
          typeof body.favouriteUnit === "string" ? body.favouriteUnit : undefined,
        displayName: typeof body.displayName === "string" ? body.displayName : undefined,
        email: typeof body.email === "string" ? body.email : undefined,
        phone: typeof body.phone === "string" ? body.phone : undefined,
        syncWp: {
          patchWp: (updates) => patchWpAccommodationGuests(updates, connector),
        },
      },
    );

    if (!updated) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Guest profile not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: updated });
  }

  return NextResponse.json(
    { error: { code: "unknown_action", message: "Unsupported action" } },
    { status: 400 },
  );
}

export async function PATCH(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));
  const resource = (body.resource as string | undefined) ?? "housekeeping";
  const updates = Array.isArray(body.updates) ? body.updates : [];
  if (!updates.length) {
    return NextResponse.json(
      { error: { code: "missing_updates", message: "updates[] is required" } },
      { status: 400 },
    );
  }

  const connector = await accommodationConnectorForSession(session.organisationId);

  if (resource === "units" || resource === "properties") {
    const result = await patchWpAccommodationUnits(updates, connector);
    if (!result.ok) {
      return NextResponse.json(
        { error: { code: result.code, message: result.message } },
        { status: 422 },
      );
    }
    return NextResponse.json({ data: result.data });
  }

  if (resource === "bookings") {
    const result = await patchWpAccommodationBookings(updates, connector);
    if (!result.ok) {
      return NextResponse.json(
        { error: { code: result.code, message: result.message } },
        { status: 422 },
      );
    }

    // Mirror into Postgres StayBooking when present.
    for (const row of updates) {
      if (!row || typeof row !== "object") continue;
      const patch = row as Record<string, unknown>;
      await updateStayBooking(session.organisationId, {
        platformId: typeof patch.platform_id === "string" ? patch.platform_id : undefined,
        externalWpId: typeof patch.id === "number" ? patch.id : undefined,
        guestName: typeof patch.guest_name === "string" ? patch.guest_name : undefined,
        email: typeof patch.email === "string" ? patch.email : undefined,
        phone: typeof patch.phone === "string" ? patch.phone : undefined,
        checkin: typeof patch.checkin === "string" ? patch.checkin : undefined,
        checkout: typeof patch.checkout === "string" ? patch.checkout : undefined,
        status: typeof patch.status === "string" ? patch.status : undefined,
        total: typeof patch.total === "number" ? patch.total : undefined,
        ref: typeof patch.ref === "string" ? patch.ref : undefined,
        accommodationWpId:
          typeof patch.accommodation_id === "number" ? patch.accommodation_id : undefined,
        accommodationName:
          typeof patch.accommodation === "string" ? patch.accommodation : undefined,
      }).catch(() => null);
    }

    return NextResponse.json({ data: result.data });
  }

  if (resource === "guests") {
    const result = await patchWpAccommodationGuests(updates, connector);
    if (!result.ok) {
      return NextResponse.json(
        { error: { code: result.code, message: result.message } },
        { status: 422 },
      );
    }
    // Keep Gen 2 Contact + AccommodationGuestProfile aligned with connector edits.
    const { upsertGuestFromWpRow } = await import("@dg/platform-core");
    for (const row of updates) {
      if (!row || typeof row !== "object") continue;
      const patch = row as Record<string, unknown>;
      const id = typeof patch.id === "number" ? patch.id : Number(patch.id);
      if (!Number.isFinite(id)) continue;
      await upsertGuestFromWpRow(
        session.organisationId,
        {
          id,
          name: typeof patch.name === "string" ? patch.name : undefined,
          email: typeof patch.email === "string" ? patch.email : undefined,
          phone: typeof patch.phone === "string" ? patch.phone : undefined,
          vip: typeof patch.vip === "boolean" ? patch.vip : undefined,
          notes: typeof patch.notes === "string" ? patch.notes : undefined,
          tags: typeof patch.tags === "string" ? patch.tags : undefined,
          address: typeof patch.address === "string" ? patch.address : undefined,
          source: typeof patch.source === "string" ? patch.source : undefined,
          contact_id: typeof patch.contact_id === "string" ? patch.contact_id : null,
        },
        { actorId: session.clerkUserId },
      ).catch(() => null);
    }
    return NextResponse.json({ data: result.data });
  }

  // Default: housekeeping (existing behaviour).
  const result = await patchWpAccommodationHousekeeping(updates, connector);
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status: 422 },
    );
  }

  return NextResponse.json({ data: result.data });
}

export async function DELETE(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));
  const resource = (body.resource as string | undefined) ?? "bookings";

  if (resource !== "bookings") {
    return NextResponse.json(
      { error: { code: "unsupported_resource", message: "DELETE only supports resource=bookings" } },
      { status: 400 },
    );
  }

  const ids: number[] = [];
  if (Array.isArray(body.ids)) {
    for (const raw of body.ids) {
      const id = typeof raw === "number" ? raw : Number(raw);
      if (Number.isFinite(id) && id > 0) ids.push(id);
    }
  } else if (typeof body.id === "number" && body.id > 0) {
    ids.push(body.id);
  }

  if (!ids.length) {
    return NextResponse.json(
      { error: { code: "missing_ids", message: "ids[] is required" } },
      { status: 400 },
    );
  }

  const connector = await accommodationConnectorForSession(session.organisationId);
  const result = await deleteWpAccommodationBookings(ids, connector);
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status: 422 },
    );
  }

  // Mirror soft-cancel into Postgres StayBooking when present.
  for (const id of ids) {
    await updateStayBooking(session.organisationId, {
      externalWpId: id,
      status: "cancelled",
    }).catch(() => null);
  }

  return NextResponse.json({ data: result.data });
}
