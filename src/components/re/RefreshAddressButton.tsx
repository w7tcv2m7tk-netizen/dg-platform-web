"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RefreshAddressButton({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function findAddress() {
    setPending(true);
    setError(null);
    setMessage(null);

    const res = await fetch(`/api/v1/properties/${propertyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "geocode_address" }),
    });

    const json = await res.json().catch(() => null);
    setPending(false);

    if (!res.ok) {
      setError(json?.error?.message ?? "Address lookup failed");
      return;
    }

    const confidence = json?.data?.metadata?.address_confidence;
    const source = json?.data?.metadata?.geocode_source;
    const cotalityId = json?.data?.metadata?.corelogic_property_id ??
      json?.data?.externalRefs?.corelogic_property_id;
    if (cotalityId != null && cotalityId !== "") {
      setMessage(`Address updated · Cotality id ${String(cotalityId)}`);
    } else if (confidence === "geocoded") {
      setMessage(
        source === "google"
          ? "Address found via Google"
          : "Address found automatically",
      );
    } else {
      setMessage(
        "No online match — kept local address hints. Add GOOGLE_GEOCODING_API_KEY for best results.",
      );
    }
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={findAddress}
        disabled={pending}
        className="rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white disabled:opacity-50"
      >
        {pending ? "Finding address…" : "Find address automatically"}
      </button>
      {message ? <p className="mt-2 text-sm text-emerald-400/90">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
