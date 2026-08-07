"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ConvertToOpportunityButton({
  leadId,
  existingOpportunityId,
}: {
  leadId: string;
  existingOpportunityId?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (existingOpportunityId) {
    return (
      <Link
        href={`/apps/crm/opportunities/${existingOpportunityId}`}
        className="inline-block rounded-full border border-emerald-600/60 px-4 py-2 text-sm font-medium text-emerald-300 hover:border-emerald-500"
      >
        Open opportunity →
      </Link>
    );
  }

  async function convert() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/v1/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "convert_lead", leadId }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not convert lead");
      return;
    }
    const id = json.data?.id as string | undefined;
    if (id) {
      router.push(`/apps/crm/opportunities/${id}`);
      router.refresh();
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={convert}
        disabled={pending}
        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {pending ? "Converting…" : "Convert to opportunity"}
      </button>
      {error ? <p className="mt-2 text-sm text-amber-400">{error}</p> : null}
    </div>
  );
}
