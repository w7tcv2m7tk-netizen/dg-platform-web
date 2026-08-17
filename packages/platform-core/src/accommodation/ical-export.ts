/**
 * Public Airbnb / Booking.com iCal export from Neon StayBooking (Gen 2 SoT).
 *
 * CVH WordPress `/ical/...` feeds are blocked with HTTP 406 for common bot UAs
 * (Go-http-client, python-requests) by host ModSecurity — Airbnb’s crawler often
 * fails with a generic UI error. Platform export avoids that host.
 */

import { randomBytes } from "node:crypto";

import type { Prisma } from "@dg/database";
import { resolveCvhUnitDisplaySlug } from "./display-order";

export type IcalForChannel = "all" | "airbnb" | "bookingcom";

const TOKEN_RE = /^[a-zA-Z0-9]{16,64}$/;

function generateIcalExportToken(): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(32);
  let out = "";
  for (let i = 0; i < 32; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

export function appPublicBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.trim()}` : "") ||
    "https://app.digitalgate.com.au";
  return raw.replace(/\/$/, "");
}

/**
 * Base URL for OTA-facing iCal export links. Never persist localhost / preview
 * hosts — Airbnb and Booking.com must pull production.
 */
export function appPublicIcalBaseUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_ICAL_BASE_URL?.trim(),
    process.env.NEXT_PUBLIC_APP_URL?.trim(),
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.trim()}` : "",
  ].filter(Boolean) as string[];
  for (const raw of candidates) {
    try {
      const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
      const host = u.hostname.toLowerCase();
      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.endsWith(".vercel.app")
      ) {
        continue;
      }
      return `${u.protocol}//${u.host}`.replace(/\/$/, "");
    } catch {
      continue;
    }
  }
  return "https://app.digitalgate.com.au";
}

/** Pull token from WP-style `/ical/{slug}/{token}.ics` or query `dg_ical_token`. */
export function extractIcalTokenFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const pathMatch = u.pathname.match(/\/ical\/[^/]+\/([a-zA-Z0-9]+)\.ics$/i);
    if (pathMatch?.[1] && TOKEN_RE.test(pathMatch[1])) return pathMatch[1];
    const q =
      u.searchParams.get("dg_ical_token") ||
      u.searchParams.get("key") ||
      u.searchParams.get("token");
    if (q && TOKEN_RE.test(q)) return q;
  } catch {
    const m = String(url).match(/\/ical\/[^/]+\/([a-zA-Z0-9]+)\.ics/i);
    if (m?.[1] && TOKEN_RE.test(m[1])) return m[1];
  }
  return null;
}

export function tokenFromUnitMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const t = (metadata as Record<string, unknown>).icalExportToken;
  return typeof t === "string" && TOKEN_RE.test(t) ? t : null;
}

export function resolveUnitIcalToken(input: {
  icalExportUrl?: string | null;
  metadata?: unknown;
}): string | null {
  return extractIcalTokenFromUrl(input.icalExportUrl) || tokenFromUnitMetadata(input.metadata);
}

export function buildPlatformIcalExportUrl(input: {
  slug: string;
  token: string;
  forChannel?: IcalForChannel;
}): string {
  const slug = encodeURIComponent(input.slug.trim());
  const token = encodeURIComponent(input.token.trim());
  let url = `${appPublicIcalBaseUrl()}/api/public/accommodation/ical/${slug}/${token}.ics`;
  if (input.forChannel && input.forChannel !== "all") {
    url += `?for=${input.forChannel}`;
  }
  return url;
}

