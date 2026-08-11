import Link from "next/link";

type Filters = {
  q: string;
  stage: string;
  assignee: string;
  status: string;
  from: string;
  to: string;
};

export function JobsListFilters({
  filters,
  stages,
  members,
}: {
  filters: Filters;
  stages: { id: string; label: string }[];
  members: { clerkUserId: string; label: string }[];
}) {
  const hasActive =
    Boolean(filters.q) ||
    Boolean(filters.stage) ||
    Boolean(filters.assignee) ||
    Boolean(filters.status) ||
    Boolean(filters.from) ||
    Boolean(filters.to);

  return (
    <form
      method="get"
      className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-700/80 bg-slate-950/40 p-4"
    >
      <label className="min-w-[12rem] flex-1 text-xs text-slate-500">
        Search
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Title, address…"
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        />
      </label>
      <label className="text-xs text-slate-500">
        Stage
        <select
          name="stage"
          defaultValue={filters.stage}
          className="mt-1 block rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          <option value="">All stages</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-slate-500">
        Assignee
        <select
          name="assignee"
          defaultValue={filters.assignee}
          className="mt-1 block rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          <option value="">Anyone</option>
          <option value="unassigned">Unassigned</option>
          {members.map((m) => (
            <option key={m.clerkUserId} value={m.clerkUserId}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-slate-500">
        Status
        <select
          name="status"
          defaultValue={filters.status}
          className="mt-1 block rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </label>
      <label className="text-xs text-slate-500">
        From
        <input
          name="from"
          type="date"
          defaultValue={filters.from}
          className="mt-1 block rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        />
      </label>
      <label className="text-xs text-slate-500">
        To
        <input
          name="to"
          type="date"
          defaultValue={filters.to}
          className="mt-1 block rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Filter
        </button>
        {hasActive ? (
          <Link
            href="/apps/services/jobs"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500 hover:text-white"
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
