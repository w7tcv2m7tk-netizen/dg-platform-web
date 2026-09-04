import Link from "next/link";
import type { WpAccBookingRow } from "@dg/platform-core";

import { loadStayBookingsForOps } from "@/lib/accommodation-stay-bookings";
import { accAddDays, accDayKey, accToday } from "@/lib/acc-dates";
import { getPlatformPageContext } from "@/lib/platform-page-context";

function Board({
  title,
  hint,
  bookings,
}: {
  title: string;
  hint?: string;
  bookings: WpAccBookingRow[];
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold text-white">{title}</h2>
        {hint ? <p className="text-sm text-slate-500">{hint}</p> : null}
      </div>
      {!bookings.length ? (
        <div className="rounded-xl border border-dashed border-slate-700 px-4 py-6 text-sm text-slate-500">
          None in this window.
        </div>
      ) : (
        <ul className="space-y-2">
          {bookings.map((b) => (
            <li
              key={b.platform_id ?? b.id}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-white">{b.guest_name ?? b.ref ?? "Guest"}</p>
                <p className="text-slate-500">
                  {[b.accommodation, b.phone, b.email].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  <Link
                    href="/apps/accommodation/bookings"
                    className="text-blue-400 hover:underline"
                  >
                    Open bookings
                  </Link>
                  {b.email ? (
                    <a
                      href={`mailto:${encodeURIComponent(b.email)}?subject=${encodeURIComponent(
                        `Check-in — ${b.accommodation ?? "your stay"} (${b.checkin ?? ""})`,
                      )}`}
                      className="text-blue-400 hover:underline"
                    >
                      Email guest
                    </a>
                  ) : null}
                  {b.phone ? (
                    <a
                      href={`tel:${b.phone.replace(/\s+/g, "")}`}
                      className="text-blue-400 hover:underline"
                    >
                      Call
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="text-right text-slate-400">
                <p>
                  {b.checkin} → {b.checkout}
                </p>
                <p className="text-xs capitalize">
                  {b.status}
                  {b.guests != null ? ` · ${b.guests} guests` : ""}
                  {b.source ? ` · ${b.source}` : ""}
                  {b.paid === "yes" ? " · paid" : b.paid === "no" ? " · unpaid" : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function AccommodationCheckInsPage() {
  const { session } = await getPlatformPageContext();
  const loaded = await loadStayBookingsForOps(session, 150);
  const bookings: WpAccBookingRow[] = loaded.bookings;
  const today = accToday();
  const tomorrow = accAddDays(today, 1);
  const upcomingEnd = accAddDays(today, 14);

  const active = bookings.filter((b) => {
    const status = (b.status ?? "").toLowerCase();
    return status !== "cancelled" && status !== "canceled" && status !== "completed";
  });

  const todayList = active.filter((b) => accDayKey(b.checkin) === today);
  const tomorrowList = active.filter((b) => accDayKey(b.checkin) === tomorrow);
  const upcoming = active
    .filter((b) => {
      const d = accDayKey(b.checkin);
      return d && d > tomorrow && d <= upcomingEnd;
    })
    .sort((a, b) => (a.checkin ?? "").localeCompare(b.checkin ?? ""));

  const siteLabel = session?.organisationName ?? "Accommodation";

  return (
    <main className="dg-page-main space-y-8">
      <div>
        <p className="text-sm text-slate-400">
          {siteLabel} · StayBooking (Neon) · {today} Brisbane · {todayList.length} today, {tomorrowList.length} tomorrow
        </p>
      </div>
      {loaded.syncError && bookings.length === 0 ? (
        <div className="dg-card border-amber-500/30">
          <p className="text-amber-300">{loaded.syncError}</p>
        </div>
      ) : null}
      <Board title="Today" hint={today} bookings={todayList} />
      <Board title="Tomorrow" hint={tomorrow} bookings={tomorrowList} />
      <Board title="Upcoming" hint={`Through ${upcomingEnd}`} bookings={upcoming} />
    </main>
  );
}
