"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type DomainPlacement = {
  channel?: string;
  status?: string;
  providerAdId?: string;
  domainAgencyId?: number;
  processId?: string | null;
  processStatus?: string | null;
  lastSyncedAt?: string | null;
  lastError?: string | null;
  path?: string | null;
};

type DomainOrgStatus = {
  connected: boolean;
  domainAgencyId?: number | null;
  probe?: {
    ok: boolean;
    message: string;
    securityReason?: string | null;
    probePath?: string;
  } | null;
};

type DomainPlatformStatus = {
  apiPathPrefix?: string;
};

export function DomainSyndicationPanel({
  propertyId,
  placement,
}: {
  propertyId: string;
  placement?: DomainPlacement | null;
}) {
  const router = useRouter();
  const [org, setOrg] = useState<DomainOrgStatus | null>(null);
  const [platform, setPlatform] = useState<DomainPlatformStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [securityReason, setSecurityReason] = useState<string | null>(null);

  async function loadStatus() {
    setStatusLoading(true);
    const res = await fetch("/api/v1/connectors/domain/status");
    const json = await res.json().catch(() => ({}));
    setStatusLoading(false);
    if (!res.ok) {
      setOrg(null);
      setPlatform(null);
      return;
    }
    setOrg((json.data?.organisation as DomainOrgStatus | undefined) ?? null);
    setPlatform((json.data?.platform as DomainPlatformStatus | undefined) ?? null);
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function publish() {
    setPending(true);
    setError(null);
    setSecurityReason(null);
    setMessage(null);
    const res = await fetch(`/api/v1/properties/${propertyId}/syndicate/domain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not publish to Domain");
      if (typeof json.error?.securityReason === "string" && json.error.securityReason) {
        setSecurityReason(json.error.securityReason);
      }
      router.refresh();
      return;
    }
    setMessage(json.data?.publish?.message ?? "Domain listing queued");
    router.refresh();
    await loadStatus();
  }

  const connected = Boolean(org?.connected);

  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-400">
        {statusLoading ? (
          <p>Checking Domain connection…</p>
        ) : connected ? (
          <p>
            Domain:{" "}
            <span className={org?.probe && !org.probe.ok ? "text-amber-400" : "text-emerald-400"}>
              Connected
            </span>
            {org?.domainAgencyId ? (
              <span className="text-slate-500"> · agency {org.domainAgencyId}</span>
            ) : (
              <span className="text-slate-500"> · agency resolved on publish</span>
            )}
          </p>
        ) : (
          <p>
            Domain not connected.{" "}
            <Link href="/dashboard/settings/connectors" className="text-blue-400 hover:underline">
              Connect Domain
            </Link>{" "}
            first (Authorization Code / Listings Management).
          </p>
        )}
      </div>

      {!statusLoading ? (
        <p className="text-xs font-mono text-slate-500">
          API prefix:{" "}
          {platform?.apiPathPrefix ? (
            <span className="text-slate-300">{platform.apiPathPrefix}</span>
          ) : (
            <span className="text-amber-400">(none — Primary /v1/…)</span>
          )}
          {org?.probe?.probePath ? (
            <>
              {" "}
              · probe <span className="text-slate-300">{org.probe.probePath}</span>
            </>
          ) : null}
        </p>
      ) : null}

      {org?.probe && !org.probe.ok ? (
        <p className="text-sm text-amber-400">
          Probe
          {org.probe.probePath ? ` (${org.probe.probePath})` : ""}: {org.probe.message}
          {org.probe.securityReason ? (
            <span className="block text-xs text-amber-500/90 mt-1">
              X-Domain-Security-Reason: {org.probe.securityReason}
            </span>
          ) : null}
        </p>
      ) : null}

      {placement?.processId || placement?.lastError || placement?.status ? (
        <ul className="space-y-1 text-sm text-slate-400">
          {placement.status ? (
            <li>
              Placement:{" "}
              <span
                className={
                  placement.status === "error"
                    ? "text-amber-400"
                    : placement.status === "pending"
                      ? "text-sky-300"
                      : "text-emerald-400"
                }
              >
                {placement.status}
                {placement.processStatus ? ` (${placement.processStatus})` : ""}
              </span>
            </li>
          ) : null}
          {placement.domainAgencyId ? (
            <li className="font-mono text-xs text-slate-500">
              Agency {placement.domainAgencyId}
              {placement.providerAdId ? ` · ${placement.providerAdId}` : ""}
            </li>
          ) : null}
          {placement.processId ? (
            <li className="font-mono text-xs text-slate-500 break-all">
              Job: {placement.processId}
            </li>
          ) : null}
          {placement.lastSyncedAt ? (
            <li className="text-xs text-slate-500">
              Last sync {new Date(placement.lastSyncedAt).toLocaleString("en-AU")}
            </li>
          ) : null}
          {placement.lastError ? (
            <li className="text-amber-400">{placement.lastError}</li>
          ) : null}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Not published to Domain yet.</p>
      )}

      <button
        type="button"
        disabled={pending || !connected}
        onClick={() => void publish()}
        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        title={!connected ? "Connect Domain first" : undefined}
      >
        {pending
          ? "Publishing to Domain…"
          : placement?.processId
            ? "Update on Domain"
            : "Publish to Domain"}
      </button>

      <p className="text-xs text-slate-500">
        Upserts residential listing via Listings Management. Pilots: set{" "}
        <span className="font-mono">DOMAIN_API_PATH_PREFIX=/sandbox</span> (Sandbox package) —
        may create a test agency. Acceptance is async — a queue id is not the same as live on
        Domain.
      </p>

      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-amber-400">{error}</p> : null}
      {securityReason ? (
        <p className="text-xs text-amber-500">X-Domain-Security-Reason: {securityReason}</p>
      ) : null}
    </div>
  );
}
