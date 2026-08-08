"use client";

import { useCallback, useEffect, useState } from "react";
import type { SerializedWebsite } from "@dg/platform-core";

type ChecklistItem = {
  id: string;
  label: string;
  state: string;
  detail?: string;
};

type InventoryDomain = {
  id: string;
  name: string;
  status: string;
  websiteId: string | null;
};

export function MakeItLivePanel({ website }: { website: SerializedWebsite }) {
  const [domains, setDomains] = useState<InventoryDomain[]>([]);
  const [domainId, setDomainId] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [applyDns, setApplyDns] = useState(true);
  const [publish, setPublish] = useState(true);

  const refresh = useCallback(async () => {
    const [domRes, liveRes] = await Promise.all([
      fetch("/api/v1/infrastructure/domains"),
      fetch(
        `/api/v1/infrastructure/go-live?websiteId=${encodeURIComponent(website.id)}`,
      ),
    ]);
    const domJson = (await domRes.json()) as { data?: InventoryDomain[] };
    const liveJson = (await liveRes.json()) as {
      data?: { checklist?: { items?: ChecklistItem[]; score?: number } };
    };
    setDomains(domJson.data ?? []);
    const linked = (domJson.data ?? []).find((d) => d.websiteId === website.id);
    if (linked) setDomainId(linked.id);
    setChecklist(liveJson.data?.checklist?.items ?? []);
    setScore(liveJson.data?.checklist?.score ?? 0);
  }, [website.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runGoLive() {
    setBusy(true);
    setStatus("Making live…");
    const res = await fetch("/api/v1/infrastructure/go-live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteId: website.id,
        domainId: domainId || undefined,
        domain: !domainId && newDomain.trim() ? newDomain.trim() : undefined,
        applyDns,
        attachVercel: true,
        publish,
      }),
    });
    const json = (await res.json()) as {
      data?: { checklist?: { items?: ChecklistItem[]; score?: number } };
      error?: { message?: string };
    };
    if (res.ok) {
      setChecklist(json.data?.checklist?.items ?? []);
      setScore(json.data?.checklist?.score ?? 0);
      setStatus("Go-live steps submitted");
      await refresh();
    } else {
      setStatus(json.error?.message || "Go-live failed");
    }
    setBusy(false);
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">Make it live</h2>
        <span className="text-xs text-slate-500">Checklist {score}%</span>
      </div>
      <p className="text-xs text-slate-400">
        Connect domain → DNS → SSL (auto) → publish. Path preview stays at{" "}
        <code className="text-slate-300">/sites/{website.slug}</code>.
      </p>

      <label className="block text-xs text-slate-500">
        Existing domain
        <select
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white"
          value={domainId}
          onChange={(e) => setDomainId(e.target.value)}
        >
          <option value="">— Select —</option>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.status})
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs text-slate-500">
        Or connect new hostname
        <input
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white"
          placeholder="www.example.com.au"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          disabled={Boolean(domainId)}
        />
      </label>

      <label className="flex items-center gap-2 text-xs text-slate-400">
        <input
          type="checkbox"
          checked={applyDns}
          onChange={(e) => setApplyDns(e.target.checked)}
        />
        Apply hosting DNS (CNAME to Vercel target)
      </label>
      <label className="flex items-center gap-2 text-xs text-slate-400">
        <input
          type="checkbox"
          checked={publish}
          onChange={(e) => setPublish(e.target.checked)}
        />
        Publish website
      </label>

      <button
        type="button"
        disabled={busy || (!domainId && !newDomain.trim())}
        onClick={() => void runGoLive()}
        className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Working…" : "Connect & go live"}
      </button>

      {status ? <p className="text-xs text-slate-500">{status}</p> : null}

      <ul className="grid gap-1 sm:grid-cols-2">
        {checklist.map((item) => (
          <li
            key={item.id}
            className="rounded border border-slate-800 px-2 py-1.5 text-xs text-slate-400"
          >
            <span className="text-slate-200">{item.label}</span>
            <span className="ml-2 text-slate-600">{item.state}</span>
            {item.detail ? (
              <span className="mt-0.5 block text-[11px] text-slate-600">
                {item.detail}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
