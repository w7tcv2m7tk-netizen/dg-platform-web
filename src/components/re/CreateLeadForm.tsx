"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { usePendingAction } from "@/hooks/usePendingAction";

export function CreateLeadForm({
  leadType = "vendor",
}: {
  leadType?: "vendor" | "buyer";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [notes, setNotes] = useState("");
  const { pending, error, setError, run, startTransition } = usePendingAction();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      const res = await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadType,
          name,
          email,
          phone,
          propertyAddress,
          notes,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = json.error?.message ?? "Could not create lead";
        setError(message);
        throw new Error(message);
      }
      setName("");
      setEmail("");
      setPhone("");
      setPropertyAddress("");
      setNotes("");
      setOpen(false);
      startTransition(() => {
        router.refresh();
      });
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="dg-btn border border-slate-600 text-slate-200 hover:border-blue-500 hover:text-white"
      >
        Add {leadType} lead
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="dg-card w-full max-w-lg space-y-3 border border-slate-700"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-white">
          New {leadType === "buyer" ? "buyer" : "vendor"} lead
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="dg-touch-target px-2 text-sm text-slate-400 hover:text-white"
        >
          Cancel
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Stored in Platform (Neon) — WordPress sync not required.
      </p>
      <label className="block min-w-0 text-sm">
        <span className="text-slate-400">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="dg-input mt-1"
        />
      </label>
      <label className="block min-w-0 text-sm">
        <span className="text-slate-400">Property address</span>
        <input
          value={propertyAddress}
          onChange={(e) => setPropertyAddress(e.target.value)}
          className="dg-input mt-1"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block min-w-0 text-sm">
          <span className="text-slate-400">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="dg-input mt-1"
            autoComplete="email"
          />
        </label>
        <label className="block min-w-0 text-sm">
          <span className="text-slate-400">Phone</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="dg-input mt-1"
            autoComplete="tel"
          />
        </label>
      </div>
      <label className="block min-w-0 text-sm">
        <span className="text-slate-400">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="dg-input mt-1"
        />
      </label>
      {error ? <p className="text-sm text-amber-400">{error}</p> : null}
      <button type="submit" disabled={pending} className="dg-btn dg-btn-primary">
        {pending ? "Creating…" : "Create lead"}
      </button>
    </form>
  );
}
