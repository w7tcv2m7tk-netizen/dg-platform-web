"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuPhoneInput } from "@/components/ui/AuPhoneInput";

export function ReBookingsPanel({
  bookings,
  error,
}: {
  bookings: Array<{
    id: string;
    contactName?: string | null;
    email?: string;
    phone?: string;
    service?: string;
    scheduledAt?: string;
    status: string;
  }>;
  error?: string;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("Appraisal");
  const [scheduledAt, setScheduledAt] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  async function createBooking(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    const res = await fetch("/api/v1/re/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactName,
        email: email || undefined,
        phone: phone || undefined,
        service: service || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setCreateError(json.error?.message ?? "Could not create booking");
      return;
    }
    setContactName("");
    setEmail("");
    setPhone("");
    setService("Appraisal");
    setScheduledAt("");
    setShowCreate(false);
    router.refresh();
  }

  if (error) {
    return (
      <div className="dg-card border-amber-500/30">
        <p className="text-amber-300">{error}</p>
        <p className="mt-2 text-sm text-slate-500">Could not load Platform bookings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-full border border-slate-600 px-5 py-2 text-sm font-semibold text-slate-200 hover:border-blue-500"
        >
          {showCreate ? "Cancel" : "Add booking"}
        </button>
      </div>

      {showCreate ? (
        <form onSubmit={createBooking} className="dg-card max-w-lg space-y-3 border border-slate-700">
          <h3 className="font-semibold text-white">New appraisal booking</h3>
          <p className="text-xs text-slate-500">Stored natively in Platform Core and linked to your CRM data.</p>
          <label className="block text-sm">
            <span className="text-slate-400">Name</span>
            <input required value={contactName} onChange={(e) => setContactName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-slate-400">Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Phone</span>
              <AuPhoneInput value={phone} onValueChange={setPhone} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" placeholder="0412 345 678" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-slate-400">Service</span>
              <input value={service} onChange={(e) => setService(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">When</span>
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
            </label>
          </div>
          <button type="submit" disabled={creating} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
            {creating ? "Saving…" : "Create booking"}
          </button>
          {createError ? <p className="text-sm text-amber-400">{createError}</p> : null}
        </form>
      ) : null}

      {!bookings.length ? (
        <div className="dg-card border-dashed border-slate-700">
          <h2 className="text-lg font-semibold text-white">Add your first appraisal booking</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-400">Create a booking above. New bookings are stored natively in Platform Core.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Guest</th><th className="px-4 py-3">Service</th><th className="px-4 py-3">When</th><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-900/40">
                  <td className="px-4 py-3"><p className="font-medium text-white">{b.contactName || "—"}</p><p className="text-xs text-slate-500">{b.email || b.phone || ""}</p></td>
                  <td className="px-4 py-3 text-slate-300">{b.service ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{b.scheduledAt ? new Date(b.scheduledAt).toLocaleString("en-AU") : "—"}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs capitalize text-slate-300">{b.status ?? "pending"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
