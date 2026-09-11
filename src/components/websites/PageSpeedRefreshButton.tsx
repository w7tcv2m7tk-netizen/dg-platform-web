"use client";

import { useState } from "react";

type PageSpeedSnapshot = {
  mobile: number | null;
  desktop: number | null;
  checkedAt: string | null;
};

function formatCheckedAt(value: string | null) {
  if (!value) return "not measured yet";
  return new Date(value).toLocaleString("en-AU");
}

export function PageSpeedRefreshButton({
  websiteId,
  initial,
}: {
  websiteId: string;
  initial: PageSpeedSnapshot;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PageSpeedSnapshot>(initial);
  const [status, setStatus] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch(`/api/v1/websites/${websiteId}/pagespeed`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        data?: PageSpeedSnapshot;
        error?: { message?: string };
      };
      if (!res.ok || !json.data) {
        setError(json.error?.message || "PageSpeed could not be refreshed right now.");
        return;
      }
      setResult(json.data);
      setStatus("PageSpeed refreshed");
    } catch {
      setError("PageSpeed could not be refreshed right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-1 space-y-1">
      <p className="text-sm text-slate-300">
        Mobile {result.mobile ?? "—"} · Desktop {result.desktop ?? "—"} · {formatCheckedAt(result.checkedAt)}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => void run()}
          className="text-xs text-sky-400 hover:underline disabled:opacity-50"
        >
          {busy ? "Running PageSpeed…" : "Refresh PageSpeed"}
        </button>
        {status ? <p className="text-xs text-emerald-300">{status}</p> : null}
      </div>
      {error ? <p className="text-xs text-amber-300">{error}</p> : null}
    </div>
  );
}
