/**
 * Gen 2 OTA iCal import — pulls Airbnb / Booking.com export feeds into StayBooking
 * for calendar availability only. iCal does not include real guest identity, so
 * these rows must not create CRM Guests until an OTA API is integrated.
 */

import type { Prisma } from "@dg/database";

import {
  findOverlappingBookings,
  recordImportConflict,
  withUnitBookingLock,
} from "./booking-conflicts";

export type OtaIcalSource = "airbnb" | "bookingcom";

export type OtaIcalEvent = {
  uid: string;
  start: string;
  end: string;
  summary: string;
  cancelled: boolean;
};

export type SyncOtaCalendarsResult = {
  imported: number;
  updated: number;
  cancelled: number;
  skipped: number;
  errors: string[];
  sources: Record<
    string,
    { unitId: string; title: string; events: number; imported: number; updated: number; cancelled: number }
  >;
  message: string;
};

export type SyncAllOrgsOtaResult = {
  organisations: number;
  imported: number;
  updated: number;
  cancelled: number;
  skipped: number;
  errors: string[];
  message: string;
};

function unfoldIcs(ics: string): string {
  return ics.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

function extractProp(block: string, name: string): string {
  const re = new RegExp(`^${name}(?:;[^:\\n]*)?:(.*)$`, "im");
  const m = block.match(re);
  return m?.[1]?.trim() ?? "";
}

function unescapeIcs(value: string): string {
  return value
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseIcalDate(raw: string): string {
  const v = raw.trim();
  if (/^\d{8}$/.test(v)) {
    return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return "";
}

function addOneDay(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function parseStayDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseIcalEvents(ics: string): OtaIcalEvent[] {
  const unfolded = unfoldIcs(ics);
  const events: OtaIcalEvent[] = [];
  const matches = unfolded.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/gi);
  for (const match of matches) {
    const block = match[1] ?? "";
    const uid = extractProp(block, "UID");
    const startRaw = extractProp(block, "DTSTART");
    const endRaw = extractProp(block, "DTEND");
    const summary = unescapeIcs(extractProp(block, "SUMMARY"));
    const status = extractProp(block, "STATUS").toUpperCase();
    const start = parseIcalDate(startRaw);
    if (!uid || !start) continue;
    let end = endRaw ? parseIcalDate(endRaw) : "";
    if (!end || end <= start) end = addOneDay(start);
    events.push({
      uid,
      start,
      end,
      summary,
      cancelled: status === "CANCELLED",
    });
  }
  return events;
}

function looksLikeDgExportUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes("dg_ical_token=") ||
    u.includes("/api/public/accommodation/ical/") ||
    u.includes("dg-accommodation.ics") ||
    u.includes("/feed/dg-accommodation")
  );
}

export async function fetchIcalFeed(url: string): Promise<
  { ok: true; body: string } | { ok: false; message: string }
> {
  const trimmed = url.trim();
  if (!trimmed) return { ok: false, message: "Calendar URL is empty" };
  if (looksLikeDgExportUrl(trimmed)) {
    return {
      ok: false,
      message:
        "That looks like a DigitalGate export URL. Paste the OTA’s own export calendar URL here.",
    };
  }

  try {
    const res = await fetch(trimmed, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DigitalGate-Calendar/1.0; +https://digitalgate.com.au)",
        Accept: "text/calendar, text/plain, application/octet-stream, */*",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      return {
        ok: false,
        message: `Calendar feed returned HTTP ${res.status}. Re-copy the export URL from the OTA.`,
      };
    }
    const body = await res.text();
    if (!body.trim()) return { ok: false, message: "Calendar feed returned an empty body." };
    if (!/BEGIN:VCALENDAR/i.test(body)) {
      return {
        ok: false,
        message:
          /<html|<!DOCTYPE/i.test(body)
            ? "OTA returned a web page — use the Export calendar link, not the admin page URL."
            : "Response is not a valid iCalendar feed.",
      };
    }
    return { ok: true, body };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Could not fetch calendar feed",
    };
  }
}

function guestNameFromSummary(summary: string, source: OtaIcalSource): string {
  const s = summary.trim();
  if (!s) return source === "airbnb" ? "Airbnb guest" : "Booking.com guest";
  if (/blocked|not available|unavailable/i.test(s)) {
    return source === "airbnb" ? "Airbnb block" : "Booking.com block";
  }
  return s.slice(0, 120);
}

