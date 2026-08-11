"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PublishToWebsiteButton({
  propertyId,
  status,
  permalink,
  wpPropertyId,
  hiddenFromWebsite = false,
}: {
  propertyId: string;
  status: string;
  permalink?: string;
  wpPropertyId?: number | string;
  hiddenFromWebsite?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const liveStatuses = new Set([
    "listed",
    "under_offer",
    "contract_signed",
    "unconditional",
    "sold",
    "withdrawn",
  ]);
  const needsForce = !liveStatuses.has(status);

  async function publish() {
    setPending(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/v1/properties/${propertyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "publish_to_website",
        force: needsForce,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not publish to website");
      return;
    }
    const created = json.data?.publish?.created;
    const url = json.data?.publish?.permalink as string | undefined;
    setMessage(
      created
        ? url
          ? `Published — ${url}`
          : "Published to website"
        : url
          ? `Updated — ${url}`
          : "Updated on website",
    );
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {hiddenFromWebsite ? (
        <p className="text-sm text-amber-300/90">
          This listing is hidden from the public website. Uncheck Hide listing to publish.
        </p>
      ) : permalink || wpPropertyId ? (
        <p className="text-sm text-slate-400">
          On website:{" "}
          {permalink ? (
            <a
              href={permalink}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline"
            >
              View listing →
            </a>
          ) : (
            <span className="text-slate-300">WP #{wpPropertyId}</span>
          )}
        </p>
      ) : (
        <p className="text-sm text-slate-400">
          Not on the website yet. Set status to <span className="text-slate-200">Listed</span> to
          auto-publish, or publish now.
        </p>
      )}

      <button
        type="button"
        disabled={pending || hiddenFromWebsite}
        onClick={publish}
        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {pending
          ? "Publishing…"
          : hiddenFromWebsite
            ? "Hidden from website"
          : permalink || wpPropertyId
            ? "Update on website"
            : needsForce
              ? "Publish draft to website"
              : "Publish to website"}
      </button>

      {needsForce && !hiddenFromWebsite ? (
        <p className="text-xs text-slate-500">
          Prospect/appraisal publishes as a draft on WordPress until status is Listed.
        </p>
      ) : null}

      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-amber-400">{error}</p> : null}
    </div>
  );
}
