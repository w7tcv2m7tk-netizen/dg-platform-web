"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  ProspectActivityFeedItem,
  ProspectActivityKind,
  ProspectActivityTimeBucket,
  ProspectingActivityWorkspace,
} from "@dg/platform-core";

const KIND_FILTERS: Array<{ id: "all" | ProspectActivityKind; label: string }> = [
  { id: "all", label: "All" },
  { id: "call", label: "Calls" },
  { id: "note", label: "Notes" },
  { id: "task", label: "Tasks" },
  { id: "email", label: "Emails" },
  { id: "sms", label: "SMS" },
  { id: "meeting", label: "Meetings" },
  { id: "follow_up", label: "Follow-ups" },
];

const TIME_FILTERS: Array<{ id: "all" | ProspectActivityTimeBucket; label: string }> = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "overdue", label: "Overdue" },
  { id: "recent", label: "Recent" },
];

function kindLabel(kind: ProspectActivityKind) {
  switch (kind) {
    case "call":
      return "Call";
    case "note":
      return "Note";
    case "task":
      return "Task";
    case "email":
      return "Email";
    case "sms":
      return "SMS";
    case "meeting":
      return "Meeting";
    case "follow_up":
      return "Follow-up due";
    case "audit":
      return "Audit";
    case "report":
      return "Report";
    case "engagement":
      return "Engagement";
    default:
      return "Activity";
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDayHeading(iso: string, bucket: ProspectActivityTimeBucket) {
  if (bucket === "today") return "Today";
  if (bucket === "overdue") return "Overdue";
  if (bucket === "upcoming") return "Upcoming";
  const d = new Date(iso);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" });
}

function groupFeed(items: ProspectActivityFeedItem[]) {
  const groups: Array<{ key: string; label: string; items: ProspectActivityFeedItem[] }> = [];
  for (const item of items) {
    const label = formatDayHeading(item.occurredAt, item.bucket);
    const key = `${item.bucket}-${label}`;
    const existing = groups.find((g) => g.key === key);
    if (existing) existing.items.push(item);
    else groups.push({ key, label, items: [item] });
  }
  return groups;
}

export function ProspectingActivitySurface({
  data,
}: {
  data: ProspectingActivityWorkspace;
}) {
  const [kind, setKind] = useState<"all" | ProspectActivityKind>("all");
  const [time, setTime] = useState<"all" | ProspectActivityTimeBucket>("all");

  const filtered = useMemo(() => {
    return data.feed.filter((item) => {
      if (kind !== "all" && item.kind !== kind) return false;
      if (time !== "all" && item.bucket !== time) {
        // "recent" filter also includes today
        if (!(time === "recent" && item.bucket === "today")) return false;
      }
      return true;
    });
  }, [data.feed, kind, time]);

  const groups = useMemo(() => groupFeed(filtered), [filtered]);
  const { summary, intelligence } = data;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/prospecting" className="text-sm text-sky-400 hover:underline">
          ← Growth Engine™
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Activity</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Calls, messages, notes, tasks and follow-ups across your prospect pipeline.
        </p>
      </header>

      <main className="dg-page-main space-y-8">
        {/* Architecture rule */}
        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Connected activity
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Activity stays attached to the prospect and carries into CRM when you convert — so
            follow-up history is never trapped in a separate tool.
          </p>
        </section>

        {/* Today summary */}
        <section className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">Today</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryChip label="Calls due" value={summary.callsDue} />
            <SummaryChip label="Follow-ups due" value={summary.followUpsDue} />
            <SummaryChip label="Tasks due" value={summary.tasksDue} />
            <SummaryChip label="Overdue" value={summary.overdue} tone={summary.overdue > 0 ? "rose" : "default"} />
            <SummaryChip label="Recent activity" value={summary.recentCount} />
          </div>
        </section>

        {/* Intelligence */}
        <section className="rounded-xl border border-violet-500/25 bg-violet-500/5 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-400">
            What needs attention
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>
              <span className="font-semibold text-white">
                {intelligence.followUpsNeedingAttention}
              </span>{" "}
              follow-up{intelligence.followUpsNeedingAttention === 1 ? "" : "s"} need attention today
            </li>
            <li>
              <span className="font-semibold text-white">{intelligence.quietProspects}</span> prospect
              {intelligence.quietProspects === 1 ? " has" : "s have"} gone quiet
            </li>
            <li>
              <span className="font-semibold text-white">
                {intelligence.highValueMissingNextAction}
              </span>{" "}
              high-value prospect
              {intelligence.highValueMissingNextAction === 1 ? " has" : "s have"} no clear next
              action
            </li>
          </ul>
          {intelligence.topRecommendation ? (
            <p className="mt-4 text-sm text-slate-200">
              <span className="text-slate-500">Recommended next action:</span>{" "}
              {intelligence.topRecommendation.actionLabel} ·{" "}
              {intelligence.topRecommendation.businessName}
              <span className="mt-1 block text-xs text-slate-500">
                {intelligence.topRecommendation.reason}
              </span>
            </p>
          ) : null}
          <Link
            href="/apps/prospecting/pipeline"
            className="mt-4 inline-block text-sm text-sky-400 hover:underline"
          >
            Open Prospect Pipeline →
          </Link>
        </section>

        {/* Filters */}
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {KIND_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setKind(f.id)}
                className={`rounded-full px-3 py-1.5 text-xs ${
                  kind === f.id
                    ? "bg-sky-600 text-white"
                    : "border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {TIME_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTime(f.id)}
                className={`rounded-full px-3 py-1.5 text-xs ${
                  time === f.id
                    ? "bg-violet-600/80 text-white"
                    : "border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {/* Feed */}
        {data.prospectCount === 0 ? (
          <section className="rounded-xl border border-dashed border-slate-700 bg-slate-950/30 px-6 py-10 text-center">
            <p className="text-lg font-semibold text-white">No prospect activity yet.</p>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">
              Run Business Discovery or add a prospect. Calls, messages, notes, tasks and follow-ups
              will appear here — and stay with the record when you convert into CRM.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/apps/prospecting/discovery"
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
              >
                Discover businesses
              </Link>
              <Link
                href="/apps/prospecting/pipeline"
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-slate-400"
              >
                Open pipeline
              </Link>
            </div>
          </section>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500">No activity matches these filters.</p>
        ) : (
          <section className="space-y-8">
            {groups.map((group) => (
              <div key={group.key}>
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {group.label}
                </h2>
                <ul className="mt-3 space-y-3">
                  {group.items.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-slate-500">
                            {formatTime(item.occurredAt)} · {kindLabel(item.kind)}
                          </p>
                          <p className="mt-1 text-sm font-medium text-white">
                            {item.businessName}
                            {item.contactName ? (
                              <span className="font-normal text-slate-400">
                                {" "}
                                — {item.contactName}
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-1 text-sm text-slate-300">{item.title}</p>
                          {item.body ? (
                            <p className="mt-1 text-sm text-slate-500">{item.body}</p>
                          ) : null}
                          {item.nextAction ? (
                            <p className="mt-2 text-sm text-slate-200">
                              <span className="text-slate-500">Next action:</span> {item.nextAction}
                            </p>
                          ) : null}
                        </div>
                        {item.ctaHref ? (
                          item.ctaHref.startsWith("tel:") || item.ctaHref.startsWith("mailto:") ? (
                            <a
                              href={item.ctaHref}
                              className="shrink-0 rounded-lg border border-emerald-700/50 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:border-emerald-500"
                            >
                              {item.ctaLabel ?? "Open"} →
                            </a>
                          ) : (
                            <Link
                              href={item.ctaHref}
                              className="shrink-0 rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-400"
                            >
                              {item.ctaLabel ?? "Open"} →
                            </Link>
                          )
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}
      </main>
    </>
  );
}

function SummaryChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "rose";
}) {
  return (
    <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          tone === "rose" && value > 0 ? "text-rose-300" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
