/** Site-local calendar helpers for CVH Acc ops (Australia/Brisbane). */

const ACC_TZ = "Australia/Brisbane";

/** YYYY-MM-DD in the Acc site timezone (not UTC). */
export function accToday(timeZone: string = ACC_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function accAddDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function accDayKey(value?: string | null): string | null {
  if (!value?.trim()) return null;
  return value.trim().slice(0, 10);
}

/** Saturday in local calendar sense for YYYY-MM-DD (UTC noon avoids DST edge). */
export function accIsSaturday(iso: string): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12));
  return dt.getUTCDay() === 6;
}

export function accNightsBetween(checkin: string, checkout: string): number {
  const [y1, m1, d1] = checkin.split("-").map(Number);
  const [y2, m2, d2] = checkout.split("-").map(Number);
  const a = Date.UTC(y1, (m1 ?? 1) - 1, d1 ?? 1);
  const b = Date.UTC(y2, (m2 ?? 1) - 1, d2 ?? 1);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return Math.round((b - a) / 86_400_000);
}
