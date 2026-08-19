"use client";

import { useState } from "react";
import { DEMO_BANNER_COPY } from "@dg/platform-core";

export function DemoModeBanner({ canReset }: { canReset: boolean }) {
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  async function reset() {
    setStatus("saving");
    const res = await fetch("/api/v1/demo/reset", { method: "POST" });
    if (!res.ok) {
      setStatus("error");
      return;
    }
    setStatus("done");
    window.location.reload();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm text-amber-50">
      <p className="font-medium tracking-wide">{DEMO_BANNER_COPY}</p>
      {canReset ? (
        <button
          type="button"
          onClick={() => void reset()}
          disabled={status === "saving"}
          className="shrink-0 rounded-full border border-amber-400/50 px-3 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-500/20 disabled:opacity-60"
        >
          {status === "saving" ? "Resetting…" : "Reset Demo"}
        </button>
      ) : null}
    </div>
  );
}
