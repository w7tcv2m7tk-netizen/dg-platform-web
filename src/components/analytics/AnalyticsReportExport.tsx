"use client";

import { useState } from "react";

export function AnalyticsReportExport({ snapshot }: { snapshot: Record<string, unknown> }) {
  const [downloaded, setDownloaded] = useState(false);

  function downloadJson() {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `analytics-report-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  }

  return (
    <button
      type="button"
      onClick={downloadJson}
      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
    >
      {downloaded ? "Downloaded" : "Download JSON snapshot"}
    </button>
  );
}
