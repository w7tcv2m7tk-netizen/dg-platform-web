"use client";

import { useState } from "react";

import { BrandAssetsEditor } from "@/components/platform/BrandAssetsEditor";
import type { OrganisationBusinessProfile } from "@/lib/brand-client";

export function LogoDesignStudioClient({
  initial,
}: {
  initial: OrganisationBusinessProfile;
}) {
  const [profile, setProfile] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/v1/org/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        logoUrl: profile.logoUrl,
        iconUrl: profile.iconUrl,
        brandColours: profile.brandColours,
      }),
    });
    const json = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setError(json?.error?.message ?? "Could not save brand");
      return;
    }
    setSaved(true);
  }

  return (
    <div className="max-w-3xl space-y-4">
      <BrandAssetsEditor
        profile={profile}
        onChange={(patch) => setProfile((prev) => ({ ...prev, ...patch }))}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-md bg-[var(--org-primary,#1e3a5f)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save brand"}
        </button>
        {saved ? (
          <p className="text-sm text-emerald-400">Saved to Business Profile</p>
        ) : null}
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </div>
    </div>
  );
}
