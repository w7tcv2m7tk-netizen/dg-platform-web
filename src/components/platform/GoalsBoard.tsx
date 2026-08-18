"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type {
  GoalHorizon,
  GoalMetric,
  GoalProgress,
  GoalStatus,
  SuggestedGoal,
} from "@dg/platform-core";

import { usePendingAction } from "@/hooks/usePendingAction";

const INPUT =
  "w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

const METRIC_LABELS: Record<GoalMetric, string> = {
  contacts: "CRM contacts",
  active_leads: "Active enquiries",
  open_opportunities: "Open opportunities",
  consultations: "Platform consultations",
  new_enquiries_week: "New enquiries this week",
  revenue_mtd_cents: "Revenue this month",
  business_health: "Business Health",
  website_health: "Website health",
  seo: "SEO score",
  ai_visibility: "AI Visibility",
  custom: "Custom target",
};

const HORIZON_LABELS: Record<GoalHorizon, string> = {
  month: "This month",
  quarter: "This quarter",
  year: "This year",
  ongoing: "Ongoing",
};

const METRICS = Object.entries(METRIC_LABELS) as Array<[GoalMetric, string]>;
const HORIZONS = Object.entries(HORIZON_LABELS) as Array<[GoalHorizon, string]>;

function statusClass(status: GoalStatus, percent: number) {
  if (status === "achieved" || percent >= 100) return "text-emerald-400";
  if (status === "paused") return "text-amber-400";
  if (status === "dropped") return "text-slate-500";
  if (percent >= 70) return "text-emerald-400";
  if (percent >= 40) return "text-sky-400";
  return "text-amber-300";
}

