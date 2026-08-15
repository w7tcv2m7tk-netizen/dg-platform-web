"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type InventoryDomain = {
  id: string;
  name: string;
  status: string;
  source: string;
  managed: boolean;
  websiteId: string | null;
  dnsConfiguredAt: string | null;
  sslState: string;
};

type DnsRecordRow = {
  type: string;
  name: string;
  content: string;
  priority?: number;
  purpose?: string;
  ttl?: number;
};

type ZoneInfo = {
  manageable?: boolean;
  nameservers?: string[];
  recordCount?: number;
  message?: string;
  hint?: string;
  status?: string | null;
  records?: DnsRecordRow[];
};

type DnsTargets = {
  aTarget?: string;
  cnameTarget?: string;
  source?: string;
  note?: string;
};

type DnsDetail = {
  domain: InventoryDomain;
  stored: DnsRecordRow[];
  provider: DnsRecordRow[];
  suggestedHosting: DnsRecordRow[];
  targets: DnsTargets | null;
  zone: ZoneInfo | null;
  providerError: string | null;
  sslNote?: string;
};

function sslBadgeClass(state: string) {
  if (state === "active") return "bg-emerald-500/15 text-emerald-300";
  if (state === "pending") return "bg-amber-500/15 text-amber-200";
  if (state === "missing" || state === "expired")
    return "bg-rose-500/15 text-rose-300";
  return "bg-slate-700/60 text-slate-300";
}

