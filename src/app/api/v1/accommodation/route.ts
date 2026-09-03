import {
  buildAvailabilityFromNeon,
  cancelStayBookings,
  createStayBookingGen2First,
  deleteStayBookings,
  housekeepingBoardFromUnits,
  listAccommodationGuests,
  listAccommodationUnits,
  listStayBookings,
  patchAccommodationUnitManualBlocks,
  sortAccommodationUnitsByDisplayOrder,
  stayBookingToWpRow,
  unitToWpProp,
  updateAccommodationGuestProfile,
  updateStayBooking,
  updateUnitHousekeeping,
  upsertAccommodationUnitFromWpRow,
  syncOtaCalendarsFromUnits,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

function day(value = new Date()) {
  return value.toISOString().slice(0, 10);
}

async function nativeSummary(organisationId: string) {
  const [units, bookings, guests] = await Promise.all([
    listAccommodationUnits(organisationId),
    listStayBookings(organisationId, 200),
    listAccommodationGuests(organisationId, { limit: 200 }),
  ]);
  const today = day();
  const tomorrowDate = new Date(`${today}T00:00:00Z`);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const tomorrow = day(tomorrowDate);
  const horizonDate = new Date(`${today}T00:00:00Z`);
  horizonDate.setUTCDate(horizonDate.getUTCDate() + 30);
  const horizon = day(horizonDate);
  const active = bookings.filter(
    (booking) => booking.status !== "cancelled" && booking.status !== "canceled",
  );
  const upcoming = active.filter(
    (booking) => booking.checkin && booking.checkin >= today && booking.checkin < horizon,
  );
  const revenueMtdCents = active
    .filter((booking) => booking.checkin?.slice(0, 7) === today.slice(0, 7))
    .reduce((sum, booking) => sum + (booking.totalCents ?? 0), 0);
  const housekeeping = housekeepingBoardFromUnits(units, today);

  return {
    site: "Accommodation",
    site_profile: "gen2_native",
    properties: units.length,
    guests: guests.meta.total,
    upcoming_30d: upcoming.length,
    checkins_today: active.filter((booking) => booking.checkin === today).length,
    checkins_tomorrow: active.filter((booking) => booking.checkin === tomorrow).length,
    checkouts_today: active.filter((booking) => booking.checkout === today).length,
    revenue_mtd: revenueMtdCents / 100,
    revenue_month: revenueMtdCents / 100,
    today,
    tomorrow,
    housekeeping: housekeeping.summary,
    recent_bookings: bookings.slice(0, 10).map(stayBookingToWpRow),
  };
}

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const resource = searchParams.get("resource") ?? "summary";

  if (resource === "sites") {
    return NextResponse.json({
      data: [{ id: "gen2", label: "Accommodation", source: "platform" }],
    });
  }

  if (resource === "units" || resource === "properties") {
    const stored = await listAccommodationUnits(session.organisationId);
    return NextResponse.json({
      data: stored.map(unitToWpProp),
      meta: {
        site: "Accommodation",
        source: "postgres",
        sot: true,
        emptyHint:
          stored.length === 0
            ? "No AccommodationUnit rows yet. Add a unit in Gen 2 or run an explicit WordPress migration."
            : undefined,
      },
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
    const avail = await buildAvailabilityFromNeon(session.organisationId, {
      from,
      to,
      propertyId,
    });
    return NextResponse.json({
      data: { ...avail, units: sortAccommodationUnitsByDisplayOrder(avail.units) },
      meta: { source: "postgres", sot: true },
    });
  }

  if (resource === "bookings") {
    const limit = Number(searchParams.get("limit") ?? 50);
    const stored = await listStayBookings(session.organisationId, limit);
    return NextResponse.json({
      data: stored.map(stayBookingToWpRow),
      meta: { total: stored.length, source: "postgres", sot: true },
    });
  }

  if (resource === "housekeeping") {
    const stored = await listAccommodationUnits(session.organisationId);
    const board = housekeepingBoardFromUnits(stored);
    return NextResponse.json({
      data: {
        items: board.items,
        summary: board.summary,
        statuses: board.statuses,
      },
      meta: { site: "Accommodation", source: "postgres", sot: true, today: board.today },
    });
  }

  if (resource === "guests") {
    const limit = Number(searchParams.get("limit") ?? 100);
    const search = searchParams.get("search") ?? undefined;
    const guests = await listAccommodationGuests(session.organisationId, { limit, search });
    return NextResponse.json({ data: guests.items, meta: guests.meta });
  }

  if (resource === "summary") {
    return NextResponse.json({ data: await nativeSummary(session.organisationId) });
  }

  return NextResponse.json(
    { error: { code: "unsupported_resource", message: `Unsupported resource: ${resource}` } },
    { status: 400 },
  );
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));

  if (body.action === "sync_ota") {
    const gen2 = await syncOtaCalendarsFromUnits({
      organisationId: session.organisationId,
      propertyWpId: typeof body.propertyId === "number" ? body.propertyId : undefined,
      unitId: typeof body.unitId === "string" ? body.unitId : undefined,
      source: body.source === "airbnb" || body.source === "bookingcom" ? body.source : "all",
      actorId: session.clerkUserId,
    });

    const missingConfiguration =
      /No Airbnb\/Booking\.com iCal|No accommodation units/i.test(gen2.message) ||
      gen2.errors.some((error) =>
        /No Airbnb\/Booking\.com iCal|No accommodation units/i.test(error),
      );
    if (missingConfiguration) {
      return NextResponse.json(
        {
          error: {
            code: "ota_ical_urls_missing",
            message:
              gen2.message ||
              "Add Airbnb/Booking.com export calendar URLs on each unit, then sync OTA again.",
          },
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      data: {
        ok: true,
        imported: gen2.imported,
        updated: gen2.updated,
        cancelled: gen2.cancelled,
        skipped: gen2.skipped,
        errors: gen2.errors,
        sources: gen2.sources,
        writePath: "gen2_ical",
        message: gen2.message,
      },
    });
  }

  if (body.action === "create_booking") {
    const payload: Record<string, unknown> =
      body.booking && typeof body.booking === "object"
        ? (body.booking as Record<string, unknown>)
        : (() => {
            const { action: _action, ...rest } = body as Record<string, unknown>;
            return rest;
          })();

    const accommodationWpId =
      typeof payload.accommodation_id === "number"
        ? payload.accommodation_id
        : Number.isFinite(Number(payload.accommodation_id))
          ? Number(payload.accommodation_id)
          : undefined;
    const accommodationUnitId =
      typeof payload.accommodation_unit_id === "string"
        ? payload.accommodation_unit_id
        : undefined;
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
      accommodationWpId,
      accommodationUnitId,
      checkin: typeof payload.checkin === "string" ? payload.checkin : "",
      checkout: typeof payload.checkout === "string" ? payload.checkout : "",
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

    return NextResponse.json({
      data: {
        created: [stayBookingToWpRow(native.booking)],
        stayBooking: native.booking,
        writePath: "neon",
        conflictChecked: native.conflictChecked,
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

    const updated = await updateAccommodationGuestProfile(session.organisationId, contactId, {
      vip: typeof body.vip === "boolean" ? body.vip : undefined,
      hideawayCircle:
        typeof body.hideawayCircle === "boolean" ? body.hideawayCircle : undefined,
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
      favouriteUnit: typeof body.favouriteUnit === "string" ? body.favouriteUnit : undefined,
      displayName: typeof body.displayName === "string" ? body.displayName : undefined,
      email: typeof body.email === "string" ? body.email : undefined,
      phone: typeof body.phone === "string" ? body.phone : undefined,
    });

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

  if (resource === "units" || resource === "properties") {
    const persisted: Array<Record<string, unknown>> = [];
    for (const row of updates) {
      if (!row || typeof row !== "object") continue;
      const patch = row as Record<string, unknown>;
      const externalId =
        typeof patch.id === "number"
          ? patch.id
          : typeof patch.property_id === "number"
            ? patch.property_id
            : Number(patch.id ?? patch.property_id);
      const platformId =
        typeof patch.platform_id === "string" ? patch.platform_id.trim() : undefined;
      if (!platformId && !Number.isFinite(externalId)) continue;

      const wantsBlockPatch =
        Array.isArray(patch.block_dates) ||
        Array.isArray(patch.unblock_dates) ||
        Array.isArray(patch.manual_blocked_dates);
      let manualBlockedDates = Array.isArray(patch.manual_blocked_dates)
        ? (patch.manual_blocked_dates as string[])
        : undefined;

      if (wantsBlockPatch) {
        const blockResult = await patchAccommodationUnitManualBlocks(session.organisationId, {
          id: Number.isFinite(externalId) ? externalId : undefined,
          platform_id: platformId,
          manual_blocked_dates: manualBlockedDates,
          block_dates: Array.isArray(patch.block_dates)
            ? (patch.block_dates as string[])
            : undefined,
          unblock_dates: Array.isArray(patch.unblock_dates)
            ? (patch.unblock_dates as string[])
            : undefined,
        });
        if (!blockResult.ok) {
          return NextResponse.json(
            {
              error: {
                code: "block_persist_failed",
                message: "Could not save blocked dates for this unit.",
              },
            },
            { status: 422 },
          );
        }
        manualBlockedDates = blockResult.manual_blocked_dates;
      }

      const hasNonBlockFields = [
        "title",
        "listing_status",
        "weekday_rate",
        "weekend_rate",
        "cleaning_fee",
        "housekeeping_status",
        "housekeeping_notes",
        "airbnb_ical_url",
        "bookingcom_ical_url",
        "airbnb_id",
        "bookingcom_id",
        "description",
        "address",
        "sleeps",
        "bedrooms",
        "bathrooms",
        "max_guests",
        "min_nights",
        "checkin_time",
        "checkout_time",
        "features",
        "last_minute_discount",
        "early_bird_discount",
        "gallery_urls",
        "featured_image_url",
      ].some((key) => patch[key] !== undefined);

      if (hasNonBlockFields) {
        const outcome = await upsertAccommodationUnitFromWpRow(session.organisationId, {
          id: Number.isFinite(externalId) ? externalId : 0,
          platform_id: platformId,
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
          manual_blocked_dates: manualBlockedDates,
          airbnb_ical_url:
            typeof patch.airbnb_ical_url === "string" ? patch.airbnb_ical_url : undefined,
          bookingcom_ical_url:
            typeof patch.bookingcom_ical_url === "string"
              ? patch.bookingcom_ical_url
              : undefined,
          airbnb_id: typeof patch.airbnb_id === "string" ? patch.airbnb_id : undefined,
          bookingcom_id:
            typeof patch.bookingcom_id === "string" ? patch.bookingcom_id : undefined,
          description: typeof patch.description === "string" ? patch.description : undefined,
          address: typeof patch.address === "string" ? patch.address : undefined,
          sleeps: typeof patch.sleeps === "number" ? patch.sleeps : undefined,
          bedrooms: typeof patch.bedrooms === "number" ? patch.bedrooms : undefined,
          bathrooms: typeof patch.bathrooms === "number" ? patch.bathrooms : undefined,
          max_guests: typeof patch.max_guests === "number" ? patch.max_guests : undefined,
          min_nights: typeof patch.min_nights === "number" ? patch.min_nights : undefined,
          checkin_time: typeof patch.checkin_time === "string" ? patch.checkin_time : undefined,
          checkout_time:
            typeof patch.checkout_time === "string" ? patch.checkout_time : undefined,
          features:
            patch.features && typeof patch.features === "object"
              ? (patch.features as Record<string, 0 | 1 | boolean>)
              : undefined,
          last_minute_discount:
            typeof patch.last_minute_discount === "number"
              ? patch.last_minute_discount
              : patch.last_minute_discount === null
                ? null
                : undefined,
          early_bird_discount:
            typeof patch.early_bird_discount === "number"
              ? patch.early_bird_discount
              : patch.early_bird_discount === null
                ? null
                : undefined,
          gallery_urls: Array.isArray(patch.gallery_urls)
            ? (patch.gallery_urls as string[])
            : undefined,
          featured_image_url:
            typeof patch.featured_image_url === "string"
              ? patch.featured_image_url
              : patch.featured_image_url === null
                ? ""
                : undefined,
        });
        if (outcome === "skipped" && !wantsBlockPatch) {
          return NextResponse.json(
            { error: { code: "unit_not_found", message: "Accommodation unit not found" } },
            { status: 404 },
          );
        }
      }

      persisted.push({
        ...patch,
        platform_id: platformId,
        ...(manualBlockedDates
          ? { manual_blocked_dates: manualBlockedDates, blocked_dates: manualBlockedDates }
          : {}),
      });
    }

    return NextResponse.json({
      data: {
        ok: true,
        updated: persisted,
        count: persisted.length,
        sot: "neon",
        writePath: "neon",
      },
    });
  }

  if (resource === "bookings") {
    const updated = [];
    const existingBookings = await listStayBookings(session.organisationId, 200);
    for (const row of updates) {
      if (!row || typeof row !== "object") continue;
      const patch = row as Record<string, unknown>;
      const platformId = typeof patch.platform_id === "string" ? patch.platform_id : undefined;
      const externalWpId = typeof patch.id === "number" ? patch.id : undefined;
      const existing = existingBookings.find(
        (booking) =>
          (platformId && booking.id === platformId) ||
          (externalWpId != null && booking.externalWpId === externalWpId),
      );
      if (
        typeof patch.accommodation_id === "number" &&
        (!existing || patch.accommodation_id !== existing.accommodationWpId)
      ) {
        return NextResponse.json(
          {
            error: {
              code: "booking_unit_move_requires_atomic_operation",
              message:
                "Moving a booking between accommodation units requires the dedicated atomic unit-move operation.",
            },
          },
          { status: 422 },
        );
      }
      const result = await updateStayBooking(session.organisationId, {
        platformId,
        externalWpId,
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
      });
      if (!result) {
        return NextResponse.json(
          { error: { code: "booking_not_found", message: "StayBooking not found" } },
          { status: 404 },
        );
      }
      updated.push(stayBookingToWpRow(result));
    }
    return NextResponse.json({
      data: { ok: true, updated, count: updated.length, writePath: "neon" },
    });
  }

  if (resource === "guests") {
    const updated = [];
    for (const row of updates) {
      if (!row || typeof row !== "object") continue;
      const patch = row as Record<string, unknown>;
      const contactId =
        typeof patch.contact_id === "string"
          ? patch.contact_id
          : typeof patch.contactId === "string"
            ? patch.contactId
            : "";
      if (!contactId) {
        return NextResponse.json(
          { error: { code: "missing_contact", message: "contact_id is required" } },
          { status: 400 },
        );
      }
      const result = await updateAccommodationGuestProfile(session.organisationId, contactId, {
        vip: typeof patch.vip === "boolean" ? patch.vip : undefined,
        guestNotes: typeof patch.notes === "string" ? patch.notes : undefined,
        preferences: typeof patch.preferences === "string" ? patch.preferences : undefined,
        specialRequests:
          typeof patch.special_requests === "string" ? patch.special_requests : undefined,
        displayName: typeof patch.name === "string" ? patch.name : undefined,
        email: typeof patch.email === "string" ? patch.email : undefined,
        phone: typeof patch.phone === "string" ? patch.phone : undefined,
      });
      if (result) updated.push(result);
    }
    return NextResponse.json({
      data: { ok: true, updated, count: updated.length, writePath: "neon" },
    });
  }

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
    const patch = raw as Record<string, unknown>;
    if (typeof patch.status !== "string") continue;
    typed.push({
      property_id: typeof patch.property_id === "number" ? patch.property_id : undefined,
      id: typeof patch.id === "number" ? patch.id : undefined,
      platform_id: typeof patch.platform_id === "string" ? patch.platform_id : undefined,
      status: patch.status,
      notes: typeof patch.notes === "string" ? patch.notes : undefined,
    });
  }
  const neon = await updateUnitHousekeeping(session.organisationId, typed);
  return NextResponse.json({
    data: { ok: true, updated: neon.updated, count: neon.count, writePath: "neon" },
  });
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

  const hard = body.hard === true || body.mode === "hard";
  const externalIds: number[] = [];
  if (Array.isArray(body.ids)) {
    for (const raw of body.ids) {
      const id = typeof raw === "number" ? raw : Number(raw);
      if (Number.isFinite(id) && id > 0) externalIds.push(id);
    }
  } else if (typeof body.id === "number" && body.id > 0) {
    externalIds.push(body.id);
  }

  const platformIds: string[] = [];
  if (Array.isArray(body.platform_ids)) {
    for (const raw of body.platform_ids) {
      if (typeof raw === "string" && raw.trim()) platformIds.push(raw.trim());
    }
  } else if (typeof body.platform_id === "string" && body.platform_id.trim()) {
    platformIds.push(body.platform_id.trim());
  }

  if (!externalIds.length && !platformIds.length) {
    return NextResponse.json(
      {
        error: {
          code: "missing_ids",
          message: "Provide platform_id / platform_ids[] or legacy external ids[]",
        },
      },
      { status: 400 },
    );
  }

  const result = hard
    ? await deleteStayBookings(session.organisationId, {
        platformIds,
        externalWpIds: externalIds,
      })
    : await cancelStayBookings(session.organisationId, {
        platformIds,
        externalWpIds: externalIds,
      });

  return NextResponse.json({
    data: {
      ok: true,
      mode: hard ? "hard" : "cancel",
      neon: {
        count: result.count,
        ids: "deleted" in result ? result.deleted : result.cancelled,
      },
      writePath: "neon",
    },
  });
}
