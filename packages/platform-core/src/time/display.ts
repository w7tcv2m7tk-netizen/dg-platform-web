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

export function minutesInTimeZone(
  date: Date = new Date(),
  timeZone: string = PLATFORM_DEFAULT_TZ,
): number {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const hourRaw = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const hour = hourRaw === 24 ? 0 : hourRaw;
  return hour * 60 + minute;
}

/** JS weekday: 0 Sunday … 6 Saturday, in `timeZone`. */
export function weekdayInTimeZone(
  date: Date = new Date(),
  timeZone: string = PLATFORM_DEFAULT_TZ,
): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

export function hourInTimeZone(
  date: Date = new Date(),
  timeZone: string = PLATFORM_DEFAULT_TZ,
): number {
  return Math.floor(minutesInTimeZone(date, timeZone) / 60);
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
