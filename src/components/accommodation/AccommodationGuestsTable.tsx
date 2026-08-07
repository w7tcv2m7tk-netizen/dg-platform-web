"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export type AccommodationGuestListRow = {
  contactId: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  role: "Guest";
  stayCount: number;
  totalSpendCents: number;
  lastStayAt?: string | null;
  favouriteUnit?: string | null;
  vip: boolean;
  repeatGuest: boolean;
};

function formatSpendAud(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function AccommodationGuestsTable({
  guests,
  error,
  total,
  siteLabel,
  sourceLabel,
}: {
  guests: AccommodationGuestListRow[];
  error?: string;
  total?: number;
  siteLabel?: string;
  sourceLabel?: string;
}) {
  const router = useRouter();

  if (error) {
    return (
      <div className="dg-card border-amber-500/30">
        <p className="text-amber-300">{error}</p>
        <p className="mt-2 text-sm text-slate-500">
          Sync stay bookings or ensure WordPress guests are available. Guests are Contacts with
          Accommodation context — not a separate people object.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {siteLabel || total != null || sourceLabel ? (
        <p className="text-sm text-slate-500">
          {siteLabel ? `${siteLabel}` : ""}
          {sourceLabel ? `${siteLabel ? " · " : ""}${sourceLabel}` : ""}
          {total != null ? ` · ${total} guests` : ""}
        </p>
      ) : null}

      {!guests.length ? (
        <div className="dg-card border-dashed border-slate-700">
          <p className="text-slate-300">No accommodation guests yet.</p>
          <p className="mt-2 text-sm text-slate-500">
            Guests appear when stay bookings sync and link to Contacts, or when WordPress guest
            rows are imported.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Stays</th>
                <th className="px-4 py-3">LTV</th>
                <th className="px-4 py-3">Last stay</th>
                <th className="px-4 py-3">Favourite unit</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {guests.map((g) => (
                <tr
                  key={g.contactId}
                  className="cursor-pointer hover:bg-slate-900/40"
                  onClick={() => router.push(`/apps/accommodation/guests/${g.contactId}`)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{g.displayName}</div>
                    <div className="text-xs text-slate-500">
                      {[g.email, g.phone].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-slate-600 px-2 py-0.5 text-xs text-slate-300">
                      {g.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{g.stayCount}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatSpendAud(g.totalSpendCents)}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{g.lastStayAt ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{g.favouriteUnit ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {g.repeatGuest ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                          Repeat Guest
                        </span>
                      ) : null}
                      {g.vip ? (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">
                          VIP
                        </span>
                      ) : null}
                      {!g.repeatGuest && !g.vip ? (
                        <span className="text-slate-500">—</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Each guest is a universal{" "}
        <Link href="/apps/crm/contacts" className="text-blue-400 hover:underline">
          Contact
        </Link>{" "}
        with Accommodation context — not a separate Guest object.
      </p>
    </div>
  );
}
