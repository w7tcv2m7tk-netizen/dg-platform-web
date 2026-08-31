"use client";

import { useCallback, useEffect, useState } from "react";

import { TeamInviteForm } from "@/components/platform/TeamInviteForm";

type TeamMember = {
  id: string;
  email: string;
  role: string;
  displayName?: string | null;
};

export function Gen2OnboardingTeamStep({
  onContinue,
  saving,
}: {
  onContinue: () => void | Promise<void>;
  saving: boolean;
}) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/v1/org/team");
    const json = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(json.data?.members)) {
      setMembers(json.data.members as TeamMember[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section className="space-y-4 rounded-xl border border-slate-700/80 bg-slate-950/50 p-6">
      <p className="text-sm text-slate-400">
        Invite teammates to this organisation. Memberships are created in Gen 2 — not via WordPress
        users.
      </p>
      {loading ? (
        <p className="text-sm text-slate-500">Loading team…</p>
      ) : (
        <ul className="space-y-2 text-sm text-slate-300">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2">
              <span>{m.displayName?.trim() || m.email}</span>
              <span className="text-xs uppercase tracking-wide text-slate-500">{m.role}</span>
            </li>
          ))}
        </ul>
      )}
      <TeamInviteForm canInvite />
      <button
        type="button"
        disabled={saving || loading || members.length === 0}
        onClick={() => void onContinue()}
        className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        Continue
      </button>
    </section>
  );
}
