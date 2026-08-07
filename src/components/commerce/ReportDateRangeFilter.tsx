"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function ReportDateRangeFilter({
  basePath,
}: {
  basePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const q = params.toString();
    router.push(q ? `${basePath}?${q}` : basePath);
  }

  return (
    <form
      onSubmit={apply}
      className="flex flex-wrap items-end gap-3 print:hidden"
    >
      <label className="text-sm">
        <span className="text-slate-400">From</span>
        <input
          type="date"
          className="mt-1 block rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </label>
      <label className="text-sm">
        <span className="text-slate-400">To</span>
        <input
          type="date"
          className="mt-1 block rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>
      <button
        type="submit"
        className="rounded-full bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
      >
        Apply
      </button>
    </form>
  );
}
