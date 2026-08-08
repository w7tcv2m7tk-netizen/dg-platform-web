"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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

function stateStyles(state: string): {
  badge: string;
  border: string;
  icon: string;
} {
  switch (state) {
    case "pass":
      return {
        badge: "text-emerald-300 bg-emerald-950/50",
        border: "border-emerald-800/60",
        icon: "✓",
      };
    case "pending":
      return {
        badge: "text-amber-200 bg-amber-950/40",
        border: "border-amber-800/50",
        icon: "…",
      };
    case "fail":
      return {
        badge: "text-rose-300 bg-rose-950/40",
        border: "border-rose-900/50",
        icon: "!",
      };
    case "skipped":
      return {
        badge: "text-slate-500 bg-slate-900/60",
        border: "border-slate-800",
        icon: "–",
      };
    default:
      return {
        badge: "text-slate-400 bg-slate-900/60",
        border: "border-slate-800",
        icon: "?",
      };
  }
}

const CORE_STEPS = ["domain", "dns", "ssl", "website"] as const;

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
  }, [refresh, website.status]);

  const coreItems = useMemo(() => {
    const byId = new Map(checklist.map((i) => [i.id, i]));
    return CORE_STEPS.map((id) => {
      if (id === "website") {
        return (
          byId.get("website") ?? {
            id: "website",
            label: "Published",
            state: website.status === "published" ? "pass" : "pending",
            detail:
              website.status === "published"
                ? `Live · /sites/${website.slug}`
                : "Publish from Studio",
          }
        );
      }
      return (
        byId.get(id) ?? {
          id,
          label: id === "dns" ? "DNS" : id === "ssl" ? "SSL" : "Domain",
          state: "unknown",
        }
      );
    });
  }, [checklist, website.slug, website.status]);

  const nextHint = useMemo(() => {
    const pending = coreItems.find((i) => i.state !== "pass" && i.state !== "skipped");
    if (!pending) return "Ready — domain path live when DNS propagates.";
    if (pending.id === "domain") return "Connect or register a domain first.";
    if (pending.id === "dns") return "Apply hosting DNS (CNAME/A to Vercel target).";
    if (pending.id === "ssl") return "SSL provisions automatically after DNS points at hosting.";
    if (pending.id === "website") return "Publish the website when content looks good.";
    return pending.detail || "Complete the remaining checklist items.";
  }, [coreItems]);

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
    <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white">Make it live</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Domain → DNS → SSL → Published
          </p>
        </div>
        <span className="rounded-full border border-slate-700 px-2.5 py-0.5 text-xs text-slate-300">
          {score}% ready
        </span>
      </div>

      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {coreItems.map((item, index) => {
          const styles = stateStyles(item.state);
          return (
            <li
              key={item.id}
              className={`rounded-md border ${styles.border} px-3 py-2.5`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wide text-slate-500">
                  {index + 1}. {item.label}
                </span>
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[11px] font-semibold ${styles.badge}`}
                >
                  {styles.icon}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300 capitalize">{item.state}</p>
              {item.detail ? (
                <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
                  {item.detail}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      <p className="text-xs text-slate-400">
        Next: {nextHint} Preview stays at{" "}
        <code className="text-slate-300">/sites/{website.slug}</code>
        {" · "}
        <Link href="/apps/websites/domains" className="text-sky-400 hover:underline">
          Domains
        </Link>
        {" · "}
        <Link href="/apps/websites/hosting" className="text-sky-400 hover:underline">
          Hosting
        </Link>
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
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
                {d.websiteId === website.id ? " · linked" : ""}
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
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={applyDns}
            onChange={(e) => setApplyDns(e.target.checked)}
          />
          Apply hosting DNS
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={publish}
            onChange={(e) => setPublish(e.target.checked)}
          />
          Publish website
        </label>
      </div>

      <button
        type="button"
        disabled={busy || (!domainId && !newDomain.trim())}
        onClick={() => void runGoLive()}
        className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Working…" : "Connect & go live"}
      </button>

      {status ? <p className="text-xs text-slate-500">{status}</p> : null}
    </section>
  );
}
