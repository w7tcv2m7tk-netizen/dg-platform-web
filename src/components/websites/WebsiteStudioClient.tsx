"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type {
  SerializedWebsite,
  WebsiteComponent,
} from "@dg/platform-core";
import {
  isDefaultChromelessPage,
  resolvePageChromeVisibility,
} from "@dg/platform-core";

import { MakeItLivePanel } from "@/components/websites/MakeItLivePanel";
import { groupWebsitePages } from "@/components/websites/page-groups";
import { StudioSeoPanel } from "@/components/websites/StudioSeoPanel";
import { WordPressImportPanel } from "@/components/websites/WordPressImportPanel";

type StudioTab = "edit" | "seo" | "import";

const SUGGESTED_PROMPTS = [
  "Make it more premium",
  "Change CTA to Book an appraisal",
  "Add a FAQ page",
  "Set primary colour to navy",
  "Change headline to Local experts you can trust",
  "Rewrite for AI visibility",
];

export function WebsiteStudioClient({
  initial,
  linkedDomain,
}: {
  initial: SerializedWebsite;
  linkedDomain?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [website, setWebsite] = useState(initial);
  const [pageId, setPageId] = useState(() => {
    const fromQuery = searchParams.get("page");
    if (fromQuery && initial.pages?.some((p) => p.id === fromQuery || p.slug === fromQuery)) {
      const match = initial.pages.find(
        (p) => p.id === fromQuery || p.slug === fromQuery,
      );
      return match?.id ?? initial.pages?.[0]?.id ?? "";
    }
    return initial.pages?.[0]?.id ?? "";
  });
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    null,
  );
  const [showLivePanel, setShowLivePanel] = useState(
    () => searchParams.get("live") === "1" || searchParams.get("tab") !== "import",
  );
  const [tab, setTab] = useState<StudioTab>(() => {
    const t = searchParams.get("tab");
    if (t === "seo" || t === "import" || t === "edit") return t;
    return "edit";
  });

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "seo" || t === "import" || t === "edit") setTab(t);
    if (searchParams.get("live") === "1") {
      setShowLivePanel(true);
      if (t !== "seo" && t !== "import") setTab("edit");
    }
    const fromQuery = searchParams.get("page");
    if (fromQuery && website.pages) {
      const match = website.pages.find(
        (p) => p.id === fromQuery || p.slug === fromQuery,
      );
      if (match) setPageId(match.id);
    }
  }, [searchParams, website.pages]);

  const page = useMemo(
    () => website.pages?.find((p) => p.id === pageId) ?? website.pages?.[0],
    [website, pageId],
  );

  const pageGroups = useMemo(
    () => groupWebsitePages(website.pages),
    [website.pages],
  );

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    // Keep the group that holds the active page expanded
    if (!page || !pageGroups.length) return;
    const activeGroup = pageGroups.find((g) =>
      g.pages.some((p) => p.id === page.id),
    );
    if (!activeGroup) return;
    setCollapsedGroups((prev) => {
      if (prev[activeGroup.id] === false) return prev;
      return { ...prev, [activeGroup.id]: false };
    });
  }, [page, pageGroups]);

  const selected = page?.components.find((c) => c.id === selectedComponentId);
  const isPublished = website.status === "published";
  const previewQs = isPublished ? "" : "?preview=1";
  const primary = website.theme?.primaryColor || "#1e3a5f";
  const livePath = `/sites/${website.slug}`;
  const customLiveUrl = linkedDomain
    ? `https://${linkedDomain.replace(/^https?:\/\//, "")}`
    : null;

  async function refreshFromServer(): Promise<SerializedWebsite | null> {
    const res = await fetch(`/api/v1/websites/${website.id}`);
    const json = (await res.json()) as { data?: SerializedWebsite };
    if (json.data) {
      setWebsite(json.data);
      router.refresh();
      return json.data;
    }
    router.refresh();
    return null;
  }

  async function setPublishStatus(next: "published" | "draft") {
    setBusy(true);
    setStatus(next === "published" ? "Publishing…" : "Unpublishing…");
    const res = await fetch(`/api/v1/websites/${website.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const json = (await res.json()) as {
      data?: SerializedWebsite;
      error?: { message?: string };
    };
    if (json.data) {
      setWebsite(json.data);
      setStatus(next === "published" ? "Published" : "Back to draft");
    } else {
      setStatus(json.error?.message || "Status update failed");
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
      setSelectedComponentId(null);
      setStatus(`Regenerated (${json.data.generator?.source ?? "ok"})`);
    } else {
      setStatus(json.error?.message || "Regenerate failed");
    }
    setBusy(false);
  }

  async function runAssist(e?: React.FormEvent, overridePrompt?: string) {
    e?.preventDefault();
    const text = (overridePrompt ?? prompt).trim();
    if (!text) return;
    setBusy(true);
    setStatus("Applying…");
    const res = await fetch(`/api/v1/websites/${website.id}/assist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: text }),
    });
    const json = (await res.json()) as {
      data?: { website: SerializedWebsite; applied: string; source: string };
      error?: { message?: string };
    };
    if (json.data) {
      setWebsite(json.data.website);
      setStatus(`${json.data.applied} (${json.data.source})`);
      if (!overridePrompt) setPrompt("");
      if (json.data.website.pages?.length) {
        const still = json.data.website.pages.find((p) => p.id === pageId);
        if (!still) setPageId(json.data.website.pages[0].id);
      }
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

  async function savePageChrome(next: {
    showHeader: boolean;
    showFooter: boolean;
  }) {
    if (!page) return;
    setBusy(true);
    const res = await fetch(
      `/api/v1/websites/${website.id}/pages/${page.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seo: {
            ...(page.seo ?? {}),
            showHeader: next.showHeader,
            showFooter: next.showFooter,
          },
        }),
      },
    );
    const json = (await res.json()) as {
      data?: { id: string };
      error?: { message?: string };
    };
    if (!res.ok) {
      setStatus(json.error?.message || "Could not save page chrome");
      setBusy(false);
      return;
    }
    await refreshFromServer();
    setStatus(
      next.showHeader || next.showFooter
        ? "Page header/footer updated"
        : "Header and footer hidden on this page",
    );
    setBusy(false);
  }

  async function duplicatePage(targetPageId: string) {
    setBusy(true);
    setStatus("Duplicating page…");
    const res = await fetch(`/api/v1/websites/${website.id}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate", pageId: targetPageId }),
    });
    const json = (await res.json()) as {
      data?: { id: string };
      error?: { message?: string };
    };
    if (!res.ok) {
      setStatus(json.error?.message || "Duplicate failed");
      setBusy(false);
      return;
    }
    await refreshFromServer();
    if (json.data?.id) {
      setPageId(json.data.id);
      setSelectedComponentId(null);
    }
    setStatus("Page duplicated");
    setBusy(false);
  }

  async function deletePage(targetPageId: string) {
    const pages = website.pages ?? [];
    if (pages.length <= 1) {
      setStatus("Cannot delete the only page — add another first.");
      return;
    }
    const target = pages.find((p) => p.id === targetPageId);
    if (!target) return;
    if (
      !window.confirm(
        `Delete “${target.title}” (/${target.slug})? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setStatus("Deleting page…");
    const res = await fetch(
      `/api/v1/websites/${website.id}/pages/${targetPageId}`,
      { method: "DELETE" },
    );
    const json = (await res.json()) as {
      data?: { deleted?: boolean };
      error?: { message?: string };
    };
    if (!res.ok) {
      setStatus(json.error?.message || "Delete failed");
      setBusy(false);
      return;
    }
    const next = await refreshFromServer();
    if (pageId === targetPageId) {
      setPageId(next?.pages?.[0]?.id ?? "");
      setSelectedComponentId(null);
    }
    setStatus(`Deleted “${target.title}”`);
    setBusy(false);
  }

  async function movePage(targetPageId: string, direction: -1 | 1) {
    const pages = website.pages ?? [];
    const index = pages.findIndex((p) => p.id === targetPageId);
    if (index < 0) return;
    const next = index + direction;
    if (next < 0 || next >= pages.length) return;
    const ordered = pages.map((p) => p.id);
    const tmp = ordered[index];
    ordered[index] = ordered[next];
    ordered[next] = tmp;
    setBusy(true);
    const res = await fetch(`/api/v1/websites/${website.id}/pages`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageIds: ordered }),
    });
    const json = (await res.json()) as {
      data?: SerializedWebsite;
      error?: { message?: string };
    };
    if (json.data) {
      setWebsite(json.data);
      setStatus("Pages reordered");
    } else {
      setStatus(json.error?.message || "Reorder failed");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded border px-1.5 py-0.5 text-[11px] capitalize ${
                isPublished
                  ? "border-emerald-800/60 bg-emerald-950/40 text-emerald-300"
                  : "border-amber-800/50 bg-amber-950/30 text-amber-200"
              }`}
            >
              {website.status}
            </span>
            {website.metadata?.kind === "funnel" ? (
              <span className="rounded border border-sky-800/50 bg-sky-950/30 px-1.5 py-0.5 text-[11px] text-sky-200">
                funnel
              </span>
            ) : null}
            <p className="text-sm text-slate-400">
              {livePath}
              {website.pages ? ` · ${website.pages.length} pages` : ""}
              {linkedDomain ? ` · ${linkedDomain}` : ""}
            </p>
          </div>
          {status ? <p className="text-xs text-slate-500">{status}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`${livePath}${previewQs}`}
            target="_blank"
            className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            {isPublished ? "Open live" : "Preview"}
          </Link>
          {customLiveUrl && isPublished ? (
            <a
              href={customLiveUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-emerald-800/60 px-3 py-1.5 text-sm text-emerald-200 hover:bg-emerald-950/40"
            >
              Open {linkedDomain}
            </a>
          ) : !customLiveUrl ? (
            <button
              type="button"
              onClick={() => {
                setTab("edit");
                setShowLivePanel(true);
              }}
              className="rounded-md border border-amber-800/50 px-3 py-1.5 text-sm text-amber-200 hover:bg-amber-950/30"
            >
              Connect domain
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={regenerate}
            className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            Regenerate
          </button>
          {isPublished ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void setPublishStatus("draft")}
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
            >
              Unpublish
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void setPublishStatus("published")}
              className="rounded-md px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: primary }}
            >
              Publish
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-800 pb-2">
        {(
          [
            { id: "edit" as const, label: "Edit" },
            { id: "seo" as const, label: "SEO" },
            { id: "import" as const, label: "WordPress" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === t.id
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "seo" ? (
        <div className="space-y-4">
          <div className="space-y-3">
            {pageGroups.map((group) => (
              <div key={group.id} className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  {group.label}{" "}
                  <span className="text-slate-600">({group.pages.length})</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.pages.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPageId(p.id)}
                      className={`rounded-md px-2.5 py-1 text-xs ${
                        pageId === p.id
                          ? "bg-slate-800 text-white"
                          : "border border-slate-700 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <StudioSeoPanel
            website={website}
            pageId={pageId}
            disabled={busy}
            onSaved={(next, message) => {
              setWebsite(next);
              setStatus(message);
              router.refresh();
            }}
          />
        </div>
      ) : null}

      {tab === "import" ? (
        <WordPressImportPanel
          website={website}
          onImported={(next, summary) => {
            setWebsite(next);
            setPageId(next.pages?.[0]?.id ?? "");
            setSelectedComponentId(null);
            setStatus(summary || "WordPress import complete");
            setTab("edit");
            router.refresh();
          }}
        />
      ) : null}

      {tab === "edit" ? (
      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)_17rem]">
        <aside className="space-y-3">
          <h2 className="text-xs uppercase tracking-wide text-slate-500">Pages</h2>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {pageGroups.map((group) => {
              const defaultExpanded =
                group.id === "core" ||
                group.id === "apps" ||
                group.id === "apps-core" ||
                group.id === "apps-industry" ||
                group.id === "apps-growth" ||
                group.id === "units" ||
                group.id === "property";
              const collapsed =
                collapsedGroups[group.id] ?? !defaultExpanded;
              return (
                <div key={group.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedGroups((prev) => ({
                        ...prev,
                        [group.id]: !collapsed,
                      }))
                    }
                    className="flex w-full items-center justify-between rounded-md px-1.5 py-1 text-left text-[11px] uppercase tracking-wide text-slate-500 hover:text-slate-300"
                  >
                    <span>
                      {group.label}{" "}
                      <span className="text-slate-600">({group.pages.length})</span>
                    </span>
                    <span className="text-slate-600">{collapsed ? "+" : "−"}</span>
                  </button>
                  {!collapsed ? (
                    <ul className="space-y-1">
                      {group.pages.map((p) => {
                        const index =
                          website.pages?.findIndex((x) => x.id === p.id) ?? -1;
                        return (
                          <li
                            key={p.id}
                            className="rounded-md border border-transparent hover:border-slate-800"
                          >
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
                              <span className="block text-[11px] text-slate-500">
                                /{p.slug} · {p.components.length} blocks
                              </span>
                            </button>
                            <div className="flex flex-wrap gap-1 px-1 pb-1">
                              <button
                                type="button"
                                disabled={busy || index <= 0}
                                onClick={() => void movePage(p.id, -1)}
                                className="rounded px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-slate-300 disabled:opacity-30"
                                title="Move up"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                disabled={
                                  busy ||
                                  index < 0 ||
                                  index >= (website.pages?.length ?? 0) - 1
                                }
                                onClick={() => void movePage(p.id, 1)}
                                className="rounded px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-slate-300 disabled:opacity-30"
                                title="Move down"
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void duplicatePage(p.id)}
                                className="rounded px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-slate-300 disabled:opacity-30"
                              >
                                Duplicate
                              </button>
                              <button
                                type="button"
                                disabled={busy || (website.pages?.length ?? 0) <= 1}
                                onClick={() => void deletePage(p.id)}
                                className="rounded px-1.5 py-0.5 text-[10px] text-rose-400/80 hover:text-rose-300 disabled:opacity-30"
                                title={
                                  (website.pages?.length ?? 0) <= 1
                                    ? "Cannot delete the only page"
                                    : "Delete page"
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="pt-3 space-y-1 border-t border-slate-800">
            <p className="text-xs uppercase tracking-wide text-slate-500">Go live</p>
            <button
              type="button"
              onClick={() => setShowLivePanel((v) => !v)}
              className="block text-sm text-slate-400 hover:text-slate-200"
            >
              {showLivePanel ? "Hide" : "Show"} checklist
            </button>
            <Link
              href="/apps/infrastructure/domains"
              className="block text-sm text-slate-400 hover:text-slate-200"
            >
              Domains
            </Link>
            <Link
              href="/apps/websites/hosting"
              className="block text-sm text-slate-400 hover:text-slate-200"
            >
              Hosting status
            </Link>
            <button
              type="button"
              onClick={() => setTab("seo")}
              className="block text-sm text-slate-400 hover:text-slate-200"
            >
              SEO
            </button>
          </div>
        </aside>

        <section className="space-y-4 min-w-0">
          {showLivePanel ? (
            <MakeItLivePanel
              website={website}
              linkedDomain={linkedDomain}
              onWebsiteChange={(next) => setWebsite(next)}
            />
          ) : null}

          {page ? (
            <div className="rounded-md border border-amber-800/50 bg-amber-950/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">
                  Header &amp; footer — /{page.slug}
                </h2>
                <Link
                  href={
                    page.slug === "home" || page.intent === "home"
                      ? `${livePath}${previewQs}`
                      : `${livePath}/${page.slug}${previewQs}`
                  }
                  target="_blank"
                  className="text-[11px] text-sky-400 hover:underline"
                >
                  Open live preview
                </Link>
              </div>
              {(() => {
                const visibility = resolvePageChromeVisibility(
                  page.slug,
                  page.seo,
                );
                const autoHidden = isDefaultChromelessPage(page.slug);
                return (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 text-sm text-slate-100">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-500 bg-slate-900 accent-amber-500"
                        checked={visibility.showHeader}
                        disabled={busy}
                        onChange={(e) =>
                          void savePageChrome({
                            showHeader: e.target.checked,
                            showFooter: visibility.showFooter,
                          })
                        }
                      />
                      Show site header
                    </label>
                    <label className="flex items-center gap-2.5 text-sm text-slate-100">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-500 bg-slate-900 accent-amber-500"
                        checked={visibility.showFooter}
                        disabled={busy}
                        onChange={(e) =>
                          void savePageChrome({
                            showHeader: visibility.showHeader,
                            showFooter: e.target.checked,
                          })
                        }
                      />
                      Show site footer
                    </label>
                    <p className="text-[11px] text-slate-400">
                      {autoHidden
                        ? "Auto-hidden for this page type (units, legal, booking). Uncheck stays off; check to bring nav back."
                        : "Uncheck both to remove header and footer on this page only."}
                    </p>
                  </div>
                );
              })()}
            </div>
          ) : null}

          <div className="space-y-2">
            <form onSubmit={(e) => void runAssist(e)} className="flex gap-2">
              <input
                className="flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                placeholder='Try: “make it more premium” or “rewrite for AI visibility”'
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
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_PROMPTS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={busy}
                  onClick={() => void runAssist(undefined, chip)}
                  className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] text-slate-400 hover:border-slate-500 hover:text-slate-200 disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-700 bg-slate-950/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h2 className="text-xs uppercase tracking-wide text-slate-500">
                Site chrome status
              </h2>
            </div>
            {(() => {
              const chrome =
                website.metadata &&
                typeof website.metadata === "object" &&
                website.metadata.chrome &&
                typeof website.metadata.chrome === "object"
                  ? (website.metadata.chrome as {
                      headerHtml?: string | null;
                      footerHtml?: string | null;
                    })
                  : null;
              const headerLen = chrome?.headerHtml?.trim()?.length ?? 0;
              const footerLen = chrome?.footerHtml?.trim()?.length ?? 0;
              const hasBrand =
                Boolean(website.theme?.logoUrl || website.theme?.iconUrl);
              return (
                <div className="space-y-3 text-sm text-slate-400">
                  <p className="text-xs">
                    Per-page show/hide controls are in the{" "}
                    <span className="text-amber-200/90">Header &amp; footer</span>{" "}
                    panel above (and on the SEO tab).
                  </p>
                  <ul className="space-y-1 text-xs">
                    <li>
                      Header HTML:{" "}
                      <span className={headerLen ? "text-emerald-400" : "text-amber-300"}>
                        {headerLen ? `${headerLen.toLocaleString()} chars` : "not set"}
                      </span>
                    </li>
                    <li>
                      Footer HTML:{" "}
                      <span className={footerLen ? "text-emerald-400" : "text-amber-300"}>
                        {footerLen ? `${footerLen.toLocaleString()} chars` : "not set"}
                      </span>
                    </li>
                    <li>
                      Brand fallback:{" "}
                      <span className={hasBrand ? "text-emerald-400" : "text-slate-500"}>
                        {hasBrand
                          ? "theme logo/icon available if HTML chrome is empty"
                          : "no theme logo — set Business Profile brand"}
                      </span>
                    </li>
                  </ul>
                  {!headerLen && !footerLen ? (
                    <p className="text-xs text-amber-200/90">
                      Re-import chrome from marketing sources or paste header/footer HTML into site
                      metadata to restore icons and layout.
                    </p>
                  ) : null}
                </div>
              );
            })()}
          </div>

          <div className="rounded-md border border-slate-700 bg-slate-950/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h2 className="text-xs uppercase tracking-wide text-slate-500">
                Components — {page?.title}
              </h2>
              {page ? (
                <Link
                  href={
                    page.slug === "home" || page.intent === "home"
                      ? `${livePath}${previewQs}`
                      : `${livePath}/${page.slug}${previewQs}`
                  }
                  target="_blank"
                  className="text-[11px] text-sky-400 hover:underline"
                >
                  Preview page
                </Link>
              ) : null}
            </div>
            <ul className="space-y-1">
              {(page?.components ?? []).map((c, index) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedComponentId(c.id)}
                    className={`w-full text-left rounded px-2 py-1.5 text-sm ${
                      selectedComponentId === c.id
                        ? "bg-slate-800 text-amber-200"
                        : "text-slate-300 hover:bg-slate-900"
                    }`}
                  >
                    <span className="text-slate-500 mr-2">{index + 1}.</span>
                    <span className="font-mono">{c.type}</span>
                    <ComponentSummary component={c} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <aside className="space-y-3">
          <h2 className="text-xs uppercase tracking-wide text-slate-500">
            Edit component
          </h2>
          {selected ? (
            <ComponentPropsEditor
              key={selected.id}
              component={selected}
              disabled={busy}
              onSave={saveComponentProps}
            />
          ) : (
            <p className="text-sm text-slate-500">
              Select a component to edit fields, or use AI prompts above.
            </p>
          )}
        </aside>
      </div>
      ) : null}
    </div>
  );
}

function ComponentSummary({ component }: { component: WebsiteComponent }) {
  const hint =
    typeof component.props.headline === "string"
      ? component.props.headline
      : typeof component.props.text === "string"
        ? component.props.text
        : typeof component.props.src === "string"
          ? component.props.src
          : typeof component.props.businessName === "string"
            ? component.props.businessName
            : typeof component.props.ctaLabel === "string"
              ? component.props.ctaLabel
              : typeof component.props.buttonLabel === "string"
                ? component.props.buttonLabel
                : null;
  if (!hint) return null;
  return (
    <span className="block text-[11px] text-slate-500 truncate font-sans">
      {hint}
    </span>
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
  const [props, setProps] = useState<Record<string, unknown>>(component.props);
  const [mode, setMode] = useState<"fields" | "json">(
    hasFriendlyFields(component.type) ? "fields" : "json",
  );
  const [raw, setRaw] = useState(JSON.stringify(component.props, null, 2));
  const [error, setError] = useState("");

  function updateField(key: string, value: unknown) {
    setProps((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-slate-300 font-mono">{component.type}</p>
        {hasFriendlyFields(component.type) ? (
          <button
            type="button"
            className="text-[11px] text-slate-500 hover:text-slate-300"
            onClick={() => {
              if (mode === "fields") {
                setRaw(JSON.stringify(props, null, 2));
                setMode("json");
              } else {
                try {
                  setProps(JSON.parse(raw) as Record<string, unknown>);
                  setError("");
                  setMode("fields");
                } catch {
                  setError("Invalid JSON");
                }
              }
            }}
          >
            {mode === "fields" ? "JSON" : "Fields"}
          </button>
        ) : null}
      </div>

      {mode === "fields" && hasFriendlyFields(component.type) ? (
        <FriendlyFields
          type={component.type}
          props={props}
          disabled={disabled}
          onChange={updateField}
        />
      ) : (
        <textarea
          className="w-full min-h-[220px] rounded-md border border-slate-600 bg-slate-900 px-2 py-2 font-mono text-xs text-slate-200"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          disabled={disabled}
        />
      )}

      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
      <button
        type="button"
        disabled={disabled}
        className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        onClick={() => {
          if (mode === "json") {
            try {
              const parsed = JSON.parse(raw) as Record<string, unknown>;
              setError("");
              onSave(parsed);
            } catch {
              setError("Invalid JSON");
            }
            return;
          }
          onSave(props);
        }}
      >
        Save
      </button>
    </div>
  );
}

function hasFriendlyFields(type: string): boolean {
  return [
    "nav",
    "hero",
    "cta",
    "about",
    "contact_form",
    "footer",
    "services",
    "trust",
    "heading",
    "paragraph",
    "image",
    "list",
    "html",
    "post_grid",
  ].includes(type);
}

function Field({
  label,
  value,
  disabled,
  multiline,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  multiline?: boolean;
  onChange: (v: string) => void;
}) {
  const className =
    "mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-white";
  return (
    <label className="block text-xs text-slate-500">
      {label}
      {multiline ? (
        <textarea
          className={`${className} min-h-[88px]`}
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
    </label>
  );
}

function FriendlyFields({
  type,
  props,
  disabled,
  onChange,
}: {
  type: string;
  props: Record<string, unknown>;
  disabled?: boolean;
  onChange: (key: string, value: unknown) => void;
}) {
  const str = (key: string) =>
    typeof props[key] === "string" ? (props[key] as string) : "";

  if (type === "nav") {
    const links = Array.isArray(props.links)
      ? (props.links as Array<{ label?: string; href?: string }>)
          .map((l) => `${l.label ?? ""}|${l.href ?? ""}`)
          .join("\n")
      : "";
    return (
      <Field
        label="Links (label|href per line)"
        value={links}
        disabled={disabled}
        multiline
        onChange={(v) =>
          onChange(
            "links",
            v
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [label, ...rest] = line.split("|");
                return {
                  label: label.trim() || "Link",
                  href: rest.join("|").trim() || "/",
                };
              }),
          )
        }
      />
    );
  }
  if (type === "hero") {
    return (
      <div className="space-y-2">
        <Field label="Headline" value={str("headline")} disabled={disabled} onChange={(v) => onChange("headline", v)} />
        <Field label="Subheadline" value={str("subheadline")} disabled={disabled} multiline onChange={(v) => onChange("subheadline", v)} />
        <Field label="CTA label" value={str("ctaLabel")} disabled={disabled} onChange={(v) => onChange("ctaLabel", v)} />
        <Field label="CTA href" value={str("ctaHref")} disabled={disabled} onChange={(v) => onChange("ctaHref", v)} />
      </div>
    );
  }
  if (type === "cta") {
    return (
      <div className="space-y-2">
        <Field label="Headline" value={str("headline")} disabled={disabled} onChange={(v) => onChange("headline", v)} />
        <Field label="Body" value={str("body")} disabled={disabled} multiline onChange={(v) => onChange("body", v)} />
        <Field label="Button label" value={str("buttonLabel")} disabled={disabled} onChange={(v) => onChange("buttonLabel", v)} />
        <Field label="Button href" value={str("buttonHref")} disabled={disabled} onChange={(v) => onChange("buttonHref", v)} />
      </div>
    );
  }
  if (type === "about") {
    return (
      <div className="space-y-2">
        <Field label="Headline" value={str("headline")} disabled={disabled} onChange={(v) => onChange("headline", v)} />
        <Field label="Body" value={str("body")} disabled={disabled} multiline onChange={(v) => onChange("body", v)} />
      </div>
    );
  }
  if (type === "contact_form") {
    return (
      <div className="space-y-2">
        <Field label="Headline" value={str("headline")} disabled={disabled} onChange={(v) => onChange("headline", v)} />
        <Field label="Submit label" value={str("submitLabel")} disabled={disabled} onChange={(v) => onChange("submitLabel", v)} />
        <Field label="Success message" value={str("successMessage")} disabled={disabled} multiline onChange={(v) => onChange("successMessage", v)} />
      </div>
    );
  }
  if (type === "footer") {
    return (
      <div className="space-y-2">
        <Field label="Business name" value={str("businessName")} disabled={disabled} onChange={(v) => onChange("businessName", v)} />
        <Field label="Phone" value={str("phone")} disabled={disabled} onChange={(v) => onChange("phone", v)} />
        <Field label="Email" value={str("email")} disabled={disabled} onChange={(v) => onChange("email", v)} />
      </div>
    );
  }
  if (type === "trust") {
    const items = Array.isArray(props.items)
      ? props.items.map((x) => String(x)).join("\n")
      : "";
    return (
      <Field
        label="Trust items (one per line)"
        value={items}
        disabled={disabled}
        multiline
        onChange={(v) =>
          onChange(
            "items",
            v
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
      />
    );
  }
  if (type === "services") {
    const items = Array.isArray(props.items)
      ? (props.items as Array<{ title?: string; description?: string }>)
          .map((i) => `${i.title ?? ""}|${i.description ?? ""}`)
          .join("\n")
      : "";
    return (
      <div className="space-y-2">
        <Field label="Headline" value={str("headline")} disabled={disabled} onChange={(v) => onChange("headline", v)} />
        <Field
          label="Services (title|description per line)"
          value={items}
          disabled={disabled}
          multiline
          onChange={(v) =>
            onChange(
              "items",
              v
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => {
                  const [title, ...rest] = line.split("|");
                  return {
                    title: title.trim() || "Service",
                    description: rest.join("|").trim(),
                  };
                }),
            )
          }
        />
      </div>
    );
  }
  if (type === "heading") {
    return (
      <div className="space-y-2">
        <Field
          label="Level (1–6)"
          value={String(props.level ?? 2)}
          disabled={disabled}
          onChange={(v) => onChange("level", Number(v) || 2)}
        />
        <Field
          label="Text"
          value={str("text")}
          disabled={disabled}
          onChange={(v) => onChange("text", v)}
        />
      </div>
    );
  }
  if (type === "paragraph") {
    return (
      <Field
        label="Text"
        value={str("text")}
        disabled={disabled}
        multiline
        onChange={(v) => onChange("text", v)}
      />
    );
  }
  if (type === "image") {
    return (
      <div className="space-y-2">
        <Field label="Image URL" value={str("src")} disabled={disabled} onChange={(v) => onChange("src", v)} />
        <Field label="Alt text" value={str("alt")} disabled={disabled} onChange={(v) => onChange("alt", v)} />
      </div>
    );
  }
  if (type === "list") {
    const items = Array.isArray(props.items)
      ? props.items.map((x) => String(x)).join("\n")
      : "";
    return (
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={Boolean(props.ordered)}
            disabled={disabled}
            onChange={(e) => onChange("ordered", e.target.checked)}
          />
          Ordered list
        </label>
        <Field
          label="Items (one per line)"
          value={items}
          disabled={disabled}
          multiline
          onChange={(v) =>
            onChange(
              "items",
              v
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
      </div>
    );
  }
  if (type === "html") {
    return (
      <Field
        label="HTML (sanitized leftover from WP — theme CSS not included)"
        value={str("html")}
        disabled={disabled}
        multiline
        onChange={(v) => onChange("html", v)}
      />
    );
  }
  return null;
}
