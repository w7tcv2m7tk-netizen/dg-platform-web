"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  FUNNEL_TEMPLATE_OPTIONS,
  type FunnelBuilderItem,
} from "@dg/platform-core/websites/funnels";
import type { FunnelTemplateId } from "@dg/platform-core/websites/types";

export function FunnelBuilderClient({
  funnels,
}: {
  funnels: FunnelBuilderItem[];
}) {
  const router = useRouter();
  const [template, setTemplate] = useState<FunnelTemplateId>("lead_capture");
  const [name, setName] = useState("");
  const [offer, setOffer] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/v1/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "funnel",
          funnelTemplate: template,
          name: name.trim() || undefined,
          offer: offer.trim() || undefined,
          brief: offer.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: { website?: { id: string } };
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(json.error?.message || "Could not create funnel");
        setBusy(false);
        return;
      }
      const id = json.data?.website?.id;
      if (id) {
        router.push(`/apps/websites/studio/${id}`);
        router.refresh();
        return;
      }
      setError("Created but missing id");
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  async function onDelete(funnel: FunnelBuilderItem) {
    if (!funnel.deletable) return;
    const ok = window.confirm(
      `Delete funnel “${funnel.name}”? This cannot be undone. Linked domains stay in Domains but will be detached.`,
    );
    if (!ok) return;
    setDeletingId(funnel.websiteId);
    setError("");
    try {
      const res = await fetch(`/api/v1/websites/${funnel.websiteId}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(json.error?.message || "Could not delete funnel");
        setDeletingId(null);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error while deleting");
    }
    setDeletingId(null);
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <form
        onSubmit={(e) => void onCreate(e)}
        className="space-y-4 rounded-lg border border-slate-700 bg-slate-900/40 p-5"
      >
        <div>
          <h2 className="text-sm font-semibold text-white">New funnel</h2>
          <p className="mt-1 text-xs text-slate-500">
            Landing page → contact form → Contact + Lead in CRM. Preview at{" "}
            <code className="text-slate-400">/sites/[slug]</code>, then{" "}
            <strong className="font-medium text-slate-400">Publish</strong> and{" "}
            <strong className="font-medium text-slate-400">Open live</strong> (or
            attach a custom domain via Make it live).
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {FUNNEL_TEMPLATE_OPTIONS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplate(t.id)}
              className={`rounded-md border px-3 py-2.5 text-left transition ${
                template === t.id
                  ? "border-sky-700/70 bg-sky-950/30"
                  : "border-slate-700 bg-slate-950/40 hover:border-slate-600"
              }`}
            >
              <span className="block text-sm text-white">{t.label}</span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                {t.detail}
              </span>
              <span className="block text-[11px] text-sky-400/80 mt-1">
                CTA: {t.cta}
              </span>
            </button>
          ))}
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">
            Name (optional)
          </label>
          <input
            className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Uses Business Profile name if blank"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">
            Offer / headline support (optional)
          </label>
          <textarea
            className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-white min-h-[72px]"
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            placeholder={
              template === "appraisal_request"
                ? "e.g. Free appraisal for Currumbin vendors this month"
                : template === "booking_enquiry"
                  ? "e.g. Mid-week stays from $189 — enquire for your dates"
                  : "e.g. Free 15-minute consultation for new enquiries"
            }
          />
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || Boolean(deletingId)}
            className="rounded-md bg-[var(--org-primary,#1e3a5f)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Creating funnel…" : "Create funnel → Studio"}
          </button>
          <Link
            href="/apps/crm/contacts"
            className="text-sm text-slate-400 hover:underline"
          >
            CRM contacts
          </Link>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Your funnels</h2>
        {funnels.length === 0 ? (
          <p className="text-sm text-slate-500">
            No funnels yet — pick a template above. Submissions create CRM leads
            with <code className="text-slate-400">website_funnel</code> source.
          </p>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            {funnels.map((f) => {
              const deleting = deletingId === f.websiteId;
              const pathLabel = f.pageSlug
                ? `/${f.pageSlug}`
                : `/sites/${f.slug}`;
              return (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/40 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{f.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {f.templateLabel} · {pathLabel} · {f.status}
                      {typeof f.pageCount === "number"
                        ? ` · ${f.pageCount} page${f.pageCount === 1 ? "" : "s"}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Link
                      href={f.href}
                      target="_blank"
                      className="rounded-md border border-slate-600 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      {f.status === "published" ? "Open live" : "Preview"}
                    </Link>
                    <Link
                      href={f.studioHref}
                      className="rounded-md bg-slate-800 px-2.5 py-1 text-xs text-white hover:bg-slate-700"
                    >
                      Studio
                    </Link>
                    {f.deletable ? (
                      <button
                        type="button"
                        disabled={busy || Boolean(deletingId)}
                        onClick={() => void onDelete(f)}
                        className="rounded-md border border-rose-900/70 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-950/40 disabled:opacity-50"
                      >
                        {deleting ? "Deleting…" : "Delete"}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
