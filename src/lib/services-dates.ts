/** Org-aware calendar helpers for Services scheduling (default Australia/Brisbane). */

export const SERVICES_DEFAULT_TZ = "Australia/Brisbane";

/** YYYY-MM-DD in the given IANA timezone. */
export function zonedDayKey(isoOrDate: string | Date, timeZone: string): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function todayKey(timeZone: string = SERVICES_DEFAULT_TZ): string {
  return zonedDayKey(new Date(), timeZone);
}

/** Add calendar days to a YYYY-MM-DD key (UTC noon avoids DST edge). */
export function addDayKeys(isoDay: string, days: number): string {
  const [y, m, d] = isoDay.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Inclusive list of YYYY-MM-DD keys starting at `from` for `count` days. */
export function dayKeyRange(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDayKeys(from, i));
}

export function formatDayHeading(key: string, timeZone: string): string {
  const [y, m, day] = key.split("-").map(Number);
  // Noon UTC so en-AU weekday matches the calendar day in AU timezones.
  const d = new Date(Date.UTC(y, m - 1, day, 12));
  return d.toLocaleDateString("en-AU", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTimeRange(
  startIso: string,
  endIso: string | null,
  timeZone: string,
): string {
  const opts: Intl.DateTimeFormatOptions = {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  };
  const start = new Date(startIso).toLocaleTimeString("en-AU", opts);
  if (!endIso) return start;
  const end = new Date(endIso).toLocaleTimeString("en-AU", opts);
  return `${start} – ${end}`;
}

export function formatDateTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Offset of `timeZone` at `date` (ms to add to local wall time to get UTC). */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - date.getTime();
}

/**
 * Convert a local calendar day + wall-clock time in `timeZone` to a UTC Date.
 * Two-pass correction handles DST transitions.
 */
export function zonedLocalToUtc(
  dayKey: string,
  timeHms: string,
  timeZone: string,
): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  const [hh, mm, ss] = timeHms.split(":").map(Number);
  const wallAsUtc = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, ss ?? 0);
  let utc = new Date(wallAsUtc - timeZoneOffsetMs(new Date(wallAsUtc), timeZone));
  utc = new Date(wallAsUtc - timeZoneOffsetMs(utc, timeZone));
  return utc;
}

/** Inclusive ISO bounds for a YYYY-MM-DD calendar day in `timeZone`. */
export function zonedDayBoundsIso(
  dayKey: string,
  timeZone: string,
): { from: string; to: string } {
  const from = zonedLocalToUtc(dayKey, "00:00:00", timeZone);
  const next = addDayKeys(dayKey, 1);
  const endExclusive = zonedLocalToUtc(next, "00:00:00", timeZone);
  return {
    from: from.toISOString(),
    to: new Date(endExclusive.getTime() - 1).toISOString(),
  };
}
