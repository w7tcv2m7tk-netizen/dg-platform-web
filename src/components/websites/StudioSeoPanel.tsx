"use client";

import { useState } from "react";
import type { SerializedWebsite, WebsiteSeo } from "@dg/platform-core";
import {
  isDefaultChromelessPage,
  resolvePageChromeVisibility,
} from "@dg/platform-core/websites/page-chrome";

function Field({
  label,
  value,
  disabled,
  multiline,
  hint,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  multiline?: boolean;
  hint?: string;
  onChange: (v: string) => void;
}) {
  const className =
    "mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-white";
  return (
    <label className="block text-xs text-slate-500">
      {label}
      {multiline ? (
        <textarea
          className={`${className} min-h-[72px]`}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={className}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint ? <span className="mt-0.5 block text-[11px] text-slate-600">{hint}</span> : null}
    </label>
  );
}

function SeoFields({
  value,
  disabled,
  onChange,
}: {
  value: WebsiteSeo;
  disabled?: boolean;
  onChange: (next: WebsiteSeo) => void;
}) {
  return (
    <div className="space-y-2">
      <Field
        label="Page title"
        value={value.title ?? ""}
        disabled={disabled}
        onChange={(v) => onChange({ ...value, title: v })}
      />
      <Field
        label="Meta description"
        value={value.description ?? ""}
        disabled={disabled}
        multiline
        hint={`${(value.description ?? "").length}/160`}
        onChange={(v) => onChange({ ...value, description: v })}
      />
      <Field
        label="OG title"
        value={value.ogTitle ?? ""}
        disabled={disabled}
        hint="Defaults to page title when blank"
        onChange={(v) => onChange({ ...value, ogTitle: v })}
      />
      <Field
        label="OG description"
        value={value.ogDescription ?? ""}
        disabled={disabled}
        multiline
        onChange={(v) => onChange({ ...value, ogDescription: v })}
      />
      <Field
        label="OG image URL"
        value={value.ogImage ?? ""}
        disabled={disabled}
        hint="Absolute HTTPS URL preferred"
        onChange={(v) => onChange({ ...value, ogImage: v })}
      />
      <Field
        label="Keywords"
        value={(value.keywords ?? []).join(", ")}
        disabled={disabled}
        hint="Comma-separated. Emitted as the meta keywords tag."
        onChange={(v) =>
          onChange({
            ...value,
            keywords: v
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean),
          })
        }
      />
    </div>
  );
}