function GoalBar({ percent, status }: { percent: number; status: GoalStatus }) {
  const width = Math.max(0, Math.min(100, percent));
  const color =
    status === "dropped"
      ? "bg-slate-600"
      : status === "achieved" || percent >= 100
        ? "bg-emerald-500"
        : percent >= 70
          ? "bg-sky-500"
          : "bg-amber-400";
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function GoalsBoard({
  progress,
  suggestions,
}: {
  progress: GoalProgress[];
  suggestions: SuggestedGoal[];
}) {
  const router = useRouter();
  const { pending, error, setError, run, startTransition } = usePendingAction();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metric, setMetric] = useState<GoalMetric>("contacts");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [horizon, setHorizon] = useState<GoalHorizon>("quarter");
  const [dueAt, setDueAt] = useState("");

  async function parseJson(res: Response) {
    const json = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    if (!res.ok) {
      const message = json?.error?.message ?? "Could not save goal";
      setError(message);
      throw new Error(message);
    }
  }

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function createGoal(draft: {
    title: string;
    description?: string;
    metric: GoalMetric;
    target: number;
    current?: number;
    horizon: GoalHorizon;
    dueAt?: string;
  }) {
    await run(async () => {
      const res = await fetch("/api/v1/org/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      await parseJson(res);
      setTitle("");
      setDescription("");
      setTarget("");
      setCurrent("");
      setDueAt("");
      refresh();
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsedTarget = Number(target);
    const parsedCurrent = current.trim() ? Number(current) : undefined;
    const asCents = metric === "revenue_mtd_cents";
    await createGoal({
      title,
      description: description.trim() || undefined,
      metric,
      target: asCents ? Math.round(parsedTarget * 100) : parsedTarget,
      current:
        parsedCurrent == null
          ? undefined
          : asCents
            ? Math.round(parsedCurrent * 100)
            : parsedCurrent,
      horizon,
      dueAt: dueAt.trim() || undefined,
    });
  }

  async function setStatus(id: string, status: GoalStatus) {
    await run(async () => {
      const res = await fetch("/api/v1/org/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      await parseJson(res);
      refresh();
    });
  }

  async function removeGoal(id: string) {
    await run(async () => {
      const res = await fetch(`/api/v1/org/goals?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await parseJson(res);
      refresh();
    });
  }

  const active = progress.filter((item) => item.goal.status === "active");
  const other = progress.filter((item) => item.goal.status !== "active");

  return (
    <div className="space-y-6">
      <section className="dg-card">
        <h3 className="text-lg font-semibold text-white">Add a goal</h3>
        <p className="mt-1 text-sm text-slate-400">
          Targets feed Advisor, Overview, and Opportunity ranking. Live metrics come from the
          Digital Twin.
        </p>
        <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Title
            </span>
            <input
              className={`${INPUT} mt-1`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={120}
              placeholder="Hold 4 Platform Consultations this month"
            />
          </label>
          <label>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Metric
            </span>
            <select
              className={`${INPUT} mt-1`}
              value={metric}
              onChange={(event) => setMetric(event.target.value as GoalMetric)}
            >
              {METRICS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Horizon
            </span>
            <select
              className={`${INPUT} mt-1`}
              value={horizon}
              onChange={(event) => setHorizon(event.target.value as GoalHorizon)}
            >
              {HORIZONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Target
            </span>
            <input
              className={`${INPUT} mt-1`}
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              required
              inputMode="decimal"
              placeholder={metric === "revenue_mtd_cents" ? "10000" : "8"}
            />
          </label>
          <label>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Due
            </span>
            <input
              className={`${INPUT} mt-1`}
              type="date"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
          </label>
          {metric === "custom" ? (
            <label>
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Current
              </span>
              <input
                className={`${INPUT} mt-1`}
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
                inputMode="decimal"
                placeholder="Where you are today"
              />
            </label>
          ) : null}
          <label className="sm:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Why this matters
            </span>
            <textarea
              className={`${INPUT} mt-1 min-h-[72px]`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={400}
              placeholder="What this goal changes for the business"
            />
          </label>
          {error ? <p className="sm:col-span-2 text-sm text-red-400">{error}</p> : null}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save goal"}
            </button>
          </div>
        </form>
      </section>

      {suggestions.length ? (
        <section className="dg-card">
          <h3 className="text-lg font-semibold text-white">Suggested from the Twin</h3>
          <p className="mt-1 text-sm text-slate-400">
            Starting points based on enabled apps. Add one, then adjust the target.
          </p>
          <ul className="mt-4 space-y-3">
            {suggestions.map((item) => (
              <li
                key={`${item.metric}-${item.title}`}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-800 px-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.reason}</p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    createGoal({
                      title: item.title,
                      description: item.description,
                      metric: item.metric,
                      target: item.target,
                      horizon: item.horizon,
                    })
                  }
                  className="text-xs text-sky-400 hover:underline disabled:opacity-50"
                >
                  Add →
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="dg-card">
        <h3 className="text-lg font-semibold text-white">Active goals</h3>
        {active.length ? (
          <ul className="mt-4 space-y-4">
            {active.map((item) => (
              <li key={item.goal.id} className="rounded-lg border border-slate-800 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{item.goal.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {METRIC_LABELS[item.goal.metric]} ·{" "}
                      {HORIZON_LABELS[item.goal.horizon]}
                      {item.goal.dueAt
                        ? ` · due ${new Date(item.goal.dueAt).toLocaleDateString("en-AU")}`
                        : ""}
                    </p>
                    {item.goal.description ? (
                      <p className="mt-2 text-sm text-slate-400">{item.goal.description}</p>
                    ) : null}
                  </div>
                  <p className={`text-sm font-semibold ${statusClass(item.goal.status, item.percent)}`}>
                    {item.currentLabel} / {item.targetLabel}
                  </p>
                </div>
                <GoalBar percent={item.percent} status={item.goal.status} />
                <p className="mt-2 text-xs text-slate-500">{item.percent}% of target</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setStatus(item.goal.id, "achieved")}
                    className="text-emerald-400 hover:underline disabled:opacity-50"
                  >
                    Mark achieved
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setStatus(item.goal.id, "paused")}
                    className="text-amber-300 hover:underline disabled:opacity-50"
                  >
                    Pause
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setStatus(item.goal.id, "dropped")}
                    className="text-slate-400 hover:underline disabled:opacity-50"
                  >
                    Drop
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => removeGoal(item.goal.id)}
                    className="text-red-400 hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            No active goals yet. Add one above so Advisor has a target.
          </p>
        )}
      </section>

      {other.length ? (
        <section className="dg-card">
          <h3 className="text-lg font-semibold text-white">History</h3>
          <ul className="mt-4 space-y-3">
            {other.map((item) => (
              <li
                key={item.goal.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-3"
              >
                <div>
                  <p className="text-sm text-white">{item.goal.title}</p>
                  <p className="text-xs capitalize text-slate-500">{item.goal.status}</p>
                </div>
                <div className="flex gap-3 text-xs">
                  {item.goal.status !== "active" ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setStatus(item.goal.id, "active")}
                      className="text-sky-400 hover:underline disabled:opacity-50"
                    >
                      Reopen
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => removeGoal(item.goal.id)}
                    className="text-red-400 hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
