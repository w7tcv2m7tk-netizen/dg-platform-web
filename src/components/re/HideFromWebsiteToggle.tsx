"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HideFromWebsiteToggle({
  propertyId,
  hidden,
}: {
  propertyId: string;
  hidden: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onToggle(next: boolean) {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/v1/properties/${propertyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "set_website_hidden",
        hidden: next,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not update website visibility");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500"
          checked={hidden}
          disabled={pending}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <span>
          <span className="block text-sm font-medium text-white">Hide listing</span>
          <span className="mt-0.5 block text-xs text-slate-400">
            Keep this property in Gen 2 for agents, but hide it from the public website.
            Does not change listing status or portal syndication.
          </span>
        </span>
      </label>
      {hidden ? (
        <p className="text-xs text-amber-300/90">
          Hidden from public site — still visible here with a Hidden badge.
        </p>
      ) : null}
      {error ? <p className="text-sm text-amber-400">{error}</p> : null}
    </div>
  );
}
