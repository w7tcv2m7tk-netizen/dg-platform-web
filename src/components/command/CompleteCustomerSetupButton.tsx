"use client";

import { useState } from "react";

export function CompleteCustomerSetupButton({
  organisationId,
  organisationName,
}: {
  organisationId: string;
  organisationName: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openSetup() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/v1/org/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organisationId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPending(false);
      if (res.status === 403) {
        setError("Live setup is only available where you are an actual member of the business.");
        return;
      }
      setError(json.error?.message ?? "Could not open live setup");
      return;
    }
    window.location.assign("/onboarding");
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void openSetup()}
        disabled={pending}
        className="inline-flex min-h-10 items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-60"
      >
        {pending ? `Opening ${organisationName}…` : "Complete setup"}
      </button>
      {error ? <p className="mt-2 max-w-md text-xs text-amber-300">{error}</p> : null}
    </div>
  );
}
