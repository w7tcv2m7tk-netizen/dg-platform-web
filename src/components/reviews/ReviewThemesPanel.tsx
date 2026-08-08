"use client";

import { useState } from "react";

type ReviewTheme = {
  theme: string;
  sentiment: string;
  mentionShare: number;
  evidence: string[];
};

type ThemesResult = {
  themes: ReviewTheme[];
  summary: string;
  source: string;
  provider?: string;
  model?: string;
};

type FeedItem = {
  id: string;
  source: string;
  authorName?: string | null;
  rating?: number | null;
  title?: string | null;
  content?: string | null;
  reviewDate?: string | null;
};

export function ReviewThemesPanel({
  reviews,
  initial,
}: {
  reviews: FeedItem[];
  initial: ThemesResult;
}) {
  const [result, setResult] = useState(initial);
  const [pending, setPending] = useState(false);

  async function refresh() {
    setPending(true);
    try {
      const res = await fetch("/api/v1/reviews/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.data) setResult(json.data as ThemesResult);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="dg-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">AI theme intelligence</h2>
          <p className="mt-1 text-xs text-slate-500">
            Source: {result.source}
            {result.provider ? ` · ${result.provider}` : ""}
            {result.model ? ` / ${result.model}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={pending || reviews.length === 0}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-600 disabled:opacity-50"
        >
          {pending ? "Extracting…" : "Re-run themes"}
        </button>
      </div>
      <p className="mt-3 text-sm text-slate-300">{result.summary}</p>
      <ul className="mt-4 space-y-3">
        {result.themes.map((theme) => (
          <li key={theme.theme} className="rounded-lg border border-slate-800 px-3 py-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-white">{theme.theme}</p>
              <p className="text-xs text-slate-500">
                {theme.sentiment} · ~{theme.mentionShare}%
              </p>
            </div>
            {theme.evidence?.length ? (
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                {theme.evidence.join(" · ")}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
