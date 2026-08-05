"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EditContactForm({
  contact,
}: {
  contact: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    source?: string | null;
    tags?: string | null;
  };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);

    const form = e.currentTarget;
    const data = new FormData(form);

    const res = await fetch(`/api/v1/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: data.get("firstName"),
        lastName: data.get("lastName") || undefined,
        email: data.get("email") || undefined,
        phone: data.get("phone") || undefined,
        source: data.get("source") || undefined,
        tags: data.get("tags") || undefined,
      }),
    });

    setPending(false);

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(json?.error?.message ?? "Failed to update contact");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-slate-400">First name *</span>
          <input
            name="firstName"
            required
            defaultValue={contact.firstName}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Last name</span>
          <input
            name="lastName"
            defaultValue={contact.lastName ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={contact.email ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Phone</span>
          <input
            name="phone"
            defaultValue={contact.phone ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Source</span>
          <input
            name="source"
            defaultValue={contact.source ?? "manual"}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Tags</span>
          <input
            name="tags"
            defaultValue={contact.tags ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            placeholder="vendor, referral"
          />
        </label>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {saved ? (
        <p className="text-sm text-emerald-400/90">Saved — check timeline for update event.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
