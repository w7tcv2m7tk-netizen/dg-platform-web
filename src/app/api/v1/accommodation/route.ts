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
  sortAccommodationUnitsByDisplayOrder,
  stayBookingToWpRow,
  syncAccommodationUnitsFromWordPress,
  unitToWpProp,
  updateStayBooking,
  updateUnitHousekeeping,
  upsertStayBookingFromWpRow,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { accommodationConnectorForSession } from "@/lib/accommodation-connector";
import {
  fetchWpAccommodationAvailability,
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
      data: sortAccommodationUnitsByDisplayOrder(units.units),
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
    const orderedUnits = sortAccommodationUnitsByDisplayOrder(avail.units);
    return NextResponse.json({
      data: {
        from: avail.from,
        to: avail.to,
        units: orderedUnits,
        total: orderedUnits.length,
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
        items: sortAccommodationUnitsByDisplayOrder(board.items),
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

    // Prefer availability-window pull (same WP query the CVH calendar uses) so OTA
    // stays in the visible range always land in Neon StayBooking.
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const from =
      typeof body.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.from)
        ? body.from
        : iso(today);
    const toDate = new Date(today);
    toDate.setDate(toDate.getDate() + 90);
    const to =
      typeof body.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.to)
        ? body.to
        : iso(toDate);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    const availability = await fetchWpAccommodationAvailability({
      from,
      to,
      propertyId: typeof body.propertyId === "number" ? body.propertyId : undefined,
      connector,
    });

    if (availability.ok) {
      const seen = new Set<number>();
      for (const unit of availability.units) {
        for (const booking of unit.bookings ?? []) {
          if (!booking?.id || seen.has(booking.id)) continue;
          seen.add(booking.id);
          // Ensure accommodation_id is set for calendar unit matching.
          const row = {
            ...booking,
            accommodation_id: booking.accommodation_id ?? unit.id,
            accommodation: booking.accommodation ?? unit.title,
          };
          try {
            const outcome = await upsertStayBookingFromWpRow(session.organisationId, row, {
              actorId: session.clerkUserId,
            });
            if (outcome === "created") created++;
            else if (outcome === "updated") updated++;
            else skipped++;
          } catch (err) {
            errors.push(
              `Booking #${booking.id}: ${err instanceof Error ? err.message : "sync failed"}`,
            );
          }
        }
      }

      return NextResponse.json({
        data: {
          ...result.data,
          neon: { created, updated, skipped, errors, from, to, source: "availability" },
          message: `${result.data?.message ?? "OTA calendars synced"} · ${created} created, ${updated} updated on platform (${from}→${to})`,
        },
      });
    }

    // Fallback: list bookings pull (host-safe CVH key).
    const neonSync = await syncWordPressAccBookings(session);
    if (neonSync.ok) {
      const neonResult = neonSync.result;
      return NextResponse.json({
        data: {
          ...result.data,
          neon: { ...neonResult, source: "bookings_list", availabilityError: availability.message },
          message: `${result.data?.message ?? "OTA calendars synced"} · ${neonResult.created} created, ${neonResult.updated} updated on platform`,
        },
      });
    }
    return NextResponse.json({
      data: {
        ...result.data,
        neon: {
          ok: false,
          message: neonSync.message,
          availabilityError: availability.message,
        },
        message: `OTA synced on WordPress — platform pull failed: ${neonSync.message}`,
      },
    });
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
    if (usesUnits) {
      const { upsertAccommodationUnitFromWpRow } = await import("@dg/platform-core");
      // Persist full unit patches into Neon (incl. OTA URLs + listing IDs), then mirror to WP.
      for (const row of updates) {
        if (!row || typeof row !== "object") continue;
        const patch = row as Record<string, unknown>;
        const id =
          typeof patch.id === "number"
            ? patch.id
            : typeof patch.property_id === "number"
              ? patch.property_id
              : Number(patch.id ?? patch.property_id);
        if (!Number.isFinite(id)) continue;
        await upsertAccommodationUnitFromWpRow(session.organisationId, {
          id,
          title: typeof patch.title === "string" ? patch.title : undefined,
          listing_status:
            typeof patch.listing_status === "string" ? patch.listing_status : undefined,
          weekday_rate:
            typeof patch.weekday_rate === "number" ? patch.weekday_rate : undefined,
          weekend_rate:
            typeof patch.weekend_rate === "number" ? patch.weekend_rate : undefined,
          cleaning_fee:
            typeof patch.cleaning_fee === "number" ? patch.cleaning_fee : undefined,
          housekeeping_status:
            typeof patch.housekeeping_status === "string"
              ? patch.housekeeping_status
              : undefined,
          housekeeping_notes:
            typeof patch.housekeeping_notes === "string"
              ? patch.housekeeping_notes
              : undefined,
          manual_blocked_dates: Array.isArray(patch.manual_blocked_dates)
            ? (patch.manual_blocked_dates as string[])
            : undefined,
          airbnb_ical_url:
            typeof patch.airbnb_ical_url === "string" ? patch.airbnb_ical_url : undefined,
          bookingcom_ical_url:
            typeof patch.bookingcom_ical_url === "string"
              ? patch.bookingcom_ical_url
              : undefined,
          airbnb_id: typeof patch.airbnb_id === "string" ? patch.airbnb_id : undefined,
          bookingcom_id:
            typeof patch.bookingcom_id === "string" ? patch.bookingcom_id : undefined,
          description:
            typeof patch.description === "string" ? patch.description : undefined,
          address: typeof patch.address === "string" ? patch.address : undefined,
          sleeps: typeof patch.sleeps === "number" ? patch.sleeps : undefined,
          bedrooms: typeof patch.bedrooms === "number" ? patch.bedrooms : undefined,
          bathrooms: typeof patch.bathrooms === "number" ? patch.bathrooms : undefined,
          max_guests: typeof patch.max_guests === "number" ? patch.max_guests : undefined,
          min_nights: typeof patch.min_nights === "number" ? patch.min_nights : undefined,
          checkin_time:
            typeof patch.checkin_time === "string" ? patch.checkin_time : undefined,
          checkout_time:
            typeof patch.checkout_time === "string" ? patch.checkout_time : undefined,
          features:
            patch.features && typeof patch.features === "object"
              ? (patch.features as Record<string, 0 | 1 | boolean>)
              : undefined,
        }).catch(() => null);
      }
    }
    const result = await patchWpAccommodationUnits(updates, connector);
    if (!result.ok) {
      return NextResponse.json(
        { error: { code: result.code, message: result.message } },
        { status: 422 },
      );
    }
    // Prefer WP response as SoT for OTA export URLs / confirmed meta after mirror.
    if (usesUnits && Array.isArray(result.data?.updated)) {
      const { upsertAccommodationUnitFromWpRow } = await import("@dg/platform-core");
      for (const updated of result.data.updated) {
        if (!updated || typeof updated !== "object") continue;
        const row = updated as Record<string, unknown>;
        const id = typeof row.id === "number" ? row.id : Number(row.id);
        if (!Number.isFinite(id)) continue;
        await upsertAccommodationUnitFromWpRow(
          session.organisationId,
          row as Parameters<typeof upsertAccommodationUnitFromWpRow>[1],
        ).catch(() => null);
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