async function upsertOtaStayBooking(input: {
  organisationId: string;
  unitId: string;
  unitTitle: string;
  accommodationWpId: number | null;
  source: OtaIcalSource;
  event: OtaIcalEvent;
  actorId?: string;
}): Promise<"created" | "updated" | "skipped" | "conflict"> {
  const { prisma } = await import("@dg/database");
  const checkin = parseStayDate(input.event.start);
  const checkout = parseStayDate(input.event.end);
  if (!checkin || !checkout) return "skipped";

  const guestName = guestNameFromSummary(input.event.summary, input.source);
  const status = input.source; // airbnb | bookingcom — matches WP convention
  const icalUid = input.event.uid;

  const existing = await prisma.stayBooking.findFirst({
    where: {
      organisationId: input.organisationId,
      accommodationUnitId: input.unitId,
      metadata: {
        path: ["ical_uid"],
        equals: icalUid,
      },
    },
  });

  const prevMeta = (existing?.metadata as Record<string, unknown> | null) ?? {};
  const metadata: Prisma.InputJsonValue = {
    ...prevMeta,
    ical_uid: icalUid,
    source: input.source,
    checkin: input.event.start,
    checkout: input.event.end,
    summary: input.event.summary || null,
    ota_synced_at: new Date().toISOString(),
    ical_misses: 0,
  };

  if (existing) {
    const same =
      existing.guestName === guestName &&
      existing.status === status &&
      existing.checkin?.toISOString() === checkin.toISOString() &&
      existing.checkout?.toISOString() === checkout.toISOString();
    if (same && (prevMeta.ical_misses ?? 0) === 0) return "skipped";

    await prisma.stayBooking.update({
      where: { id: existing.id },
      data: {
        guestName,
        accommodationName: input.unitTitle,
        accommodationWpId: input.accommodationWpId,
        accommodationUnitId: input.unitId,
        checkin,
        checkout,
        status,
        contactId: null,
        metadata,
      },
    });
    return "updated";
  }

  // An inbound OTA stay must not silently land on top of an existing booking.
  // Serialise on the unit and re-check before inserting.
  return withUnitBookingLock(input.organisationId, input.unitId, async (tx) => {
    const conflicts = await findOverlappingBookings(tx, {
      organisationId: input.organisationId,
      accommodationUnitId: input.unitId,
      accommodationWpId: input.accommodationWpId,
      checkin,
      checkout,
    });

    if (conflicts.length) {
      // Record the clash on the existing booking so it surfaces for review
      // rather than disappearing into logs, and leave both rows intact.
      await recordImportConflict(tx, {
        conflicts,
        detail: {
          reason: "ota_import_overlap",
          source: input.source,
          ical_uid: icalUid,
          incoming_checkin: input.event.start,
          incoming_checkout: input.event.end,
          detected_at: new Date().toISOString(),
        },
      });
      return "conflict" as const;
    }

    await tx.stayBooking.create({
      data: {
        organisationId: input.organisationId,
        externalWpId: null,
        ref: `ota:${input.source}:${icalUid.slice(0, 40)}`,
        contactId: null,
        guestName,
        accommodationName: input.unitTitle,
        accommodationWpId: input.accommodationWpId,
        accommodationUnitId: input.unitId,
        checkin,
        checkout,
        status,
        metadata,
      },
    });
    return "created" as const;
  });
}

/**
 * Soft-cancel OTA stays missing from two consecutive successful feed syncs.
 */
