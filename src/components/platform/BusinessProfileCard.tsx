"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { OrganisationBusinessProfile } from "@dg/platform-core";

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-200">{value}</dd>
    </div>
  );
}

export function BusinessProfileCard({
  profile,
  linked,
  purchaseLabel,
}: {
  profile?: OrganisationBusinessProfile | null;
  linked: boolean;
  purchaseLabel?: string;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refreshFromWordPress() {
    setSyncing(true);
    setMessage(null);
    const res = await fetch("/api/v1/org/profile", { method: "POST" });
    const json = await res.json().catch(() => null);
    setSyncing(false);
    if (!res.ok) {
      setMessage(json?.error?.message ?? "Sync failed");
      return;
    }
    setMessage(json.data.synced ? "Profile updated from onboarding" : "Already up to date");
    router.refresh();
  }

  if (!linked) {
    return (
      <div className="dg-card border-dashed border-slate-700">
        <h2 className="font-semibold text-white">Business profile</h2>
        <p className="mt-2 text-sm text-slate-400">
          Complete onboarding on digitalgate.com.au with the same email you use to sign in here.
          Your business name, logo, and plan selection will preconfigure this platform automatically.
        </p>
      </div>
    );
  }

  if (!profile?.businessName) {
    return (
      <div className="dg-card">
        <h2 className="font-semibold text-white">Business profile</h2>
        <p className="mt-2 text-sm text-slate-400">
          Your account is linked to DigitalGate, but onboarding details have not synced yet.
        </p>
        <button
          type="button"
          onClick={refreshFromWordPress}
          disabled={syncing}
          className="mt-4 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Pull from onboarding"}
        </button>
        {message ? <p className="mt-2 text-sm text-slate-400">{message}</p> : null}
      </div>
    );
  }

  const address = [
    profile.address?.street,
    profile.address?.city,
    profile.address?.state,
    profile.address?.postcode,
    profile.address?.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="dg-card">
      <div className="flex flex-wrap items-start gap-6">
        {profile.logoUrl ? (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.logoUrl}
              alt={`${profile.businessName} logo`}
              className="max-h-full max-w-full object-contain p-2"
            />
          </div>
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 text-2xl text-slate-600">
            {profile.businessName?.charAt(0) ?? "?"}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">{profile.businessName}</h2>
              {purchaseLabel || profile.purchaseLabel ? (
                <p className="mt-1 text-sm text-blue-300">
                  {purchaseLabel ?? profile.purchaseLabel}
                </p>
              ) : null}
              {profile.platformTier ? (
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                  {profile.platformTier} plan
                  {profile.industryVertical ? ` · ${profile.industryVertical}` : ""}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={refreshFromWordPress}
              disabled={syncing}
              className="rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-50"
            >
              {syncing ? "Syncing…" : "Refresh"}
            </button>
          </div>

          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Contact" value={profile.contactName} />
            <Field label="Role" value={profile.position} />
            <Field label="Phone" value={profile.contactPhone ?? profile.businessPhone} />
            <Field label="Email" value={profile.contactEmail ?? profile.businessEmail} />
            <Field label="ABN" value={profile.abn} />
            <Field label="GST number" value={profile.gstNumber} />
            <Field label="Industry licence" value={profile.industryLicenseNumber} />
            <Field label="Website" value={profile.websiteUrl} />
            {address ? (
              <div className="sm:col-span-2">
                <Field label="Address" value={address} />
              </div>
            ) : null}
          </dl>

          {profile.syncedAt ? (
            <p className="mt-4 text-xs text-slate-500">
              Last synced from onboarding:{" "}
              {new Date(profile.syncedAt).toLocaleString("en-AU")}
            </p>
          ) : null}
          {message ? <p className="mt-1 text-xs text-emerald-400/90">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}
