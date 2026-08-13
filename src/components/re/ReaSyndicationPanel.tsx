"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ReaPlacement = {
  channel?: string;
  status?: string;
  providerAdId?: string;
  reaAgencyId?: string | null;
  uploadId?: string | null;
  listingId?: string | null;
  progress?: string | null;
  result?: string | null;
  lastSyncedAt?: string | null;
  lastError?: string | null;
  path?: string | null;
};

type ReaOrgStatus = {
  connected: boolean;
  reaAgencyId?: string | null;
  probe?: {
    ok: boolean;
    message: string;
  } | null;
};

type ReaPlatformStatus = {
  configured: boolean;
  oauthEndpointsReady?: boolean;
  publishImplemented?: boolean;
};

export function ReaSyndicationPanel({
  propertyId,
  placement,
}: {
  propertyId: string;
  placement?: ReaPlacement | null;
}) {
  const router = useRouter();
  const [org, setOrg] = useState<ReaOrgStatus | null>(null);
  const [platform, setPlatform] = useState<ReaPlatformStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    setStatusLoading(true);
    const res = await fetch("/api/v1/connectors/rea/status");
    const json = await res.json().catch(() => ({}));
    setStatusLoading(false);
    if (!res.ok) {
      setOrg(null);
      setPlatform(null);
      return;
    }
    setOrg((json.data?.organisation as ReaOrgStatus | undefined) ?? null);
    setPlatform((json.data?.platform as ReaPlatformStatus | undefined) ?? null);
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function publish() {
    setPending(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/v1/properties/${propertyId}/syndicate/rea`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not publish to REA");
      router.refresh();
      return;
    }
    setMessage(json.data?.publish?.message ?? "REA listing queued (pending)");
    router.refresh();
    await loadStatus();
  }

  const configured = Boolean(platform?.configured);
  const connected = Boolean(org?.connected);
  const publishReady = Boolean(platform?.publishImplemented);
  const canPublish = configured && connected && publishReady;

  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-400">
        {statusLoading ? (
          <p>Checking REA connection…</p>
        ) : !configured ? (
          <p>
            REA Partner credentials not on this deployment.{" "}
            <Link href="/dashboard/settings/connectors" className="text-blue-400 hover:underline">
              Settings → Connectors
            </Link>{" "}
            shows status.
          </p>
        ) : connected ? (
          <p>
            REA:{" "}
            <span className={org?.probe && !org.probe.ok ? "text-amber-400" : "text-sky-300"}>
              Agency {org?.reaAgencyId}
            </span>
            {org?.probe && !org.probe.ok ? (
              <span className="text-amber-400"> · check activation</span>
            ) : null}
          </p>
        ) : (
          <p>
            REA agency not activated.{" "}
            <Link href="/dashboard/settings/connectors" className="text-blue-400 hover:underline">
              Bind agency id
            </Link>{" "}
            after Ignite / Change of Uploader.
          </p>
        )}
      </div>

      {org?.probe && !org.probe.ok ? (
        <p className="text-sm text-amber-400">Probe: {org.probe.message}</p>
      ) : null}

      {placement?.lastError || placement?.status ? (
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
                      : "text-slate-300"
                }
              >
                {placement.status}
              </span>
              {placement.progress ? (
                <span className="text-slate-500"> · {placement.progress}</span>
              ) : null}
              {placement.result ? (
                <span className="text-slate-500"> · {placement.result}</span>
              ) : null}
            </li>
          ) : null}
          {placement.uploadId ? (
            <li className="font-mono text-xs text-slate-500">
              uploadId: {placement.uploadId}
            </li>
          ) : null}
          {placement.listingId ? (
            <li className="font-mono text-xs text-slate-500">
              listingId: {placement.listingId}
            </li>
          ) : null}
          {placement.providerAdId ? (
            <li className="font-mono text-xs text-slate-500">{placement.providerAdId}</li>
          ) : null}
          {placement.lastError ? (
            <li className="text-amber-400">{placement.lastError}</li>
          ) : null}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Not published to REA yet.</p>
      )}

      <button
        type="button"
        disabled={pending || !canPublish}
        onClick={() => void publish()}
        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        title={
          !configured
            ? "REA credentials not configured"
            : !connected
              ? "Activate REA agency first"
              : !publishReady
                ? "REA listing upload not ready"
                : undefined
        }
      >
        {pending ? "Publishing to REA…" : "Publish to REA"}
      </button>

      <p className="text-xs text-slate-500">
        Upload accept sets placement to <span className="text-slate-400">pending</span> — never
        “published on REA” until a report confirms NEW/PROCESSED (and listings are live for the
        agency).
      </p>

      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-amber-400">{error}</p> : null}
    </div>
  );
}
