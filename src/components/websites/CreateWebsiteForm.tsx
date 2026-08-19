"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { WebsiteTemplateId } from "@dg/platform-core";

const TEMPLATES: Array<{
  id: WebsiteTemplateId | "auto";
  label: string;
  detail: string;
}> = [
  {
    id: "auto",
    label: "Auto (from profile)",
    detail: "Uses industry vertical / enabled apps",
  },
  {
    id: "real_estate",
    label: "Real Estate",
    detail: "Home · Listings/Appraisals · About · Contact",
  },
  {
    id: "accommodation",
    label: "Accommodation",
    detail: "Home · Stay/Units · About · Contact",
  },
  {
    id: "generic",
    label: "Services / generic",
    detail: "Home · Services · About · Contact",
  },
];

export function CreateWebsiteForm({
  defaultBrief,
  suggestedTemplate = "auto",
}: {
  defaultBrief?: string;
  suggestedTemplate?: WebsiteTemplateId | "auto";
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [brief, setBrief] = useState(defaultBrief ?? "");
  const [template, setTemplate] = useState<WebsiteTemplateId | "auto">(
    suggestedTemplate,
  );
  const [brandPath, setBrandPath] = useState<"have" | "ai" | "later">("later");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (brandPath === "have") {
      router.push("/apps/websites/logo?from=website-create");
      return;
    }
    if (brandPath === "ai") {
      router.push("/apps/websites/logo?intent=ai&from=website-create");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          brief: brief.trim() || undefined,
          generate: true,
          template,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: { website?: { id: string } };
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(json.error?.message || "Could not create website");
        setLoading(false);
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
    setLoading(false);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 max-w-xl rounded-lg border border-slate-700 bg-slate-900/40 p-5"
    >
      <div>
        <p className="block text-sm text-slate-300 mb-2">Brand for this site</p>
        <div className="grid gap-2">
          {(
            [
              {
                id: "have" as const,
                label: "I already have a brand",
                detail: "Upload logo / colours in Logos, then come back",
              },
              {
                id: "ai" as const,
                label: "Create my brand with AI",
                detail: "Opens Logos — upload now; AI concepts next",
              },
              {
                id: "later" as const,
                label: "I’ll do it later",
                detail: "Build the site now with temporary identity — never blocked",
              },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setBrandPath(opt.id)}
              className={`rounded-md border px-3 py-2 text-left transition ${
                brandPath === opt.id
                  ? "border-sky-700/70 bg-sky-950/30"
                  : "border-slate-700 bg-slate-950/40 hover:border-slate-600"
              }`}
            >
              <span className="block text-sm text-white">{opt.label}</span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                {opt.detail}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm text-slate-300 mb-1">Site name (optional)</label>
        <input
          className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-white"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Uses Business Profile name if blank"
          disabled={brandPath !== "later"}
        />
      </div>
      <div>
        <p className="block text-sm text-slate-300 mb-2">Industry template</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplate(t.id)}
              disabled={brandPath !== "later"}
              className={`rounded-md border px-3 py-2 text-left transition ${
                template === t.id
                  ? "border-sky-700/70 bg-sky-950/30"
                  : "border-slate-700 bg-slate-950/40 hover:border-slate-600"
              } disabled:opacity-50`}
            >
              <span className="block text-sm text-white">{t.label}</span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                {t.detail}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm text-slate-300 mb-1">Brief</label>
        <textarea
          className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-white min-h-[100px]"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="e.g. Premium Currumbin agency focused on vendor appraisals…"
          disabled={brandPath !== "later"}
        />
      </div>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-[var(--org-primary,#1e3a5f)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading
          ? "Generating site…"
          : brandPath === "later"
            ? "Create from Business Profile"
            : brandPath === "have"
              ? "Continue to Logos →"
              : "Open Logos →"}
      </button>
      <p className="text-xs text-slate-500">
        Structured components (not HTML). Brand is optional —{" "}
        <Link href="/apps/websites/logo" className="text-slate-300 underline">
          Logos
        </Link>{" "}
        anytime for colours, logo, and mark.
      </p>
    </form>
  );
}