async function cancelStaleOtaBookings(input: {
  organisationId: string;
  unitId: string;
  source: OtaIcalSource;
  seenUids: Set<string>;
}): Promise<number> {
  const { prisma } = await import("@dg/database");
  const rows = await prisma.stayBooking.findMany({
    where: {
      organisationId: input.organisationId,
      accommodationUnitId: input.unitId,
      status: { not: "cancelled" },
      metadata: { path: ["source"], equals: input.source },
    },
    select: { id: true, metadata: true },
  });

  let cancelled = 0;
  for (const row of rows) {
    const meta = (row.metadata as Record<string, unknown> | null) ?? {};
    const uid = typeof meta.ical_uid === "string" ? meta.ical_uid : "";
    if (!uid || input.seenUids.has(uid)) {
      if (uid && input.seenUids.has(uid) && meta.ical_misses) {
        await prisma.stayBooking.update({
          where: { id: row.id },
          data: { metadata: { ...meta, ical_misses: 0 } },
        });
      }
      continue;
    }
    const misses = Number(meta.ical_misses ?? 0) + 1;
    if (misses < 2) {
      await prisma.stayBooking.update({
        where: { id: row.id },
        data: { metadata: { ...meta, ical_misses: misses } },
      });
      continue;
    }
    await prisma.stayBooking.update({
      where: { id: row.id },
      data: {
        status: "cancelled",
        metadata: { ...meta, ical_misses: misses, cancelled_via: "ota_ical_stale" },
      },
    });
    cancelled += 1;
  }
  return cancelled;
}

async function recordUnitFeedSync(input: {
  unitId: string;
  source: OtaIcalSource;
  ok: boolean;
  error?: string;
}): Promise<void> {
  const { prisma } = await import("@dg/database");
  const now = new Date();
  if (input.source === "airbnb") {
    await prisma.accommodationUnit.update({
      where: { id: input.unitId },
      data: input.ok
        ? { airbnbLastSyncAt: now, airbnbLastError: null }
        : { airbnbLastError: (input.error ?? "Sync failed").slice(0, 2000) },
    });
    return;
  }
  await prisma.accommodationUnit.update({
    where: { id: input.unitId },
    data: input.ok
      ? { bookingcomLastSyncAt: now, bookingcomLastError: null }
      : { bookingcomLastError: (input.error ?? "Sync failed").slice(0, 2000) },
  });
}

/**
 * Sync Airbnb / Booking.com iCal feeds from Neon AccommodationUnit URLs into StayBooking.
 */
export async function syncOtaCalendarsFromUnits(input: {
  organisationId: string;
  /** Limit to one unit (Neon id) or WP external id */
  unitId?: string;
  propertyWpId?: number;
  source?: "all" | OtaIcalSource;
  actorId?: string;
}): Promise<SyncOtaCalendarsResult> {
  if (!process.env.DATABASE_URL) {
    return {
      imported: 0,
      updated: 0,
      cancelled: 0,
      skipped: 0,
      errors: ["DATABASE_URL not set"],
      sources: {},
      message: "Database not configured",
    };
  }

  const { prisma } = await import("@dg/database");
  const where: Prisma.AccommodationUnitWhereInput = {
    organisationId: input.organisationId,
  };
  if (input.unitId) where.id = input.unitId;
  if (input.propertyWpId != null) where.externalWpId = input.propertyWpId;

  const units = await prisma.accommodationUnit.findMany({
    where,
    select: {
      id: true,
      title: true,
      externalWpId: true,
      airbnbIcalUrl: true,
      bookingcomIcalUrl: true,
    },
    orderBy: { title: "asc" },
  });

  const wantAirbnb = !input.source || input.source === "all" || input.source === "airbnb";
  const wantBooking =
    !input.source || input.source === "all" || input.source === "bookingcom";

  const result: SyncOtaCalendarsResult = {
    imported: 0,
    updated: 0,
    cancelled: 0,
    skipped: 0,
    errors: [],
    sources: {},
    message: "",
  };

  let feedsAttempted = 0;

  for (const unit of units) {
    const feeds: Array<{ source: OtaIcalSource; url: string | null }> = [];
    if (wantAirbnb) feeds.push({ source: "airbnb", url: unit.airbnbIcalUrl });
    if (wantBooking) feeds.push({ source: "bookingcom", url: unit.bookingcomIcalUrl });

    for (const feed of feeds) {
      const url = feed.url?.trim() || "";
      if (!url) continue;
      feedsAttempted += 1;

      const fetched = await fetchIcalFeed(url);
      if (!fetched.ok) {
        result.errors.push(`${unit.title} (${feed.source}): ${fetched.message}`);
        await recordUnitFeedSync({
          unitId: unit.id,
          source: feed.source,
          ok: false,
          error: fetched.message,
        });
        continue;
      }

      const events = parseIcalEvents(fetched.body);
      const seen = new Set<string>();
      let imported = 0;
      let updated = 0;
      let cancelled = 0;

      for (const event of events) {
        if (event.cancelled) continue;
        seen.add(event.uid);
        try {
          const outcome = await upsertOtaStayBooking({
            organisationId: input.organisationId,
            unitId: unit.id,
            unitTitle: unit.title,
            accommodationWpId: unit.externalWpId,
            source: feed.source,
            event,
            actorId: input.actorId,
          });
          if (outcome === "created") imported += 1;
          else if (outcome === "updated") updated += 1;
          else if (outcome === "conflict") {
            // Surfaced to the operator via the sync response rather than
            // silently creating an overlapping stay.
            result.errors.push(
              `${unit.title || unit.id}: ${feed.source} stay ${event.uid} overlaps an existing booking and was not imported`,
            );
            result.skipped += 1;
          } else result.skipped += 1;
        } catch (err) {
          result.errors.push(
            `${unit.title} (${feed.source}) ${event.uid}: ${
              err instanceof Error ? err.message : "upsert failed"
            }`,
          );
        }
      }

      cancelled = await cancelStaleOtaBookings({
        organisationId: input.organisationId,
        unitId: unit.id,
        source: feed.source,
        seenUids: seen,
      });

      await recordUnitFeedSync({
        unitId: unit.id,
        source: feed.source,
        ok: true,
      });

      result.imported += imported;
      result.updated += updated;
      result.cancelled += cancelled;
      result.sources[`${unit.id}:${feed.source}`] = {
        unitId: unit.id,
        title: unit.title,
        events: events.length,
        imported,
        updated,
        cancelled,
      };
    }
  }

  if (feedsAttempted === 0) {
    result.message =
      units.length === 0
        ? "No accommodation units found — sync units first."
        : "No Airbnb/Booking.com iCal URLs saved on units. Add export calendar URLs on each unit, then sync again.";
    if (!result.errors.length) result.errors.push(result.message);
    return result;
  }

  result.message = `OTA sync complete — ${result.imported} imported, ${result.updated} updated, ${result.cancelled} cancelled`;
  if (result.errors.length) {
    result.message += ` · ${result.errors.length} feed warning(s)`;
  }
  return result;
}