export function parseIcalForChannel(raw: string | null | undefined): IcalForChannel {
  const v = (raw || "").trim().toLowerCase();
  if (v === "airbnb" || v === "bookingcom") return v;
  return "all";
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dateOnly(ymdOrIso: string): string {
  return ymdOrIso.slice(0, 10).replace(/-/g, "");
}

function icsEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function foldIcs(body: string): string {
  const out: string[] = [];
  for (const line of body.split(/\r\n|\n|\r/)) {
    if (!line) continue;
    let rest = line;
    while (rest.length > 73) {
      out.push(rest.slice(0, 73));
      rest = ` ${rest.slice(73)}`;
    }
    out.push(rest);
  }
  return `${out.join("\r\n")}\r\n`;
}

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function eventLines(input: {
  uid: string;
  start: string;
  end: string;
  summary: string;
  modified: Date;
}): string[] {
  const modified = stamp(input.modified);
  return [
    "BEGIN:VEVENT",
    `UID:${icsEscape(input.uid)}`,
    `DTSTAMP:${modified}`,
    `CREATED:${modified}`,
    `LAST-MODIFIED:${modified}`,
    `DTSTART;VALUE=DATE:${dateOnly(input.start)}`,
    `DTEND;VALUE=DATE:${dateOnly(input.end)}`,
    // Airbnb expects plain availability blocks — not guest/channel titles.
    `SUMMARY:${icsEscape(input.summary)}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
  ];
}

export type PublicIcalUnit = {
  id: string;
  organisationId: string;
  title: string;
  slug: string | null;
  icalExportUrl: string | null;
  metadata: unknown;
  manualBlockedDates: unknown;
  externalWpId: number | null;
};

/** Verify slug + token against a Neon unit (WP token reused). */
export async function findUnitForPublicIcal(
  slug: string,
  token: string,
): Promise<PublicIcalUnit | null> {
  if (!process.env.DATABASE_URL) return null;
  const cleanSlug = slug.trim().toLowerCase();
  const cleanToken = token.trim();
  if (!cleanSlug || !TOKEN_RE.test(cleanToken)) return null;

  const { prisma } = await import("@dg/database");
  const unit = await prisma.accommodationUnit.findFirst({
    where: { slug: cleanSlug },
    select: {
      id: true,
      organisationId: true,
      title: true,
      slug: true,
      icalExportUrl: true,
      metadata: true,
      manualBlockedDates: true,
      externalWpId: true,
    },
  });
  if (!unit?.slug) return null;

  const expected = resolveUnitIcalToken(unit);
  if (!expected || expected !== cleanToken) return null;

  return unit;
}

/**
 * Build RFC5545 ICS for a unit. `for=airbnb` omits Airbnb-sourced rows so
 * Booking.com / direct blocks still push to Airbnb without echoing Airbnb→Airbnb.
 */
export async function buildUnitIcalFeed(
  unit: PublicIcalUnit,
  forChannel: IcalForChannel = "all",
): Promise<string> {
  const { prisma } = await import("@dg/database");
  const host = (() => {
    try {
      return new URL(appPublicBaseUrl()).hostname || "app.digitalgate.com.au";
    } catch {
      return "app.digitalgate.com.au";
    }
  })();

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DigitalGate//Accommodation iCal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(unit.title)}`,
    "X-WR-TIMEZONE:Australia/Brisbane",
  ];

  const excludeStatus =
    forChannel === "airbnb" ? "airbnb" : forChannel === "bookingcom" ? "bookingcom" : null;

  const stays = await prisma.stayBooking.findMany({
    where: {
      organisationId: unit.organisationId,
      status: { not: "cancelled" },
      OR: [
        { accommodationUnitId: unit.id },
        ...(unit.externalWpId
          ? [{ accommodationWpId: unit.externalWpId }]
          : []),
      ],
    },
    orderBy: { checkin: "asc" },
    take: 2000,
  });

  for (const stay of stays) {
    if (excludeStatus && stay.status === excludeStatus) continue;
    if (!stay.checkin || !stay.checkout) continue;
    const start = ymd(stay.checkin);
    const end = ymd(stay.checkout);
    if (end <= start) continue;
    const uidBase = stay.externalWpId
      ? `booking-${stay.externalWpId}`
      : `stay-${stay.id}`;
    lines.push(
      ...eventLines({
        uid: `${uidBase}@${host}`,
        start,
        end,
        summary: "Not available",
        modified: stay.updatedAt || stay.createdAt,
      }),
    );
  }

  const blocked = Array.isArray(unit.manualBlockedDates)
    ? (unit.manualBlockedDates as unknown[])
    : [];
  let bi = 0;
  for (const raw of blocked) {
    if (typeof raw !== "string") continue;
    const range = raw.trim();
    const m = range.match(/^(\d{4}-\d{2}-\d{2})\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2})$/i);
    if (m) {
      lines.push(
        ...eventLines({
          uid: `blocked-${unit.id}-${bi++}@${host}`,
          start: m[1],
          end: m[2],
          summary: "Not available",
          modified: new Date(0),
        }),
      );
      continue;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(range)) {
      const next = new Date(`${range}T00:00:00.000Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      lines.push(
        ...eventLines({
          uid: `blocked-${unit.id}-${bi++}@${host}`,
          start: range,
          end: ymd(next),
          summary: "Not available",
          modified: new Date(0),
        }),
      );
    }
  }

  lines.push("END:VCALENDAR");
  return foldIcs(lines.join("\r\n"));
}

/** Enrich unit list rows with Gen 2 export URLs for the Acc UI. */
export function attachPlatformIcalUrls(item: {
  slug?: string | null;
  icalExportUrl?: string | null;
  metadata?: unknown;
}): {
  ical_export_url?: string;
  ical_export_wp_url?: string;
  ical_export_airbnb_url?: string;
  ical_export_bookingcom_url?: string;
} {
  const token = resolveUnitIcalToken(item);
  const slug = item.slug?.trim();
  if (!token || !slug) {
    return item.icalExportUrl ? { ical_export_url: item.icalExportUrl } : {};
  }
  const platform = buildPlatformIcalExportUrl({ slug, token });
  const airbnb = buildPlatformIcalExportUrl({ slug, token, forChannel: "airbnb" });
  const bookingcom = buildPlatformIcalExportUrl({
    slug,
    token,
    forChannel: "bookingcom",
  });
  const meta =
    item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
      ? (item.metadata as Record<string, unknown>)
      : {};
  const wpStored =
    typeof meta.icalExportWpUrl === "string" ? meta.icalExportWpUrl.trim() : "";
  const exportUrl = item.icalExportUrl?.trim() || undefined;
  const wp =
    wpStored ||
    (exportUrl && !exportUrl.includes("/api/public/accommodation/ical/")
      ? exportUrl
      : undefined);
  return {
    ical_export_url: platform,
    ical_export_airbnb_url: airbnb,
    ical_export_bookingcom_url: bookingcom,
    ...(wp && wp !== platform ? { ical_export_wp_url: wp } : {}),
  };
}

/**
 * Ensure every unit has a stable slug + export token and a DigitalGate public
 * iCal URL so Acc day-blocks persist onto Airbnb/Booking.com import feeds.
 * Idempotent — only writes when slug/token/URL are missing or still WP-hosted.
 */
export async function ensureOrganisationIcalExports(
  organisationId: string,
): Promise<{ updated: number }> {
  if (!process.env.DATABASE_URL) return { updated: 0 };
  const { prisma } = await import("@dg/database");
  const units = await prisma.accommodationUnit.findMany({
    where: { organisationId },
    select: {
      id: true,
      title: true,
      slug: true,
      icalExportUrl: true,
      metadata: true,
    },
  });

  let updated = 0;
  for (const unit of units) {
    const resolvedSlug =
      resolveCvhUnitDisplaySlug({ slug: unit.slug, title: unit.title }) ||
      unit.slug?.trim().toLowerCase() ||
      null;
    if (!resolvedSlug) continue;

    const prevMeta =
      unit.metadata && typeof unit.metadata === "object" && !Array.isArray(unit.metadata)
        ? ({ ...(unit.metadata as Record<string, unknown>) } as Record<string, unknown>)
        : {};

    const existingToken = resolveUnitIcalToken({
      icalExportUrl: unit.icalExportUrl,
      metadata: prevMeta,
    });
    const token = existingToken || generateIcalExportToken();
    const platformUrl = buildPlatformIcalExportUrl({ slug: resolvedSlug, token });

    const prevExport = unit.icalExportUrl?.trim() || "";
    if (
      prevExport.includes("currumbinvalleyhideaway.com.au/ical/") ||
      (prevExport.includes("/ical/") &&
        !prevExport.includes("/api/public/accommodation/ical/"))
    ) {
      if (!prevMeta.icalExportWpUrl) prevMeta.icalExportWpUrl = prevExport;
    }
    prevMeta.icalExportToken = token;

    const needsWrite =
      unit.slug !== resolvedSlug ||
      prevExport !== platformUrl ||
      existingToken !== token ||
      tokenFromUnitMetadata(unit.metadata) !== token;

    if (!needsWrite) continue;

    await prisma.accommodationUnit.update({
      where: { id: unit.id },
      data: {
        slug: resolvedSlug,
        icalExportUrl: platformUrl,
        metadata: prevMeta as Prisma.InputJsonValue,
      },
    });
    updated += 1;
  }

  return { updated };
}
