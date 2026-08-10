"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function WantdHomeSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    // Property is the live vertical — route searches there for MVP.
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const qs = params.toString();
    router.push(qs ? `/wantd/property?${qs}` : "/wantd/property");
  }

  return (
    <form onSubmit={onSubmit} className="wantd-card flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center sm:p-2 sm:pl-4">
      <label className="sr-only" htmlFor="wantd-search">
        Search for anything
      </label>
      <span className="hidden pl-2 text-[var(--wantd-tan)] sm:inline" aria-hidden>
        ⌕
      </span>
      <input
        id="wantd-search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search for anything…"
        className="wantd-input min-w-0 flex-1 rounded-xl border-0 bg-transparent px-3 py-3 text-base outline-none focus:outline-none sm:py-2.5"
      />
      <button
        type="submit"
        className="wantd-btn-search rounded-xl px-5 py-3 text-sm sm:py-2.5"
      >
        Search
      </button>
    </form>
  );
}