/**
 * Cron entry — sync every org that has at least one Airbnb or Booking.com iCal URL.
 */
export async function syncAllOrganisationsOtaCalendars(options?: {
  limitOrgs?: number;
}): Promise<SyncAllOrgsOtaResult> {
  if (!process.env.DATABASE_URL) {
    return {
      organisations: 0,
      imported: 0,
      updated: 0,
      cancelled: 0,
      skipped: 0,
      errors: ["DATABASE_URL not set"],
      message: "Database not configured",
    };
  }

  const { prisma } = await import("@dg/database");
  const limit = Math.max(1, Math.min(options?.limitOrgs ?? 50, 100));

  const units = await prisma.accommodationUnit.findMany({
    where: {
      OR: [
        { airbnbIcalUrl: { not: null } },
        { bookingcomIcalUrl: { not: null } },
      ],
    },
    select: { organisationId: true },
    distinct: ["organisationId"],
    take: limit,
  });

  const orgIds = units.map((u) => u.organisationId);
  const aggregate: SyncAllOrgsOtaResult = {
    organisations: orgIds.length,
    imported: 0,
    updated: 0,
    cancelled: 0,
    skipped: 0,
    errors: [],
    message: "",
  };

  for (const organisationId of orgIds) {
    try {
      const result = await syncOtaCalendarsFromUnits({
        organisationId,
        source: "all",
        actorId: "cron:ota-ical-sync",
      });
      aggregate.imported += result.imported;
      aggregate.updated += result.updated;
      aggregate.cancelled += result.cancelled;
      aggregate.skipped += result.skipped;
      for (const err of result.errors) {
        aggregate.errors.push(`${organisationId}: ${err}`);
      }
    } catch (err) {
      aggregate.errors.push(
        `${organisationId}: ${err instanceof Error ? err.message : "sync failed"}`,
      );
    }
  }

  aggregate.message =
    orgIds.length === 0
      ? "No organisations with OTA iCal URLs configured."
      : `OTA cron synced ${orgIds.length} organisation(s) — ${aggregate.imported} imported, ${aggregate.updated} updated, ${aggregate.cancelled} cancelled`;
  if (aggregate.errors.length) {
    aggregate.message += ` · ${aggregate.errors.length} warning(s)`;
  }
  return aggregate;
}
