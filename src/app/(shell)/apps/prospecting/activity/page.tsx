import { ProspectingSubnav } from "@/components/prospecting/ProspectingSubnav";
import { redirectStaffProspectingIfNeeded } from "@/lib/prospecting-command-redirect";

export default async function ProspectingActivityPage() {
  await redirectStaffProspectingIfNeeded("/apps/prospecting/activity");
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Activity</h1>
        <p className="text-sm text-slate-400">
          Calls, notes, tasks and follow-ups against each prospect.
        </p>
        <ProspectingSubnav active="/apps/prospecting/activity" />
      </header>
      <main className="dg-page-main">
        <div className="dg-card space-y-3">
          <p className="text-sm text-slate-300">
            Activity stays attached to the prospect and carries into CRM when you convert — so
            follow-up history is never trapped in a separate tool.
          </p>
        </div>
      </main>
    </>
  );
}