function formatWhen(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("en-AU", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function DnsConsole() {
  const [domains, setDomains] = useState<InventoryDomain[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<DnsDetail | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const refreshInventory = useCallback(async () => {
    const res = await fetch("/api/v1/infrastructure/domains");
    const json = (await res.json()) as {
      data?: InventoryDomain[];
      error?: { message?: string };
    };
    if (!res.ok) {
      setStatus(json.error?.message || "Failed to load domains");
      return;
    }
    const list = json.data ?? [];
    setDomains(list);
    setSelectedId((prev) => {
      if (prev && list.some((d) => d.id === prev)) return prev;
      return list[0]?.id ?? "";
    });
  }, []);

  const loadDetail = useCallback(async (domainId: string) => {
    if (!domainId) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    const res = await fetch(`/api/v1/infrastructure/domains/${domainId}/dns`);
    const json = (await res.json()) as {
      data?: DnsDetail;
      error?: { message?: string };
    };
    if (!res.ok) {
      setStatus(json.error?.message || "DNS inspect failed");
      setDetail(null);
      setLoadingDetail(false);
      return;
    }
    setDetail(json.data ?? null);
    setLoadingDetail(false);
  }, []);

  useEffect(() => {
    void refreshInventory();
  }, [refreshInventory]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  async function applyHosting(mode: "full" | "www" | "apex") {
    if (!selectedId) return;
    setBusy(true);
    setStatus(
      mode === "www"
        ? "Applying www CNAME…"
        : mode === "apex"
          ? "Applying apex A…"
          : "Applying hosting DNS (apex A + www CNAME)…",
    );
    const res = await fetch(
      `/api/v1/infrastructure/domains/${selectedId}/dns`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applyHosting: mode,
          attachVercel: true,
          allowWwwFallback: mode === "full",
        }),
      },
    );
    const json = (await res.json()) as {
      error?: {
        message?: string;
        hint?: string;
        code?: string;
        providerBodySnippet?: string | null;
      };
      data?: {
        instructions?: string[] | null;
        note?: string;
        fellBack?: boolean;
        modeApplied?: string;
        targets?: DnsTargets | null;
        vercel?: {
          apex?: {
            ok?: boolean;
            configured?: boolean;
            message?: string;
            verified?: boolean | null;
          };
          www?: {
            ok?: boolean;
            configured?: boolean;
            message?: string;
            verified?: boolean | null;
          };
        } | null;
        domain?: InventoryDomain;
      };
    };

    if (res.ok) {
      const parts: string[] = [];
      if (json.data?.fellBack) {
        parts.push(json.data.note || `Fell back to ${json.data.modeApplied}`);
      } else {
        parts.push(
          json.data?.modeApplied
            ? `DNS applied (${json.data.modeApplied})`
            : "Hosting DNS applied.",
        );
      }
      if (json.data?.targets?.aTarget) {
        parts.push(`Apex A → ${json.data.targets.aTarget}`);
      }
      if (json.data?.targets?.cnameTarget) {
        parts.push(`www CNAME → ${json.data.targets.cnameTarget}`);
      }
      if (json.data?.targets?.source) {
        parts.push(`Targets: ${json.data.targets.source}`);
      }
      if (json.data?.note && !json.data?.fellBack) {
        parts.push(json.data.note);
      }
      if (json.data?.instructions?.length) {
        parts.push(...json.data.instructions);
      }
      const vercel = json.data?.vercel;
      if (vercel) {
        const apex = vercel.apex;
        const www = vercel.www;
        const anyOk = Boolean(apex?.ok || www?.ok);
        const configured = Boolean(apex?.configured || www?.configured);
        const pendingVerify =
          apex?.verified === false || www?.verified === false;
        if (anyOk) {
          parts.push(
            pendingVerify
              ? "Hosting attached — SSL pending until DNS verifies."
              : "Hosting attached — SSL will provision automatically.",
          );
        } else if (!configured) {
          parts.push(
            apex?.message ||
              www?.message ||
              "Hosting attach skipped — add the hostname in project Domains, or set platform Vercel credentials.",
          );
        } else {
          parts.push(
            `Hosting attach failed: ${apex?.message || www?.message || "unknown"}.`,
          );
        }
      }
      if (json.data?.domain?.sslState === "pending") {
        parts.push("SSL state: pending (normal until DNS propagates).");
      }
      setStatus(parts.join(" · "));
      await refreshInventory();
      await loadDetail(selectedId);
    } else {
      const bits = [json.error?.message || "DNS apply failed"];
      if (json.error?.hint) bits.push(json.error.hint);
      if (json.error?.providerBodySnippet) {
        bits.push(`Provider: ${json.error.providerBodySnippet}`);
      }
      setStatus(bits.join(" — "));
    }
    setBusy(false);
  }

  async function copySuggested() {
    const rows = detail?.suggestedHosting ?? [];
    if (!rows.length) return;
    const text = rows
      .map(
        (r) =>
          `${r.type}\t${r.name}\t${r.priority != null ? `${r.priority} ` : ""}${r.content}`,
      )
      .join("\n");
    const ok = await copyText(text);
    setStatus(ok ? "Copied suggested records to clipboard." : "Copy failed.");
  }

  const dnsReady = domains.filter((d) => d.dnsConfiguredAt).length;
  const sslActive = domains.filter((d) => d.sslState === "active").length;
  const sslPending = domains.filter((d) => d.sslState === "pending").length;
  const selected = domains.find((d) => d.id === selectedId) ?? null;
  const zone = detail?.zone ?? null;
  const liveRecords =
    (zone?.records && zone.records.length > 0
      ? zone.records
      : detail?.provider) ?? [];
  const suggested = detail?.suggestedHosting ?? [];
  const manageable = zone?.manageable !== false && !detail?.providerError;
  const externalZone =
    Boolean(detail?.providerError) || zone?.manageable === false;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-sky-50">
        Website hosting uses apex <strong className="text-sky-100">A</strong> +{" "}
        <strong className="text-sky-100">www CNAME</strong> (never apex CNAME —
        root CNAME is rejected). SSL is automatic after the hostname is attached
        and DNS propagates. Email auth DNS lives under{" "}
        <Link
          href="/apps/infrastructure/email"
          className="text-sky-300 hover:underline"
        >
          Email
        </Link>
        .
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Domains" value={String(domains.length)} />
        <Stat label="DNS configured" value={String(dnsReady)} />
        <Stat label="SSL active" value={String(sslActive)} />
        <Stat label="SSL pending" value={String(sslPending)} />
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Domain zone</h2>
            <p className="mt-1 text-sm text-slate-400">
              Inspect live records, copy manual targets, or apply hosting DNS
              when the zone is managed here.
            </p>
          </div>
          <Link
            href="/apps/infrastructure/domains"
            className="text-sm text-sky-400 hover:underline"
          >
            Manage domains →
          </Link>
        </div>

        {domains.length === 0 ? (
          <p className="text-sm text-slate-500">
            No domains in inventory yet.{" "}
            <Link
              href="/apps/infrastructure/domains"
              className="text-sky-400 hover:underline"
            >
              Connect or register a domain
            </Link>{" "}
            first.
          </p>
        ) : (
          <>
            <label className="block text-xs text-slate-500">
              Domain
              <select
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.dnsConfiguredAt ? " · DNS set" : " · DNS pending"}
                    {d.sslState !== "unknown" ? ` · SSL ${d.sslState}` : ""}
                  </option>
                ))}
              </select>
            </label>

            {selected ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded px-2 py-0.5 ${
                    selected.dnsConfiguredAt
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-amber-500/15 text-amber-200"
                  }`}
                >
                  {selected.dnsConfiguredAt
                    ? `DNS set ${formatWhen(selected.dnsConfiguredAt) ?? ""}`.trim()
                    : "DNS pending"}
                </span>
                <span
                  className={`rounded px-2 py-0.5 ${sslBadgeClass(selected.sslState)}`}
                >
                  SSL {selected.sslState || "unknown"}
                </span>
                <span className="rounded bg-slate-700/60 px-2 py-0.5 text-slate-300">
                  {selected.source} · {selected.status}
                </span>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || loadingDetail || !selectedId}
                onClick={() => void loadDetail(selectedId)}
                className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 disabled:opacity-50"
              >
                {loadingDetail ? "Refreshing…" : "Refresh zone"}
              </button>
              <button
                type="button"
                disabled={busy || !selectedId || externalZone}
                onClick={() => void applyHosting("www")}
                className="rounded-md border border-sky-700/60 px-3 py-1.5 text-sm text-sky-300 hover:bg-sky-500/10 disabled:opacity-50"
                title={
                  externalZone
                    ? "Zone not manageable here — use manual records below"
                    : undefined
                }
              >
                Apply www only
              </button>
              <button
                type="button"
                disabled={busy || !selectedId || externalZone}
                onClick={() => void applyHosting("full")}
                className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                title={
                  externalZone
                    ? "Zone not manageable here — use manual records below"
                    : undefined
                }
              >
                Apply website DNS
              </button>
              <button
                type="button"
                disabled={busy || !selectedId || !suggested.length}
                onClick={() => void copySuggested()}
                className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 disabled:opacity-50"
              >
                Copy suggested
              </button>
            </div>

            {status ? (
              <p className="text-xs text-slate-400 whitespace-pre-wrap">
                {status}
              </p>
            ) : null}

            {loadingDetail && !detail ? (
              <p className="text-sm text-slate-500">Loading zone…</p>
            ) : null}

            {detail ? (
              <div className="space-y-5 border-t border-slate-800 pt-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-white">Zone status</h3>
                  <p className="text-sm text-slate-300">
                    {zone?.message ||
                      (detail.providerError
                        ? detail.providerError
                        : "Zone inspected")}
                    {manageable ? (
                      <span className="text-emerald-300"> · manageable</span>
                    ) : (
                      <span className="text-amber-200">
                        {" "}
                        · not auto-manageable
                      </span>
                    )}
                  </p>
                  {zone?.nameservers?.length ? (
                    <p className="text-xs text-slate-500 break-all">
                      NS: {zone.nameservers.join(", ")}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      NS: (none returned — confirm nameservers at the registrar)
                    </p>
                  )}
                  {zone?.hint ? (
                    <p className="text-xs text-amber-200/80">{zone.hint}</p>
                  ) : null}
                  {detail.providerError && zone ? (
                    <p className="text-xs text-amber-200/80">
                      {detail.providerError}
                    </p>
                  ) : null}
                  {detail.targets?.source ? (
                    <p className="text-xs text-slate-500">
                      Hosting targets: {detail.targets.source}
                      {detail.targets.note
                        ? ` · ${detail.targets.note}`
                        : ""}
                    </p>
                  ) : null}
                </div>

                <RecordTable
                  title="Suggested website DNS"
                  empty="No suggested records."
                  rows={suggested}
                  showPurpose
                />

                {externalZone ? (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-50 space-y-2">
                    <p className="font-medium">Manual DNS at your registrar</p>
                    <p className="text-xs text-amber-100/80">
                      This zone isn’t writable from DigitalGate (external NS or
                      provider not configured). Add the suggested records at
                      your DNS host, then Refresh zone / wait for SSL.
                    </p>
                    <ManualInstructions
                      domainName={selected?.name ?? detail.domain.name}
                      targets={detail.targets}
                      suggested={suggested}
                    />
                  </div>
                ) : null}

                <RecordTable
                  title="Live zone records"
                  empty="No records returned from the provider."
                  rows={liveRecords}
                />

                {detail.stored?.length ? (
                  <RecordTable
                    title="Last applied (platform)"
                    empty=""
                    rows={detail.stored}
                  />
                ) : null}

                {detail.sslNote ? (
                  <p className="text-xs text-slate-500">{detail.sslNote}</p>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 space-y-2">
        <h2 className="text-lg font-semibold text-white">Related</h2>
        <ul className="space-y-1 text-sm text-slate-400">
          <li>
            <Link
              href="/apps/infrastructure/domains"
              className="text-sky-400 hover:underline"
            >
              Domains
            </Link>{" "}
            — search, register, connect
          </li>
          <li>
            <Link
              href="/apps/infrastructure/email"
              className="text-sky-400 hover:underline"
            >
              Email
            </Link>{" "}
            — SPF / DKIM / DMARC auth DNS
          </li>
          <li>
            <Link
              href="/apps/websites/hosting"
              className="text-sky-400 hover:underline"
            >
              Websites → Hosting
            </Link>{" "}
            — publish status + Make it live
          </li>
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/50 px-4 py-3">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function RecordTable({
  title,
  empty,
  rows,
  showPurpose,
}: {
  title: string;
  empty: string;
  rows: DnsRecordRow[];
  showPurpose?: boolean;
}) {
  if (!rows.length) {
    return empty ? (
      <div>
        <h3 className="text-sm font-medium text-white">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">{empty}</p>
      </div>
    ) : null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-white">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-400">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="py-1 pr-3 font-medium">Type</th>
              <th className="py-1 pr-3 font-medium">Name</th>
              <th className="py-1 font-medium">Value</th>
              {showPurpose ? (
                <th className="py-1 pl-3 font-medium">Purpose</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={`${r.type}-${r.name}-${r.content}-${i}`}
                className="border-b border-slate-900 align-top"
              >
                <td className="py-1.5 pr-3 text-slate-300">{r.type}</td>
                <td className="py-1.5 pr-3 font-mono text-slate-300">
                  {r.name || "@"}
                </td>
                <td className="break-all py-1.5 font-mono text-[11px] text-slate-400">
                  {r.priority != null ? `(${r.priority}) ` : ""}
                  {r.content}
                </td>
                {showPurpose ? (
                  <td className="py-1.5 pl-3 text-slate-500">
                    {r.purpose ?? "—"}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ManualInstructions({
  domainName,
  targets,
  suggested,
}: {
  domainName: string;
  targets: DnsTargets | null;
  suggested: DnsRecordRow[];
}) {
  const apex =
    suggested.find((r) => r.type === "A" && (r.name === "@" || !r.name))
      ?.content || targets?.aTarget;
  const www =
    suggested.find((r) => r.type === "CNAME" && r.name === "www")?.content ||
    targets?.cnameTarget;

  return (
    <ol className="list-decimal space-y-1 pl-5 text-xs text-amber-100/90">
      <li>
        At your DNS host for <span className="font-mono">{domainName}</span>,
        set:
      </li>
      {apex ? (
        <li>
          Apex <strong>A</strong> <span className="font-mono">@</span> →{" "}
          <span className="font-mono">{apex}</span>
        </li>
      ) : null}
      {www ? (
        <li>
          <strong>CNAME</strong> <span className="font-mono">www</span> →{" "}
          <span className="font-mono">{www}</span>
        </li>
      ) : null}
      <li>
        Do not put a CNAME on the root/apex — use A for apex only.
      </li>
      <li>
        After propagation, SSL flips to pending/active once hosting verifies
        the hostname.
      </li>
    </ol>
  );
}
