import { currentUser } from "@clerk/nextjs/server";
import { listStayBookings, stayBookingToWpRow } from "@dg/platform-core";
import { Suspense } from "react";

import { AccommodationSitePicker } from "@/components/accommodation/AccommodationSitePicker";
import { accommodationConnectorForSession } from "@/lib/accommodation-connector";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import {
  fetchPortalMe,
  fetchWpAccommodationBookings,
  getWpAccommodationSite,
  listWpAccommodationSites,
  type WpAccBookingRow,
} from "@/lib/dg-api";
import { autoSyncWordPressAccBookingsIfNeeded } from "@/lib/wordpress-sync";

interface PageProps {
  searchParams: Promise<{ siteId?: string }>;
}

function formatAud(total?: number): string {
  if (total == null || !Number.isFinite(total)) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(total);
}

function paidLabel(paid?: string | null): string {
  if (paid === "yes") return "Paid";
  if (paid === "no") return "Unpaid";
  return "Unknown";
}

function methodLabel(method?: string | null): string {
  if (!method) return "—";
  const map: Record<string, string> = {
    payid: "PayID",
    stripe: "Stripe / card",
    airbnb: "Airbnb",
    bookingcom: "Booking.com",
    bank: "Bank transfer",
    cash: "Cash",
    other: "Other",
  };
  return map[method] ?? method;
}

export default async function AccommodationPaymentsPage({ searchParams }: PageProps) {
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

  // Prefer live WP for payment fields (paid / payment_method) until Postgres mirrors them fully.
  const live = await fetchWpAccommodationBookings(site.id, 100, connector);
  const stored = session ? await listStayBookings(session.organisationId, 100) : [];

  let bookings: WpAccBookingRow[] = [];
  let error: string | undefined;
  if (live.ok) {
    bookings = live.bookings;
  } else if (stored.length) {
    bookings = stored.map(stayBookingToWpRow);
  } else {
    error = live.message;
  }

  const unpaid = bookings.filter((b) => (b.paid ?? "no") !== "yes");
  const paid = bookings.filter((b) => b.paid === "yes");

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Payments</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · {siteLabel} · booking payment status
          from WordPress (Stripe / PayID / OTA)
        </p>
        <Suspense fallback={null}>
          <div className="mt-3">
            <AccommodationSitePicker sites={sites} />
          </div>
        </Suspense>
      </header>
      <main className="dg-page-main space-y-6">
        {error ? (
          <div className="dg-card border-amber-500/30">
            <p className="text-amber-300">{error}</p>
            <p className="mt-2 text-sm text-slate-500">
              Deploy plugin v10.65.0+ on CVH for paid / payment_method on booking payloads.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Unpaid / unknown</p>
                <p className="mt-1 text-2xl font-bold text-white">{unpaid.length}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Paid</p>
                <p className="mt-1 text-2xl font-bold text-white">{paid.length}</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Ref</th>
                    <th className="px-4 py-3">Guest</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-900/40">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {b.ref ?? b.id}
                      </td>
                      <td className="px-4 py-3 text-white">{b.guest_name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-300">{b.accommodation ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-300">{formatAud(b.total)}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {methodLabel(b.payment_method)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            b.paid === "yes"
                              ? "text-emerald-400"
                              : b.paid === "no"
                                ? "text-amber-400"
                                : "text-slate-500"
                          }
                        >
                          {paidLabel(b.paid)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </>
  );
}
