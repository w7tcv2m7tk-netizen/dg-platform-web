"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProspectBusinessSearch } from "@/components/prospecting/ProspectBusinessSearch";

export type EditProspectFields = {
  id: string;
  businessName: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  industry?: string | null;
  location?: string | null;
  websiteUrl?: string | null;
};

export function EditProspectForm({
  prospect,
  compact = false,
}: {
  prospect: EditProspectFields;
  /** Smaller trigger for pipeline cards */
  compact?: boolean;
}) {
  const router = useRouter();
  const [details, setDetails] = useState({ websiteUrl: prospect.websiteUrl ?? "", contactPhone: prospect.contactPhone ?? "", location: prospect.location ?? "" });
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    const res = await fetch(`/api/v1/command/growth/prospects/${prospect.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: data.get("businessName"),
        contactName: String(data.get("contactName") ?? ""),
        contactEmail: String(data.get("contactEmail") ?? ""),
        contactPhone: String(data.get("contactPhone") ?? ""),
        industry: String(data.get("industry") ?? ""),
        location: String(data.get("location") ?? ""),
        websiteUrl: String(data.get("websiteUrl") ?? ""),
      }),
    });

    const json = await res.json().catch(() => null);
    setPending(false);

    if (!res.ok) {
      setError(json?.error?.message ?? "Could not update prospect");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setDetails({ websiteUrl: prospect.websiteUrl ?? "", contactPhone: prospect.contactPhone ?? "", location: prospect.location ?? "" }); setOpen(true); }}
        className={
          compact
            ? "rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-sky-500/40 hover:text-sky-200"
            : "text-xs text-sky-400 hover:underline"
        }
      >
        Edit
      </button>
    );
  }

  return (
    <div
      className={
        compact
          ? "mt-2 w-full space-y-3 rounded-lg border border-sky-500/30 bg-slate-950/80 p-3"
          : "mt-3 w-full basis-full space-y-3 rounded-xl border border-sky-500/30 bg-slate-950/60 p-4"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-400">Edit prospect</p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          Cancel
        </button>
      </div>
      <p className="text-xs text-slate-400">Choose a Google listing to fill available website, phone and location details. Review before saving. ABR verification remains in Business identity.</p>
      <ProspectBusinessSearch disabled={pending} onSelect={(business) => {
        if (!business.googlePlaceId) { setError("Use Business identity to verify the ABN. Choose a Google result here for website and contact details."); return; }
        setDetails(current => ({ websiteUrl: business.websiteUrl || current.websiteUrl, contactPhone: business.phone || current.contactPhone, location: business.location || current.location }));
        setError(null);
      }} />
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          <span className="text-xs text-slate-400">Business name *</span>
          <input
            name="businessName"
            required
            defaultValue={prospect.businessName}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-slate-400">Industry</span>
            <input
              name="industry"
              defaultValue={prospect.industry ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-400">Location</span>
            <input
              name="location"
              value={details.location}
              onChange={event => setDetails(current => ({ ...current, location: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-400">Contact name</span>
            <input
              name="contactName"
              defaultValue={prospect.contactName ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-400">Contact email</span>
            <input
              name="contactEmail"
              type="email"
              defaultValue={prospect.contactEmail ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-400">Phone</span>
            <input
              name="contactPhone"
              value={details.contactPhone}
              onChange={event => setDetails(current => ({ ...current, contactPhone: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-slate-400">Website</span>
            <input
              name="websiteUrl"
              value={details.websiteUrl}
              onChange={event => setDetails(current => ({ ...current, websiteUrl: event.target.value }))}
              placeholder="https://"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
