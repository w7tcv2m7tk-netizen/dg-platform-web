"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { zonedLocalToUtc } from "@/lib/services-dates";

type Member = {
  clerkUserId: string;
  label: string;
};

export function ScheduleJobQuickForm({
  jobId,
  members,
  defaultDay,
  timeZone,
}: {
  jobId: string;
  members: Member[];
  defaultDay: string;
  timeZone: string;
}) {
  const router = useRouter();
  const [day, setDay] = useState(defaultDay);
  const [time, setTime] = useState("09:00");
  const [assignee, setAssignee] = useState(members[0]?.clerkUserId ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    let start: Date;
    try {
      start = zonedLocalToUtc(day, `${time}:00`, timeZone);
    } catch {
      setError("Invalid date/time");
      setPending(false);
      return;
    }
    if (Number.isNaN(start.getTime())) {
      setError("Invalid date/time");
      setPending(false);
      return;
    }
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    try {
      const res = await fetch(`/api/v1/services/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledStartAt: start.toISOString(),
          scheduledEndAt: end.toISOString(),
          assignedUserId: assignee || null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(json.error?.message || "Could not schedule");
        setPending(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="mt-2 flex flex-wrap items-end gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <label className="text-[11px] text-slate-500">
        Day
        <input
          type="date"
          required
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="mt-0.5 block min-h-11 rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white"
        />
      </label>
      <label className="text-[11px] text-slate-500">
        Start ({timeZone.replace(/_/g, " ")})
        <input
          type="time"
          required
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="mt-0.5 block min-h-11 rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white"
        />
      </label>
      {members.length > 0 ? (
        <label className="text-[11px] text-slate-500">
          Assignee
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="mt-0.5 block min-h-11 rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.clerkUserId} value={m.clerkUserId}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Scheduling…" : "Schedule"}
      </button>
      {error ? <span className="w-full text-xs text-rose-400">{error}</span> : null}
    </form>
  );
}
