/** Platform wall-clock for operator-facing timestamps (Vercel runs in US East). */
export const PLATFORM_DEFAULT_TZ = "Australia/Brisbane";

export function zonedDayKey(
  isoOrDate: string | Date,
  timeZone: string = PLATFORM_DEFAULT_TZ,
): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addCalendarDays(isoDay: string, days: number): string {
  const [y, m, d] = isoDay.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function hourInTimeZone(
  date: Date = new Date(),
  timeZone: string = PLATFORM_DEFAULT_TZ,
): number {
  const hour = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .find((p) => p.type === "hour")?.value;
  const n = Number(hour ?? "0");
  return n === 24 ? 0 : n;
}

export function formatTimelineTime(
  iso: string,
  timeZone: string = PLATFORM_DEFAULT_TZ,
): string {
  return new Date(iso).toLocaleTimeString("en-AU", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTimelineDateTime(
  iso: string,
  timeZone: string = PLATFORM_DEFAULT_TZ,
): string {
  return new Date(iso).toLocaleString("en-AU", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Compact label for Overview / Twin activity rows. */
export function formatRelativeTimelineLabel(
  iso: string,
  timeZone: string = PLATFORM_DEFAULT_TZ,
): string {
  const day = zonedDayKey(iso, timeZone);
  const today = zonedDayKey(new Date(), timeZone);
  if (day === today) return formatTimelineTime(iso, timeZone);
  if (day === addCalendarDays(today, -1)) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-AU", {
    timeZone,
    month: "short",
    day: "numeric",
  });
}
