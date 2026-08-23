"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreatePmPropertyForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/property-management/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(fd.get("name") ?? ""),
        addressLine1: String(fd.get("addressLine1") ?? ""),
        suburb: String(fd.get("suburb") ?? ""),
        state: String(fd.get("state") ?? "") || undefined,
        postcode: String(fd.get("postcode") ?? "") || undefined,
        propertyType: String(fd.get("propertyType") ?? "") || undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not create property");
      return;
    }
    setOpen(false);
    e.currentTarget.reset();
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
      >
        Add property
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="dg-card space-y-3">
      <h3 className="font-semibold text-white">New rental property</h3>
      <input
        name="name"
        required
        placeholder="Property name / label"
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
      />
      <input
        name="addressLine1"
        required
        placeholder="Address"
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          name="suburb"
          required
          placeholder="Suburb"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <input
          name="state"
          placeholder="State"
          defaultValue="QLD"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <input
          name="postcode"
          placeholder="Postcode"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
      </div>
      <input
        name="propertyType"
        placeholder="Type (house, unit, townhouse…)"
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
      />
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Create"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
