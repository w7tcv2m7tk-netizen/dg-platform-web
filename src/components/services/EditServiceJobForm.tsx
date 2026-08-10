"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type JobType = { id: string; label: string };
type JobField = { id: string; label: string; type: "text" | "textarea" | "boolean" };
type MemberOption = { clerkUserId: string; label: string };
type QuoteSummary = {
  id: string;
  quoteNumber: string | null;
  status: string;
  totalCents: number | null;
  currency: string;
  createdAt: string;
};

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditServiceJobForm({
  job,
  jobTypes,
  jobFields,
  members,
  quotes,
  contact,
  customerLabel = "Customer",
  quoteLabel = "Quote",
}: {
  job: {
    id: string;
    title: string;
    jobType: string | null;
    description: string | null;
    siteAddress: string | null;
    scheduledStartAt: string | null;
    scheduledEndAt: string | null;
    assignedUserId: string | null;
    contactId: string | null;
    metadata: Record<string, unknown> | null;
  };
  jobTypes: JobType[];
  jobFields: JobField[];
  members: MemberOption[];
  quotes: QuoteSummary[];
  contact: { id: string; label: string } | null;
  customerLabel?: string;
  quoteLabel?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);

    const metadata: Record<string, unknown> = { ...(job.metadata ?? {}) };
    for (const field of jobFields) {
      if (field.type === "boolean") {
        metadata[field.id] = fd.get(field.id) === "on";
      } else {
        const value = String(fd.get(field.id) ?? "").trim();
        if (value) metadata[field.id] = value;
        else delete metadata[field.id];
      }
    }

    const startRaw = String(fd.get("scheduledStartAt") ?? "");
    const endRaw = String(fd.get("scheduledEndAt") ?? "");
    const assigneeRaw = String(fd.get("assignedUserId") ?? "");

    const payload = {
      title: String(fd.get("title") ?? ""),
      jobType: String(fd.get("jobType") ?? "") || null,
      description: String(fd.get("description") ?? "") || null,
      siteAddress: String(fd.get("siteAddress") ?? "") || null,
      scheduledStartAt: startRaw ? new Date(startRaw).toISOString() : null,
      scheduledEndAt: endRaw ? new Date(endRaw).toISOString() : null,
      assignedUserId: assigneeRaw || null,
      metadata,
    };

    const res = await fetch(`/api/v1/services/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not save job");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const newQuoteHref = job.contactId
    ? `/apps/commerce/quotes?contactId=${encodeURIComponent(job.contactId)}`
    : "/apps/commerce/quotes";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={onSubmit} className="dg-card space-y-4">
        <h2 className="font-semibold text-white">Job details</h2>
        <input
          name="title"
          required
          defaultValue={job.title}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        />
        <select
          name="jobType"
          defaultValue={job.jobType ?? ""}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          <option value="">Job type</option>
          {jobTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          name="siteAddress"
          defaultValue={job.siteAddress ?? ""}
          placeholder="Site address"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-slate-500">
            Start
            <input
              name="scheduledStartAt"
              type="datetime-local"
              defaultValue={toLocalInput(job.scheduledStartAt)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-500">
            End
            <input
              name="scheduledEndAt"
              type="datetime-local"
              defaultValue={toLocalInput(job.scheduledEndAt)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>
        <label className="block text-xs text-slate-500">
          Assignee
          <select
            name="assignedUserId"
            defaultValue={job.assignedUserId ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.clerkUserId} value={m.clerkUserId}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-slate-500">
          <Link href="/dashboard/settings/team" className="text-sky-400 hover:underline">
            Manage team → Settings
          </Link>
        </p>
        <textarea
          name="description"
          rows={3}
          defaultValue={job.description ?? ""}
          placeholder="Description"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        />
        {jobFields.length > 0 ? (
          <div className="space-y-3 border-t border-slate-800 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Template fields
            </p>
            {jobFields.map((field) => {
              const raw = job.metadata?.[field.id];
              if (field.type === "boolean") {
                return (
                  <label
                    key={field.id}
                    className="flex items-center gap-2 text-sm text-slate-300"
                  >
                    <input
                      type="checkbox"
                      name={field.id}
                      defaultChecked={Boolean(raw)}
                      className="rounded border-slate-600"
                    />
                    {field.label}
                  </label>
                );
              }
              if (field.type === "textarea") {
                return (
                  <label key={field.id} className="block text-xs text-slate-500">
                    {field.label}
                    <textarea
                      name={field.id}
                      rows={2}
                      defaultValue={typeof raw === "string" ? raw : ""}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                    />
                  </label>
                );
              }
              return (
                <label key={field.id} className="block text-xs text-slate-500">
                  {field.label}
                  <input
                    name={field.id}
                    defaultValue={typeof raw === "string" ? raw : ""}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  />
                </label>
              );
            })}
          </div>
        ) : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {saved ? <p className="text-sm text-emerald-300">Saved</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save job"}
        </button>
      </form>

      <div className="space-y-6">
        <div className="dg-card space-y-3">
          <h2 className="font-semibold text-white">{customerLabel}</h2>
          {contact ? (
            <Link
              href={`/apps/crm/contacts/${contact.id}`}
              className="text-sky-400 hover:underline"
            >
              {contact.label} →
            </Link>
          ) : (
            <p className="text-sm text-slate-500">No customer linked</p>
          )}
        </div>

        <div className="dg-card space-y-3">
          <h2 className="font-semibold text-white">{quoteLabel}s · Commerce</h2>
          <p className="text-xs text-slate-500">
            Quotes live in Commerce — not a separate Services module.
          </p>
          {!quotes.length ? (
            <p className="text-sm text-slate-500">No linked quotes yet.</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {quotes.map((q) => (
                <li key={q.id} className="py-2">
                  <Link
                    href={`/apps/commerce/quotes/${q.id}`}
                    className="block hover:opacity-90"
                  >
                    <p className="text-sm font-medium text-white">
                      {q.quoteNumber ?? q.id.slice(0, 8)} · {q.status}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(q.createdAt).toLocaleDateString("en-AU")}
                      {q.totalCents != null
                        ? ` · ${new Intl.NumberFormat("en-AU", {
                            style: "currency",
                            currency: q.currency || "AUD",
                          }).format(q.totalCents / 100)}`
                        : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href={newQuoteHref} className="inline-block text-sm text-sky-400 hover:underline">
            New {quoteLabel.toLowerCase()} in Commerce →
          </Link>
        </div>
      </div>
    </div>
  );
}
