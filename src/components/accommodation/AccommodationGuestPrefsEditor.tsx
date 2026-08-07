"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AccommodationGuestPanelData } from "@/components/accommodation/AccommodationGuestPanel";

export function AccommodationGuestPrefsEditor({
  guest,
}: {
  guest: AccommodationGuestPanelData & {
    displayName?: string;
    email?: string | null;
    phone?: string | null;
    legacyWpGuestId?: number | null;
  };
}) {
  const router = useRouter();
  const [vip, setVip] = useState(Boolean(guest.vip));
  const [marketingConsent, setMarketingConsent] = useState<boolean | null>(
    guest.marketingConsent ?? null,
  );
  const [preferences, setPreferences] = useState(guest.preferences ?? "");
  const [specialRequests, setSpecialRequests] = useState(guest.specialRequests ?? "");
  const [guestNotes, setGuestNotes] = useState(guest.guestNotes ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);
    const res = await fetch("/api/v1/accommodation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_guest_profile",
        contactId: guest.contactId,
        vip,
        marketingConsent,
        preferences,
        specialRequests,
        guestNotes,
        displayName: guest.displayName,
        email: guest.email,
        phone: guest.phone,
      }),
    });
    const json = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok) {
      setError(json?.error?.message ?? "Could not save guest preferences");
      return;
    }

    const wpSync = json?.data?.wpSync as
      | {
          attempted?: boolean;
          ok?: boolean;
          message?: string;
        }
      | undefined;

    if (wpSync?.attempted) {
      if (wpSync.ok) {
        setMessage(`Guest preferences saved · ${wpSync.message ?? "WordPress synced"}`);
      } else {
        setMessage("Guest preferences saved on Contact");
        setError(wpSync.message ?? "WordPress sync did not match a guest");
      }
    } else {
      setMessage("Guest preferences saved");
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={save}
      className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
    >
      <div>
        <h2 className="font-semibold text-white">Guest preferences</h2>
        <p className="mt-1 text-sm text-slate-500">
          Stored on Contact guest profile. VIP, notes, preferences, and special requests sync to
          WordPress when a guest is linked by id, contact, or email
          {guest.legacyWpGuestId != null ? ` (WP #${guest.legacyWpGuestId})` : ""}.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2 text-slate-300">
          <input
            type="checkbox"
            checked={vip}
            onChange={(e) => setVip(e.target.checked)}
            className="rounded border-slate-600"
          />
          VIP
        </label>
        <label className="flex items-center gap-2 text-slate-300">
          Marketing consent
          <select
            value={marketingConsent == null ? "" : marketingConsent ? "yes" : "no"}
            onChange={(e) => {
              const v = e.target.value;
              setMarketingConsent(v === "" ? null : v === "yes");
            }}
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
          >
            <option value="">Unknown</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
      </div>

      <label className="block text-sm text-slate-400">
        Preferences
        <textarea
          rows={3}
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          placeholder="Pillow firmness, quiet unit, late checkout…"
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        />
      </label>

      <label className="block text-sm text-slate-400">
        Special requests
        <textarea
          rows={3}
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        />
      </label>

      <label className="block text-sm text-slate-400">
        Guest notes
        <textarea
          rows={3}
          value={guestNotes}
          onChange={(e) => setGuestNotes(e.target.value)}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        />
      </label>

      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-amber-400">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}
