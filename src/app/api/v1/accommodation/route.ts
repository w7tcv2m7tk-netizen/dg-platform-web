import {
  buildAvailabilityFromNeon,
  createStayBookingGen2First,
  housekeepingBoardFromUnits,
  linkStayBookingExternalWpId,
  listAccommodationUnits,
  listStayBookings,
  organisationHasFlag,
  organisationUsesHousekeepingSot,
  organisationUsesUnitSot,
  stayBookingToWpRow,
  syncAccommodationUnitsFromWordPress,
  unitToWpProp,
  updateStayBooking,
  updateUnitHousekeeping,
} from "@dg/platform-core";
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
import { syncWordPressAccBookings, syncWordPressAccUnits } from "@/lib/wordpress-sync";

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
    if (source !== "wp" && (await organisationUsesUnitSot(session.organisationId))) {
      const stored = await listAccommodationUnits(session.organisationId);
      return NextResponse.json({
        data: stored.map(unitToWpProp),
        meta: {
          site: connector?.label ?? "Accommodation",
          source: "postgres",
          sot: true,
          emptyHint:
            stored.length === 0
              ? "No AccommodationUnit rows — POST action=sync_units"
              : undefined,
        },
      });
    }
    const units = await fetchWpAccommodationUnits(siteId, connector);
    if (!units.ok) {
      return NextResponse.json(
        { error: { code: units.code, message: units.message } },
        { status: 422 },
      );
    }
    return NextResponse.json({
      data: units.units,
      meta: { site: units.site, source: "wordpress", sot: false },
    });
  }

  if (resource === "availability") {
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const propertyIdRaw = searchParams.get("property_id") ?? searchParams.get("propertyId");
    const propertyId =
      propertyIdRaw && Number.isFinite(Number(propertyIdRaw))
        ? Number(propertyIdRaw)
        : undefined;

    if (source !== "wp" && (await organisationUsesUnitSot(session.organisationId))) {
      const avail = await buildAvailabilityFromNeon(session.organisationId, {
        from,
        to,
        propertyId,
      });
      return NextResponse.json({
        data: avail,
        meta: { source: "postgres", sot: true },
      });
    }

    const { fetchWpAccommodationAvailability } = await import("@/lib/dg-api");
    const avail = await fetchWpAccommodationAvailability({
      siteId,
      from,
      to,
      propertyId,
      connector,
    });
    if (!avail.ok) {
      return NextResponse.json(
        { error: { code: avail.code, message: avail.message } },
        { status: 422 },
      );
    }
    return NextResponse.json({
      data: {
        from: avail.from,
        to: avail.to,
        units: avail.units,
        total: avail.total,
      },
      meta: { site: avail.site, source: "wordpress", sot: false },
    });
  }

  if (resource === "bookings") {
    const limit = Number(searchParams.get("limit") ?? 50);

    // Debug / connector probe only — ops UI must not use this as SoT (WP-D-401).
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
        meta: {
          total: bookings.total,
          site: bookings.site,
          source: "wordpress",
          sot: false,
          note: "Live WordPress probe — StayBooking (postgres) is the read SoT",
        },
      });
    }

    const stored = await listStayBookings(session.organisationId, limit);
    return NextResponse.json({
      data: stored.map(stayBookingToWpRow),
      meta: {
        total: stored.length,
        source: "postgres",
        sot: true,
        emptyHint:
          stored.length === 0
            ? "No StayBooking rows yet — POST action=sync_wordpress or wait for WP dual-write webhook"
            : undefined,
      },
    });
  }

  if (resource === "housekeeping") {
    if (
      source !== "wp" &&
      (await organisationUsesHousekeepingSot(session.organisationId))
    ) {
      const stored = await listAccommodationUnits(session.organisationId);
      const board = housekeepingBoardFromUnits(stored);
      return NextResponse.json({
        data: {
          items: board.items,
          summary: board.summary,
          statuses: board.statuses,
        },
        meta: {
          site: connector?.label ?? "Accommodation",
          source: "postgres",
          sot: true,
          today: board.today,
        },
      });
    }
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
      meta: { site: board.site, source: "wordpress", sot: false },
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

  if (body.action === "sync_units") {
    const outcome = await syncWordPressAccUnits(session);
    if (!outcome.ok) {
      // Fall back to direct core sync if helper missing settings write
      const direct = await syncAccommodationUnitsFromWordPress(session.organisationId);
      if (!direct.ok) {
        return NextResponse.json(
          { error: { code: "sync_failed", message: outcome.message || direct.message } },
          { status: 422 },
        );
      }
      return NextResponse.json({ data: direct.result });
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

    const gen2First = await organisationHasFlag(
      session.organisationId,
      "acc.gen2_first_booking",
    );
    const usesUnits = await organisationUsesUnitSot(session.organisationId);

    // WP-D-403: when flag + units SoT, conflict-check Neon and create StayBooking first.
    if (gen2First && usesUnits) {
      const accommodationId =
        typeof payload.accommodation_id === "number"
          ? payload.accommodation_id
          : Number(payload.accommodation_id);
      const checkin = typeof payload.checkin === "string" ? payload.checkin : "";
      const checkout = typeof payload.checkout === "string" ? payload.checkout : "";
      const guestName =
        typeof payload.guest_name === "string"
          ? payload.guest_name
          : typeof payload.name === "string"
            ? payload.name
            : "";

      const native = await createStayBookingGen2First(session.organisationId, {
        guestName,
        email: typeof payload.email === "string" ? payload.email : undefined,
        phone: typeof payload.phone === "string" ? payload.phone : undefined,
        accommodationWpId: accommodationId,
        checkin,
        checkout,
        guests: typeof payload.guests === "number" ? payload.guests : undefined,
        nights: typeof payload.nights === "number" ? payload.nights : undefined,
        total: typeof payload.total === "number" ? payload.total : undefined,
        status: typeof payload.status === "string" ? payload.status : undefined,
        source: typeof payload.source === "string" ? payload.source : "gen2",
        message: typeof payload.message === "string" ? payload.message : undefined,
        ref: typeof payload.ref === "string" ? payload.ref : undefined,
        paid: typeof payload.paid === "string" ? payload.paid : undefined,
        paymentMethod:
          typeof payload.payment_method === "string" ? payload.payment_method : undefined,
        actorId: session.clerkUserId,
        force: payload.force === true || payload.allow_overlap === true,
      });

      if (!native.ok) {
        return NextResponse.json(
          {
            error: {
              code: native.code,
              message: native.message,
              conflict_dates: native.conflictDates,
            },
          },
          { status: 422 },
        );
      }

      // Dual-write WP calendar (CVH public/OTA stay safe).
      const wpResult = await createWpAccommodationBookings(
        { ...payload, force: true },
        connector,
      );
      let wpMirror: { ok: boolean; wpId?: number; message?: string } = { ok: false };
      if (wpResult.ok) {
        const createdRow = wpResult.data.created?.[0];
        if (createdRow?.id) {
          await linkStayBookingExternalWpId(
            session.organisationId,
            native.booking.id,
            createdRow.id,
          );
          wpMirror = { ok: true, wpId: createdRow.id };
        }
      } else {
        wpMirror = {
          ok: false,
          message: wpResult.message ?? "WP mirror failed — StayBooking kept in Neon",
        };
      }

      return NextResponse.json({
        data: {
          created: [stayBookingToWpRow(native.booking)],
          stayBooking: native.booking,
          wpMirror,
          writePath: "neon_then_wp",
          conflictChecked: native.conflictChecked,
        },
      });
    }

    // Default interim: WP calendar create, then dual-write StayBooking.
    const result = await createWpAccommodationBookings(payload, connector);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: {
            code: result.code,
            message:
              result.message ??
              "Could not create booking — deploy DG Platform plugin v10.65.2+ on CVH.",
          },
        },
        { status: 422 },
      );
    }

    const { upsertStayBookingFromWpRow } = await import("@dg/platform-core");
    const created = result.data.created ?? [];
    const mirror = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };
    for (const row of created) {
      try {
        const outcome = await upsertStayBookingFromWpRow(session.organisationId, row, {
          actorId: session.clerkUserId,
        });
        if (outcome === "created") mirror.created++;
        else if (outcome === "updated") mirror.updated++;
        else mirror.skipped++;
      } catch (err) {
        mirror.errors.push(
          `#${row.id}: ${err instanceof Error ? err.message : "StayBooking mirror failed"}`,
        );
      }
    }

    return NextResponse.json({
      data: {
        ...result.data,
        stayBookingMirror: mirror,
        writePath: "wp_then_neon",
      },
    });
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
    const usesUnits = await organisationUsesUnitSot(session.organisationId);
    const { upsertAccommodationUnitFromWpRow, wpUnitRowFromClientPatch } = await import(
      "@dg/platform-core"
    );

    if (usesUnits) {
      // Persist full unit patch into Neon (incl. OTA iCal URLs + listing IDs).
      for (const row of updates) {
        if (!row || typeof row !== "object") continue;
        const mapped = wpUnitPropFromClientPatch(row as Record<string, unknown>);
        if (!mapped) continue;
        await upsertAccommodationUnitFromWpRow(session.organisationId, mapped).catch(
          () => null,
        );
      }
    }

    const result = await patchWpAccommodationUnits(updates, connector);
    if (!result.ok) {
      return NextResponse.json(
        { error: { code: result.code, message: result.message } },
        { status: 422 },
      );
    }

    // Reconcile Neon from WordPress authoritative rows after mirror.
    if (usesUnits && Array.isArray(result.data?.updated)) {
      for (const row of result.data.updated) {
        if (!row || typeof row !== "object") continue;
        const mapped = wpUnitPropFromClientPatch(row as Record<string, unknown>);
        if (!mapped) continue;
        // WP format_property always returns these — force write-through even if empty.
        const full = row as Record<string, unknown>;
        await upsertAccommodationUnitFromWpRow(session.organisationId, {
          ...mapped,
          airbnb_ical_url:
            typeof full.airbnb_ical_url === "string" ? full.airbnb_ical_url : mapped.airbnb_ical_url,
          bookingcom_ical_url:
            typeof full.bookingcom_ical_url === "string"
              ? full.bookingcom_ical_url
              : mapped.bookingcom_ical_url,
          ical_export_url:
            typeof full.ical_export_url === "string"
              ? full.ical_export_url
              : mapped.ical_export_url,
          airbnb_id: typeof full.airbnb_id === "string" ? full.airbnb_id : mapped.airbnb_id,
          bookingcom_id:
            typeof full.bookingcom_id === "string" ? full.bookingcom_id : mapped.bookingcom_id,
        }).catch(() => null);
      }
    }

    return NextResponse.json({
      data: { ...result.data, sot: usesUnits ? "neon_then_wp" : "wordpress" },
    });
  }

  if (resource === "bookings") {
    const result = await patchWpAccommodationBookings(updates, connector);
    if (!result.ok) {
      return NextResponse.json(
        { error: { code: result.code, message: result.message } },
        { status: 422 },
      );
    }

    // Mirror into Postgres StayBooking when present (incl. payment metadata).
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
        paid: typeof patch.paid === "string" ? patch.paid : undefined,
        paymentMethod:
          typeof patch.payment_method === "string" ? patch.payment_method : undefined,
        source: typeof patch.source === "string" ? patch.source : undefined,
        guests: typeof patch.guests === "number" ? patch.guests : undefined,
        nights: typeof patch.nights === "number" ? patch.nights : undefined,
        message: typeof patch.message === "string" ? patch.message : undefined,
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

  // Default: housekeeping — Neon SoT when units/HK flag on (WP-D-404).
  const hkSot = await organisationUsesHousekeepingSot(session.organisationId);
  if (hkSot) {
    type HkPatch = {
      property_id?: number;
      id?: number;
      platform_id?: string;
      status: string;
      notes?: string;
    };
    const typed: HkPatch[] = [];
    for (const raw of updates) {
      if (!raw || typeof raw !== "object") continue;
      const u = raw as Record<string, unknown>;
      if (typeof u.status !== "string") continue;
      typed.push({
        property_id: typeof u.property_id === "number" ? u.property_id : undefined,
        id: typeof u.id === "number" ? u.id : undefined,
        platform_id: typeof u.platform_id === "string" ? u.platform_id : undefined,
        status: u.status,
        notes: typeof u.notes === "string" ? u.notes : undefined,
      });
    }
    const neon = await updateUnitHousekeeping(session.organisationId, typed);
    const mirror = await patchWpAccommodationHousekeeping(
      typed.map((u: HkPatch) => ({
        property_id: u.property_id ?? u.id ?? 0,
        status: u.status,
        notes: u.notes,
      })),
      connector,
    ).catch(() => ({ ok: false as const, code: "mirror_failed", message: "WP mirror failed" }));

    return NextResponse.json({
      data: {
        ok: true,
        updated: neon.updated,
        count: neon.count,
        writePath: "neon_then_wp",
        wpMirror: mirror.ok
          ? { ok: true, ...(typeof mirror.data === "object" ? mirror.data : {}) }
          : { ok: false, message: "message" in mirror ? mirror.message : "WP mirror failed" },
      },
    });
  }

  const result = await patchWpAccommodationHousekeeping(updates, connector);
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status: 422 },
    );
  }

  return NextResponse.json({ data: { ...result.data, writePath: "wordpress" } });
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
