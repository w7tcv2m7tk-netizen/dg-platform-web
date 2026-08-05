"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StartAppraisalButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startAppraisal() {
    setPending(true);
    setError(null);

    const res = await fetch("/api/v1/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "from_lead", leadId }),
    });

    const json = await res.json().catch(() => null);
    setPending(false);

    if (!res.ok) {
      setError(json?.error?.message ?? "Failed to create property");
      return;
    }

    const propertyId = json?.data?.id as string | undefined;
    if (propertyId) {
      router.push(`/apps/re/properties/${propertyId}`);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={startAppraisal}
        disabled={pending}
        className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Start appraisal → property"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
