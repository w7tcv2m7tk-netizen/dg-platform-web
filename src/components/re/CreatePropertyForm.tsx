"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AddressInput } from "@/components/re/AddressInput";

export function CreatePropertyForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressLine1, setAddressLine1] = useState("");
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState("QLD");
  const [postcode, setPostcode] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const res = await fetch("/api/v1/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawAddress: addressLine1,
        addressLine1,
        suburb,
        state,
        postcode,
        status: "prospect",
      }),
    });

    const json = await res.json().catch(() => null);
    setPending(false);

    if (!res.ok) {
      setError(json?.error?.message ?? "Could not create property");
      return;
    }

    setOpen(false);
    setAddressLine1("");
    setSuburb("");
    setState("QLD");
    setPostcode("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
      >
        Add property
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <h2 className="text-lg font-semibold text-white">New property</h2>
      <p className="mt-1 text-sm text-slate-400">
        Enter an address — suburb and postcode are filled automatically when possible.
      </p>

      <div className="mt-4">
        <AddressInput
          value={addressLine1}
          onChange={setAddressLine1}
          suburb={suburb}
          state={state}
          postcode={postcode}
          onSuburbChange={setSuburb}
          onStateChange={setState}
          onPostcodeChange={setPostcode}
          required
        />
      </div>

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={pending || !addressLine1.trim()}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create property"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
