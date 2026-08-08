"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { SerializedWebsite, WebsiteComponent } from "@dg/platform-core";

export function WebsiteStudioClient({
  initial,
}: {
  initial: SerializedWebsite;
}) {
  const router = useRouter();
  const [website, setWebsite] = useState(initial);
  const [pageId, setPageId] = useState(initial.pages?.[0]?.id ?? "");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    null,
  );

  const page = useMemo(
    () => website.pages?.find((p) => p.id === pageId) ?? website.pages?.[0],
    [website, pageId],
  );

  const selected = page?.components.find((c) => c.id === selectedComponentId);

  async function refreshFromServer() {
    const res = await fetch(`/api/v1/websites/${website.id}`);
    const json = (await res.json()) as { data?: SerializedWebsite };
    if (json.data) setWebsite(json.data);
    router.refresh();
  }

  async function publish() {
    setBusy(true);
    setStatus("Publishing…");
    const res = await fetch(`/api/v1/websites/${website.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });
    const json = (await res.json()) as {
      data?: SerializedWebsite;
      error?: { message?: string };
    };
    if (json.data) {
      setWebsite(json.data);
      setStatus("Published");
    } else {
      setStatus(json.error?.message || "Publish failed");
    }
    setBusy(false);
  }

  async function regenerate() {
    setBusy(true);
    setStatus("Regenerating from profile + brief…");
    const res = await fetch(`/api/v1/websites/${website.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerate: true }),
    });
    const json = (await res.json()) as {
      data?: { website?: SerializedWebsite; generator?: { source?: string } };
      error?: { message?: string };
    };
    if (json.data?.website) {
      setWebsite(json.data.website);
      setPageId(json.data.website.pages?.[0]?.id ?? "");
      setStatus(`Regenerated (${json.data.generator?.source ?? "ok"})`);
    } else {
      setStatus(json.error?.message || "Regenerate failed");
    }
    setBusy(false);
  }

  async function runAssist(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setBusy(true);
    setStatus("Applying…");
    const res = await fetch(`/api/v1/websites/${website.id}/assist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const json = (await res.json()) as {
      data?: { website: SerializedWebsite; applied: string; source: string };
      error?: { message?: string };
    };
    if (json.data) {
      setWebsite(json.data.website);
      setStatus(`${json.data.applied} (${json.data.source})`);
      setPrompt("");
    } else {
      setStatus(json.error?.message || "Assist failed");
    }
    setBusy(false);
  }

  async function saveComponentProps(nextProps: Record<string, unknown>) {
    if (!page || !selected) return;
    setBusy(true);
    const nextComponents: WebsiteComponent[] = page.components.map((c) =>
      c.id === selected.id ? { ...c, props: nextProps } : c,
    );
    const res = await fetch(
      `/api/v1/websites/${website.id}/pages/${page.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ components: nextComponents }),
      },
    );
    const json = (await res.json()) as {
      data?: { id: string };
      error?: { message?: string };
    };
    if (!res.ok) {
      setStatus(json.error?.message || "Save failed");
      setBusy(false);
      return;
    }
    await refreshFromServer();
    setStatus("Component saved");
    setBusy(false);
  }

  const previewQs = website.status === "published" ? "" : "?preview=1";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <p className="text-sm text-slate-400">
            {website.status} · /sites/{website.slug}
            {website.pages ? ` · ${website.pages.length} pages` : ""}
          </p>
          {status ? <p className="text-xs text-slate-500 mt-1">{status}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/sites/${website.slug}${previewQs}`}
            target="_blank"
            className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Preview
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={regenerate}
            className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            Regenerate
          </button>
          <button
            type="button"
            disabled={busy || website.status === "published"}
            onClick={publish}
            className="rounded-md bg-[var(--org-primary,#1e3a5f)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Publish
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[14rem_1fr_18rem]">
        <aside className="space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-slate-500">Pages</h2>
          <ul className="space-y-1">
            {(website.pages ?? []).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPageId(p.id);
                    setSelectedComponentId(null);
                  }}
                  className={`w-full text-left rounded-md px-2 py-1.5 text-sm ${
                    page?.id === p.id
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:bg-slate-900"
                  }`}
                >
                  {p.title}
                  <span className="block text-[11px] text-slate-500">/{p.slug}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="pt-4 space-y-1 border-t border-slate-800">
            <p className="text-xs uppercase tracking-wide text-slate-500">Later</p>
            <Link
              href="/apps/websites/domains"
              className="block text-sm text-slate-400 hover:text-slate-200"
            >
              Domains (stub)
            </Link>
            <Link
              href="/apps/websites/hosting"
              className="block text-sm text-slate-400 hover:text-slate-200"
            >
              Hosting (stub)
            </Link>
            <p className="text-xs text-slate-600 pt-2">
              Import from WordPress — connector path after native builder (see docs).
            </p>
          </div>
        </aside>

        <section className="space-y-4 min-w-0">
          <form onSubmit={runAssist} className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
              placeholder='Try: “add services page” or “change CTA to Book an appraisal”'
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-md border border-slate-500 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              Apply
            </button>
          </form>

          <div className="rounded-md border border-slate-700 bg-slate-950/60 p-3">
            <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-2">
              Components — {page?.title}
            </h2>
            <ul className="space-y-1">
              {(page?.components ?? []).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedComponentId(c.id)}
                    className={`w-full text-left rounded px-2 py-1.5 text-sm font-mono ${
                      selectedComponentId === c.id
                        ? "bg-slate-800 text-amber-200"
                        : "text-slate-300 hover:bg-slate-900"
                    }`}
                  >
                    {c.type}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <aside className="space-y-3">
          <h2 className="text-xs uppercase tracking-wide text-slate-500">
            Edit props
          </h2>
          {selected ? (
            <ComponentPropsEditor
              key={selected.id}
              component={selected}
              disabled={busy}
              onSave={saveComponentProps}
            />
          ) : (
            <p className="text-sm text-slate-500">Select a component to edit props.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function ComponentPropsEditor({
  component,
  disabled,
  onSave,
}: {
  component: WebsiteComponent;
  disabled?: boolean;
  onSave: (props: Record<string, unknown>) => void;
}) {
  const [raw, setRaw] = useState(JSON.stringify(component.props, null, 2));
  const [error, setError] = useState("");

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-300 font-mono">{component.type}</p>
      <textarea
        className="w-full min-h-[220px] rounded-md border border-slate-600 bg-slate-900 px-2 py-2 font-mono text-xs text-slate-200"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        disabled={disabled}
      />
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
      <button
        type="button"
        disabled={disabled}
        className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        onClick={() => {
          try {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            setError("");
            onSave(parsed);
          } catch {
            setError("Invalid JSON");
          }
        }}
      >
        Save props
      </button>
    </div>
  );
}
