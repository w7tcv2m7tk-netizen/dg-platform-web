"use client";

import { useState } from "react";
import type { ReviewFeedItem } from "@dg/platform-core";

export function ReviewReplyDraftButton({
  review,
  businessName,
}: {
  review: ReviewFeedItem;
  businessName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/reviews/reply-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review, businessName, persist: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not draft reply");
        return;
      }
      setDraft(json.data?.draft ?? null);
      setSource(json.data?.source ?? null);
      setOpen(true);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="rounded-full border border-slate-600 px-3 py-1 text-xs font-medium text-slate-200 hover:border-blue-500 disabled:opacity-50"
      >
        {loading ? "Drafting…" : "Draft reply"}
      </button>
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
      {open && draft ? (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Suggested reply{source ? ` · ${source}` : ""}
            </p>
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-slate-300"
              onClick={() => setOpen(false)}
            >
              Hide
            </button>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{draft}</p>
          <p className="mt-2 text-xs text-slate-500">
            Saved as an Activity draft — paste into Airbnb / Booking / GBP when ready. Publish APIs
            are not connected yet.
          </p>
        </div>
      ) : null}
    </div>
  );
}
