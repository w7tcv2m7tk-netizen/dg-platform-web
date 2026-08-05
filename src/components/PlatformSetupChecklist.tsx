import type { PlatformSetupStatus } from "@dg/platform-core";

function CheckItem({
  done,
  children,
}: {
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2">
      <span className={done ? "text-emerald-400" : "text-slate-500"}>
        {done ? "✓" : "○"}
      </span>
      <span className={done ? "text-slate-200" : "text-slate-400"}>
        {children}
      </span>
    </li>
  );
}

export function PlatformSetupChecklist({
  status,
  organisationName,
}: {
  status: PlatformSetupStatus;
  organisationName: string;
}) {
  const allDone =
    status.orgProvisioned && status.hasContacts && status.hasTimelineActivity;

  return (
    <div>
      <ul className="mt-3 space-y-2 text-sm">
        <CheckItem done={status.orgProvisioned}>
          Organisation in Postgres ({organisationName})
        </CheckItem>
        <CheckItem done={status.hasTeamMember}>Team member linked</CheckItem>
        <CheckItem done={status.hasContacts}>
          First contact created
          {status.contactCount > 0 ? ` (${status.contactCount})` : ""}
        </CheckItem>
        <CheckItem done={status.hasTimelineActivity}>
          Timeline activity recorded
          {status.activityCount > 0 ? ` (${status.activityCount})` : ""}
        </CheckItem>
      </ul>
      {allDone ? (
        <p className="mt-4 text-sm text-emerald-400/90">
          Platform 1.0 ready — CRM runs entirely on Postgres.
        </p>
      ) : (
        <p className="mt-4 text-sm text-slate-400">
          Complete the steps above to finish Platform 1.0 setup.
        </p>
      )}
    </div>
  );
}
