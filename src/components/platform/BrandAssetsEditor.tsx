"use client";

import { useRef, useState } from "react";

import {
  DEFAULT_ORG_ACCENT,
  DEFAULT_ORG_BACKGROUND,
  DEFAULT_ORG_PRIMARY,
  normalizeHex,
  parseBrandColours,
  serializeBrandColours,
  type OrganisationBusinessProfile,
} from "@/lib/brand-client";

type BrandAssetsEditorProps = {
  profile: OrganisationBusinessProfile;
  onChange: (patch: Partial<OrganisationBusinessProfile>) => void;
};

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function AssetPreview({
  label,
  src,
  fallbackLetter,
  accent,
}: {
  label: string;
  src?: string;
  fallbackLetter?: string;
  accent: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={label} className="max-h-full max-w-full object-contain p-2" />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            {fallbackLetter ?? "?"}
          </span>
        )}
      </div>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

async function uploadBrandAsset(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/v1/org/brand-asset", { method: "POST", body: form });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error?.message ?? "Upload failed");
  }
  return json.data.url as string;
}

async function persistBrandPatch(patch: Partial<OrganisationBusinessProfile>) {
  const res = await fetch("/api/v1/org/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error?.message ?? "Could not save brand asset");
  }
}

export function BrandAssetsEditor({ profile, onChange }: BrandAssetsEditorProps) {
  const iconInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"icon" | "logo" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const colours = parseBrandColours(profile.brandColours);
  const primary = colours[0] ?? DEFAULT_ORG_PRIMARY;
  const accent = colours[1] ?? DEFAULT_ORG_ACCENT;
  const background = colours[2] ?? DEFAULT_ORG_BACKGROUND;
  const businessInitial =
    profile.businessName?.charAt(0) || profile.tradingName?.charAt(0) || "?";

  function setColours(nextPrimary: string, nextAccent: string, nextBackground: string) {
    onChange({
      brandColours: serializeBrandColours(nextPrimary, nextAccent, nextBackground),
    });
  }

  async function handleFile(kind: "icon" | "logo", file: File) {
    setUploading(kind);
    setError(null);
    setSavedNote(null);
    try {
      const url = await uploadBrandAsset(file);
      const patch = kind === "icon" ? { iconUrl: url } : { logoUrl: url };
      onChange(patch);
      await persistBrandPatch(patch);
      setSavedNote(
        kind === "icon"
          ? "Icon uploaded and saved — used in the sidebar and compact UI."
          : "Logo uploaded and saved — it will appear on invoices and quotes.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  return (
    <section className="dg-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Brand appearance</h3>
          <p className="mt-1 text-sm text-slate-400">
            Logo and background colour brand tax invoices and quotes. Icon is for the
            sidebar and compact UI only. Uploads save immediately; colour and URL edits
            still need <span className="text-slate-300">Save profile</span>.
          </p>
        </div>
        <div className="flex gap-4">
          <AssetPreview
            label="Icon"
            src={profile.iconUrl ?? profile.logoUrl}
            fallbackLetter={businessInitial}
            accent={primary}
          />
          <AssetPreview
            label="Logo"
            src={profile.logoUrl}
            fallbackLetter={businessInitial}
            accent={accent}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Icon (square mark)
          </span>
          <div className="mt-1 flex gap-2">
            <input
              className={inputClass}
              placeholder="https://… or upload below"
              value={profile.iconUrl ?? ""}
              onChange={(e) => onChange({ iconUrl: e.target.value || undefined })}
            />
            <button
              type="button"
              onClick={() => iconInputRef.current?.click()}
              disabled={uploading === "icon"}
              className="shrink-0 rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:border-blue-500 disabled:opacity-50"
            >
              {uploading === "icon" ? "…" : "Upload"}
            </button>
            <input
              ref={iconInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile("icon", file);
                e.target.value = "";
              }}
            />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Logo (wordmark)
          </span>
          <div className="mt-1 flex gap-2">
            <input
              className={inputClass}
              placeholder="https://… or upload below"
              value={profile.logoUrl ?? ""}
              onChange={(e) => onChange({ logoUrl: e.target.value || undefined })}
            />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploading === "logo"}
              className="shrink-0 rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:border-blue-500 disabled:opacity-50"
            >
              {uploading === "logo" ? "…" : "Upload"}
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile("logo", file);
                e.target.value = "";
              }}
            />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Primary colour
          </span>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="color"
              value={normalizeHex(primary) ?? DEFAULT_ORG_PRIMARY}
              onChange={(e) => setColours(e.target.value, accent, background)}
              className="h-10 w-14 cursor-pointer rounded-lg border border-slate-700 bg-transparent"
            />
            <input
              className={inputClass}
              value={primary}
              onChange={(e) => {
                const next = normalizeHex(e.target.value);
                if (next) setColours(next, accent, background);
              }}
              placeholder="#3B82F6"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Accent colour
          </span>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="color"
              value={normalizeHex(accent) ?? DEFAULT_ORG_ACCENT}
              onChange={(e) => setColours(primary, e.target.value, background)}
              className="h-10 w-14 cursor-pointer rounded-lg border border-slate-700 bg-transparent"
            />
            <input
              className={inputClass}
              value={accent}
              onChange={(e) => {
                const next = normalizeHex(e.target.value);
                if (next) setColours(primary, next, background);
              }}
              placeholder="#10B981"
            />
          </div>
        </label>

        <label className="block lg:col-span-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Background colour
          </span>
          <p className="mt-0.5 text-xs text-slate-500">
            Used as the header band on invoices and quotes. Defaults to navy if unset.
          </p>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="color"
              value={normalizeHex(background) ?? DEFAULT_ORG_BACKGROUND}
              onChange={(e) => setColours(primary, accent, e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-lg border border-slate-700 bg-transparent"
            />
            <input
              className={inputClass}
              value={background}
              onChange={(e) => {
                const next = normalizeHex(e.target.value);
                if (next) setColours(primary, accent, next);
              }}
              placeholder="#0F172A"
            />
          </div>
        </label>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
          style={{ backgroundColor: background }}
        >
          <span className="text-xs uppercase tracking-wide text-slate-400">
            Document header preview
          </span>
          {profile.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.logoUrl}
              alt="Logo preview"
              className="max-h-10 max-w-[180px] object-contain"
            />
          ) : (
            <span className="text-sm font-semibold text-white">
              {profile.businessName || profile.tradingName || "Your business"}
            </span>
          )}
        </div>
        <div
          className="p-4"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, ${primary} 18%, #0f172a), #0f172a 55%, color-mix(in srgb, ${accent} 12%, #0f172a))`,
          }}
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">UI accents</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span
              className="rounded-full px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: primary }}
            >
              Primary button
            </span>
            <span
              className="rounded-full border px-4 py-2 text-sm font-medium text-white"
              style={{ borderColor: accent, color: accent }}
            >
              Accent outline
            </span>
            <span className="text-sm" style={{ color: primary }}>
              Branded link
            </span>
          </div>
        </div>
      </div>

      {savedNote ? <p className="mt-3 text-sm text-emerald-400">{savedNote}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
    </section>
  );
}
