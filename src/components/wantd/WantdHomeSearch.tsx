"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { WANTD_PLACEHOLDERS } from "@dg/platform-core";

export function WantdHomeSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    if (q.trim()) return;
    const id = window.setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % WANTD_PLACEHOLDERS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [q]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const qs = params.toString();
    router.push(qs ? `/wantd/property?${qs}` : "/wantd/property");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="wantd-card flex flex-col gap-3 rounded-[1.35rem] p-3 shadow-[0_18px_50px_rgba(18,18,18,0.06)]"
    >
      <label className="sr-only" htmlFor="wantd-search">
        Tell us what you want
      </label>
      <textarea
        id="wantd-search"
        name="q"
        rows={3}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={WANTD_PLACEHOLDERS[placeholderIndex]}
        className="wantd-input min-w-0 flex-1 rounded-xl border-0 bg-transparent px-3 py-3 text-base outline-none focus:outline-none"
      />
      <div className="flex items-center justify-between gap-3 px-1 pb-1">
        <span className="wantd-muted text-xs">Property is live. More categories next.</span>
        <button type="submit" className="wantd-btn-search rounded-full px-5 py-2.5 text-sm">
          Find it
        </button>
      </div>
    </form>
  );
}
