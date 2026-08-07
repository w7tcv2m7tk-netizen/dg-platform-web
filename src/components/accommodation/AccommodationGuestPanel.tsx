import Link from "next/link";

export type AccommodationGuestPanelData = {
  contactId: string;
  stayCount: number;
  totalSpendCents: number;
  lastStayAt?: string | null;
  nextStayAt?: string | null;
  favouriteUnit?: string | null;
  vip: boolean;
  repeatGuest: boolean;
  marketingConsent?: boolean | null;
  preferences?: string | null;
  specialRequests?: string | null;
  guestNotes?: string | null;
  bookings: Array<{
    id: string;
    ref?: string | null;
    accommodationName?: string | null;
    checkin?: string | null;
    checkout?: string | null;
    status: string;
    totalCents?: number | null;
  }>;
};

function formatSpendAud(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function AccommodationGuestPanel({
  guest,
  showContactLink = true,
}: {
  guest: AccommodationGuestPanelData;
  showContactLink?: boolean;
}) {
  return (
    <div className="dg-card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">Accommodation guest</h2>
          <p className="mt-1 text-sm text-slate-400">
            App context on Contact — stays, spend, and preferences.
          </p>
        </div>
        {showContactLink ? (
          <Link
            href={`/apps/crm/contacts/${guest.contactId}`}
            className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:border-blue-500 hover:text-white"
          >
            Open Contact
          </Link>
        ) : null}
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Stays</dt>
          <dd className="text-white">{guest.stayCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Lifetime spend</dt>
          <dd className="text-white">{formatSpendAud(guest.totalSpendCents)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Last stay</dt>
          <dd className="text-white">{guest.lastStayAt ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Next stay</dt>
          <dd className="text-white">{guest.nextStayAt ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Favourite unit</dt>
          <dd className="text-white">{guest.favouriteUnit ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Status</dt>
          <dd className="flex flex-wrap gap-1 text-white">
            {guest.repeatGuest ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                Repeat Guest
              </span>
            ) : null}
            {guest.vip ? (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">
                VIP
              </span>
            ) : null}
            {!guest.repeatGuest && !guest.vip ? "—" : null}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Marketing consent</dt>
          <dd className="text-white">
            {guest.marketingConsent == null
              ? "Unknown"
              : guest.marketingConsent
                ? "Yes"
                : "No"}
          </dd>
        </div>
      </dl>

      {(guest.preferences || guest.specialRequests || guest.guestNotes) && (
        <div className="space-y-3 border-t border-slate-800 pt-4 text-sm">
          {guest.preferences ? (
            <div>
              <p className="text-slate-500">Preferences</p>
              <p className="whitespace-pre-wrap text-slate-200">{guest.preferences}</p>
            </div>
          ) : null}
          {guest.specialRequests ? (
            <div>
              <p className="text-slate-500">Special requests</p>
              <p className="whitespace-pre-wrap text-slate-200">{guest.specialRequests}</p>
            </div>
          ) : null}
          {guest.guestNotes ? (
            <div>
              <p className="text-slate-500">Guest notes</p>
              <p className="whitespace-pre-wrap text-slate-200">{guest.guestNotes}</p>
            </div>
          ) : null}
        </div>
      )}

      <div className="border-t border-slate-800 pt-4">
        <h3 className="text-sm font-medium text-white">Booking history</h3>
        {!guest.bookings.length ? (
          <p className="mt-2 text-sm text-slate-500">No stay bookings linked yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {guest.bookings.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-slate-800 px-3 py-2 text-sm"
              >
                <div>
                  <p className="text-white">
                    {b.accommodationName ?? "Stay"}
                    {b.ref ? ` · ${b.ref}` : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[b.checkin, b.checkout].filter(Boolean).join(" → ") || "Dates TBD"} ·{" "}
                    {b.status}
                  </p>
                </div>
                <p className="text-slate-300">
                  {b.totalCents != null ? formatSpendAud(b.totalCents) : "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Edit VIP, notes, and preferences below. Contact history and communications show on this
        guest page and the Universal Contact timeline.
      </p>
    </div>
  );
}
