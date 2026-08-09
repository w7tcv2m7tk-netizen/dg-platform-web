"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type InventoryDomain = {
  id: string;
  name: string;
  status: string;
};

type AuthCheck = {
  id: string;
  label: string;
  state: string;
  detail?: string;
};

type AuthPlan = {
  identity: {
    domain: string;
    status: string;
    checks: AuthCheck[];
  };
  suggestedDns: Array<{
    type: string;
    name: string;
    content: string;
    purpose: string;
    priority?: number;
  }>;
  resendDomainId: string | null;
  resendStatus: string | null;
  created: boolean;
  note?: string;
};

type Overview = {
  checkedAt: string;
  docsPath: string;
  platform: { configured: boolean; message: string };
  tenantTransactional: { configured: boolean; message: string };
  mailbox: { configured: boolean; message: string };
  nextSteps: string[];
};

function stateClass(state: string) {
  if (state === "pass") return "text-emerald-300";
  if (state === "fail") return "text-rose-300";
  if (state === "pending") return "text-amber-200";
  if (state === "skipped") return "text-slate-500";
  return "text-slate-400";
}

export function EmailInfrastructureConsole({
  initialOverview,
}: {
  initialOverview: Overview;
}) {
  const [overview] = useState(initialOverview);
  const [domains, setDomains] = useState<InventoryDomain[]>([]);
  const [domain, setDomain] = useState("");
  const [authPlan, setAuthPlan] = useState<AuthPlan | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (selected?: string) => {
    const q = selected
      ? `?domain=${encodeURIComponent(selected)}`
      : "";
    const res = await fetch(`/api/v1/infrastructure/email${q}`);
    const json = (await res.json()) as {
      data?: {
        domains?: InventoryDomain[];
        authPlan?: AuthPlan | null;
      };
      error?: { message?: string };
    };
    if (!res.ok) {
      setStatus(json.error?.message || "Failed to load email status");
      return;
    }
    setDomains(json.data?.domains ?? []);
    if (selected) setAuthPlan(json.data?.authPlan ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!domain) {
      setAuthPlan(null);
      return;
    }
    void load(domain);
  }, [domain, load]);

  async function run(action: "prepare" | "apply" | "verify") {
    if (!domain) return;
    setBusy(true);
    setStatus(
      action === "prepare"
        ? "Preparing sending domain…"
        : action === "apply"
          ? "Applying auth DNS…"
          : "Checking verification…",
    );
    const res = await fetch("/api/v1/infrastructure/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, domain }),
    });
    const json = (await res.json()) as {
      data?: {
        message?: string;
        authPlan?: AuthPlan;
        verify?: { ok?: boolean; error?: string; status?: string | null };
      };
      error?: { message?: string; hint?: string };
    };
    if (res.ok) {
      if (json.data?.authPlan) setAuthPlan(json.data.authPlan);
      const parts = [json.data?.message || "Done"];
      if (json.data?.verify?.error) parts.push(json.data.verify.error);
      if (json.data?.verify?.status) {
        parts.push(`ESP status: ${json.data.verify.status}`);
      }
      setStatus(parts.join(" · "));
      await load(domain);
    } else {
      const bits = [json.error?.message || "Action failed"];
      if (json.error?.hint) bits.push(json.error.hint);
      setStatus(bits.join(" — "));
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-sky-50">
        DigitalGate Email orchestrates transactional send and auth DNS. Playbook:{" "}
        <code className="text-sky-200">{overview.docsPath}</code>
      </div>

      <section className="grid gap-3">
        <PlaneCard
          title="Platform transactional"
          ok={overview.platform.configured}
          body={overview.platform.message}
        />
        <PlaneCard
          title="Tenant transactional"
          ok={overview.tenantTransactional.configured}
          body={overview.tenantTransactional.message}
        />
        <PlaneCard
          title="Business mailbox"
          ok={overview.mailbox.configured}
          body={overview.mailbox.message}
        />
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-white">Sending domain</h2>
        <p className="text-sm text-slate-400">
          Connect a domain under Domains first, then Prepare → Apply auth DNS →
          Check verification. Apex website DNS is left alone; ESP records use
          the <code className="text-slate-300">send</code> path + DKIM hosts.
        </p>

        <label className="block text-xs text-slate-500">
          Domain in inventory
          <select
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          >
            <option value="">— Select —</option>
            {domains.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name} ({d.status})
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !domain}
            onClick={() => void run("prepare")}
            className="rounded-md bg-slate-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Prepare sending domain
          </button>
          <button
            type="button"
            disabled={busy || !domain}
            onClick={() => void run("apply")}
            className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Apply auth DNS
          </button>
          <button
            type="button"
            disabled={busy || !domain}
            onClick={() => void run("verify")}
            className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 disabled:opacity-50"
          >
            Check verification
          </button>
        </div>

        {status ? <p className="text-xs text-slate-500">{status}</p> : null}

        {authPlan ? (
          <div className="space-y-4 border-t border-slate-800 pt-4">
            <p className="text-sm text-slate-300">
              {authPlan.identity.domain} · ESP status:{" "}
              <span className="text-white">
                {authPlan.resendStatus ?? authPlan.identity.status}
              </span>
              {authPlan.note ? (
                <span className="text-slate-500"> · {authPlan.note}</span>
              ) : null}
            </p>
            <ul className="space-y-1 text-sm">
              {authPlan.identity.checks.map((c) => (
                <li key={c.id} className="flex gap-2">
                  <span className={`font-medium ${stateClass(c.state)}`}>
                    {c.label}
                  </span>
                  <span className="text-slate-500">
                    {c.state}
                    {c.detail ? ` — ${c.detail}` : ""}
                  </span>
                </li>
              ))}
            </ul>
            {authPlan.suggestedDns.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-400">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500">
                      <th className="py-1 pr-3 font-medium">Type</th>
                      <th className="py-1 pr-3 font-medium">Name</th>
                      <th className="py-1 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {authPlan.suggestedDns.map((r, i) => (
                      <tr
                        key={`${r.type}-${r.name}-${i}`}
                        className="border-b border-slate-900 align-top"
                      >
                        <td className="py-1.5 pr-3 text-slate-300">{r.type}</td>
                        <td className="py-1.5 pr-3 text-slate-300">{r.name}</td>
                        <td className="break-all py-1.5 font-mono text-[11px] text-slate-400">
                          {r.priority != null ? `(${r.priority}) ` : ""}
                          {r.content}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 space-y-2">
        <h2 className="text-lg font-semibold text-white">Next steps</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-400">
          {overview.nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <p className="text-sm text-slate-500">
        Domain inventory:{" "}
        <Link
          href="/apps/infrastructure/domains"
          className="text-sky-400 hover:underline"
        >
          Domains
        </Link>
        . Checked {new Date(overview.checkedAt).toLocaleString("en-AU")}.
      </p>
    </div>
  );
}

function PlaneCard({
  title,
  ok,
  body,
}: {
  title: string;
  ok: boolean;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-white">{title}</h2>
        <span
          className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wide ${
            ok
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-amber-500/15 text-amber-200"
          }`}
        >
          {ok ? "Ready" : "Pending"}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-400">{body}</p>
    </div>
  );
}
