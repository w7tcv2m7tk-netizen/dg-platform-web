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
