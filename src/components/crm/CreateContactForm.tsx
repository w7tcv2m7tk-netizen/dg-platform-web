"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateContactForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    const res = await fetch("/api/v1/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: data.get("firstName"),
        lastName: data.get("lastName") || undefined,
        email: data.get("email") || undefined,
        phone: data.get("phone") || undefined,
        source: data.get("source") || "manual",
      }),
    });

    setPending(false);

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(json?.error?.message ?? "Failed to create contact");
      return;
    }

    form.reset();
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
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            placeholder="Jane"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Last name</span>
          <input
            name="lastName"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            placeholder="Smith"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Email</span>
          <input
            name="email"
            type="email"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            placeholder="jane@example.com"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Phone</span>
          <input
            name="phone"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            placeholder="+61 400 000 000"
          />
        </label>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Add contact"}
      </button>
    </form>
  );
}