export function StudioSeoPanel({
  website,
  pageId,
  disabled,
  onSaved,
}: {
  website: SerializedWebsite;
  pageId: string;
  disabled?: boolean;
  onSaved: (next: SerializedWebsite, message: string) => void;
}) {
  const page = website.pages?.find((p) => p.id === pageId) ?? website.pages?.[0];
  const [siteSeo, setSiteSeo] = useState<WebsiteSeo>(website.seo ?? {});
  const [pageSeo, setPageSeo] = useState<WebsiteSeo>(page?.seo ?? {});
  const [siteSlug, setSiteSlug] = useState(website.slug);
  const [pageSlug, setPageSlug] = useState(page?.slug ?? "");
  const [pageTitle, setPageTitle] = useState(page?.title ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Keep local state in sync when page selection changes
  const pageKey = `${page?.id ?? ""}:${page?.updatedAt ?? ""}`;
  const [lastKey, setLastKey] = useState(pageKey);
  if (pageKey !== lastKey) {
    setLastKey(pageKey);
    setPageSeo(page?.seo ?? {});
    setPageSlug(page?.slug ?? "");
    setPageTitle(page?.title ?? "");
    setSiteSeo(website.seo ?? {});
    setSiteSlug(website.slug);
  }

  async function saveSite() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/v1/websites/${website.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seo: siteSeo,
        slug: siteSlug.trim() !== website.slug ? siteSlug.trim() : undefined,
      }),
    });
    const json = (await res.json()) as {
      data?: SerializedWebsite;
      error?: { message?: string };
    };
    if (!res.ok || !json.data) {
      setError(json.error?.message || "Could not save site SEO");
      setBusy(false);
      return;
    }
    onSaved(json.data, "Site SEO saved");
    setSiteSlug(json.data.slug);
    setBusy(false);
  }

  async function savePage() {
    if (!page) return;
    setBusy(true);
    setError("");
    const res = await fetch(
      `/api/v1/websites/${website.id}/pages/${page.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seo: pageSeo,
          title: pageTitle.trim() || undefined,
          slug: pageSlug.trim() !== page.slug ? pageSlug.trim() : undefined,
        }),
      },
    );
    const json = (await res.json()) as {
      data?: { id: string };
      error?: { message?: string };
    };
    if (!res.ok) {
      setError(json.error?.message || "Could not save page SEO");
      setBusy(false);
      return;
    }
    const refresh = await fetch(`/api/v1/websites/${website.id}`);
    const refreshed = (await refresh.json()) as { data?: SerializedWebsite };
    if (refreshed.data) onSaved(refreshed.data, "Page SEO saved");
    setBusy(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="rounded-md border border-slate-700 bg-slate-950/60 p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Site SEO</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Defaults for every page. Public renderer emits title, description, and
            Open Graph tags.
          </p>
        </div>
        <Field
          label="Public slug"
          value={siteSlug}
          disabled={disabled || busy}
          hint="Letters, numbers, hyphens — unique across /sites/[slug]"
          onChange={setSiteSlug}
        />
        <SeoFields
          value={siteSeo}
          disabled={disabled || busy}
          onChange={setSiteSeo}
        />
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => void saveSite()}
          className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          Save site SEO
        </button>
      </section>

      {page ? (
        <section className="rounded-md border border-slate-700 bg-slate-950/60 p-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Page SEO — {page.title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Overrides site defaults for this page.
            </p>
          </div>
          <Field
            label="Page title (nav)"
            value={pageTitle}
            disabled={disabled || busy}
            onChange={setPageTitle}
          />
          <Field
            label="Page path slug"
            value={pageSlug}
            disabled={disabled || busy || page.intent === "home"}
            hint={
              page.intent === "home"
                ? "Home stays at /sites/[site-slug]"
                : `Public path /${pageSlug || page.slug} — nested slugs allowed (apps/core/crm)`
            }
            onChange={setPageSlug}
          />
          <SeoFields
            value={pageSeo}
            disabled={disabled || busy}
            onChange={setPageSeo}
          />
          <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3 space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Header & footer
            </p>
            {(() => {
              const visibility = resolvePageChromeVisibility(
                pageSlug || page.slug,
                pageSeo,
              );
              return (
                <>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      className="rounded border-slate-600 bg-slate-900"
                      checked={visibility.showHeader}
                      disabled={disabled || busy}
                      onChange={(e) =>
                        setPageSeo({
                          ...pageSeo,
                          showHeader: e.target.checked,
                        })
                      }
                    />
                    Show site header
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      className="rounded border-slate-600 bg-slate-900"
                      checked={visibility.showFooter}
                      disabled={disabled || busy}
                      onChange={(e) =>
                        setPageSeo({
                          ...pageSeo,
                          showFooter: e.target.checked,
                        })
                      }
                    />
                    Show site footer
                  </label>
                  {isDefaultChromelessPage(pageSlug || page.slug) ? (
                    <p className="text-[11px] text-slate-500">
                      Auto-hidden for unit / card / legal / privacy / terms /
                      onboarding / booking pages unless you turn them back on.
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Uncheck to hide chrome on this page only. Saved with page
                      SEO.
                    </p>
                  )}
                </>
              );
            })()}
          </div>
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => void savePage()}
            className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Save page SEO
          </button>
        </section>
      ) : null}

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}
