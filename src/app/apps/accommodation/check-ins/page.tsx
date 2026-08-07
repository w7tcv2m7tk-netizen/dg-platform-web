import { currentUser } from "@clerk/nextjs/server";
import { listStayBookings, stayBookingToWpRow } from "@dg/platform-core";
import { Suspense } from "react";

import { AccommodationSitePicker } from "@/components/accommodation/AccommodationSitePicker";
import { accommodationConnectorForSession } from "@/lib/accommodation-connector";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import {
  fetchPortalMe,
  fetchWpAccommodationBookings,
  fetchWpAccommodationSummary,
  getWpAccommodationSite,
  listWpAccommodationSites,
  type WpAccBookingRow,
} from "@/lib/dg-api";
import { autoSyncWordPressAccBookingsIfNeeded } from "@/lib/wordpress-sync";

interface PageProps {
  searchParams: Promise<{ siteId?: string }>;
}

function dayKey(value?: string | null): string | null {
  if (!value?.trim()) return null;
  return value.trim().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

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
              key={b.id}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-white">{b.guest_name ?? b.ref ?? "Guest"}</p>
                <p className="text-slate-500">
                  {[b.accommodation, b.phone, b.email].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="text-right text-slate-400">
                <p>
                  {b.checkin} → {b.checkout}
                </p>
                <p className="text-xs capitalize">
                  {b.status}
                  {b.guests != null ? ` · ${b.guests} guests` : ""}
                  {b.source ? ` · ${b.source}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function AccommodationCheckInsPage({ searchParams }: PageProps) {
  const { siteId } = await searchParams;
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email ? await fetchPortalMe(email, user?.id) : null;
  const session = user?.id
    ? await resolveActivePlatformSession({
        clerkUserId: user.id,
        email,
        name,
        orgName: portal?.org_name,
      })
    : null;

  if (session) {
    await autoSyncWordPressAccBookingsIfNeeded(session);
  }

  const sites = listWpAccommodationSites();
  const site = getWpAccommodationSite(siteId);
  const connector = await accommodationConnectorForSession(session?.organisationId);
  const siteLabel = connector?.label ?? site.label;

  const summary = await fetchWpAccommodationSummary(site.id, 30, connector);
  const stored = session ? await listStayBookings(session.organisationId, 100) : [];
  const live =
    stored.length === 0
      ? await fetchWpAccommodationBookings(site.id, 100, connector)
      : null;

  const bookings: WpAccBookingRow[] =
    stored.length > 0
      ? stored.map(stayBookingToWpRow)
      : live?.ok
        ? live.bookings
        : [];

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = addDays(today, 1);
  const upcomingEnd = addDays(today, 14);

  const active = bookings.filter((b) => {
    const status = (b.status ?? "").toLowerCase();
    return status !== "cancelled" && status !== "canceled" && status !== "completed";
  });

  const todayList = active.filter((b) => dayKey(b.checkin) === today);
  const tomorrowList = active.filter((b) => dayKey(b.checkin) === tomorrow);
  const upcoming = active
    .filter((b) => {
      const d = dayKey(b.checkin);
      return d && d > tomorrow && d <= upcomingEnd;
    })
    .sort((a, b) => (a.checkin ?? "").localeCompare(b.checkin ?? ""));

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Check-ins</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · {siteLabel} · today / tomorrow /
          next 14 days
          {summary.ok
            ? ` · WP says ${summary.data.checkins_today ?? 0} today, ${summary.data.checkins_tomorrow ?? 0} tomorrow`
            : ""}
        </p>
        <Suspense fallback={null}>
          <div className="mt-3">
            <AccommodationSitePicker sites={sites} />
          </div>
        </Suspense>
      </header>
      <main className="dg-page-main space-y-8">
        <Board title="Today" hint={today} bookings={todayList} />
        <Board title="Tomorrow" hint={tomorrow} bookings={tomorrowList} />
        <Board title="Upcoming" hint={`Through ${upcomingEnd}`} bookings={upcoming} />
      </main>
    </>
  );
}
