import Link from "next/link";
import { getAppSetupHref, listOrganisationActivities } from "@dg/platform-core";

import { AutomationSubnav } from "@/components/automation/AutomationSubnav";
import { getPlatformPageContext } from "@/lib/org-apps";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AutomationLogsPage() {
  const { session } = await getPlatformPageContext();

  let items: Awaited<
    ReturnType<typeof listOrganisationActivities>
  >["items"] = [];

  if (session) {
    const result = await listOrganisationActivities({
      organisationId: session.organisationId,
      sourceApp: "automation",
      limit: 50,
    });
    items = result.items;
  }

  return (
    <>
      <header className="dg-page-header">
        <Link href="/dashboard" className="text-sm text-blue-400 hover:underline">
          ← Overview
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Automation run log</h1>
          <Link
            href={getAppSetupHref("automation")}
            className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-0.5 text-xs font-medium text-blue-300 hover:bg-blue-500/15"
          >
            Setup guide
          </Link>
        </div>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · execution history when rules fire
        </p>
        <AutomationSubnav active="/apps/automation/logs" />
      </header>
      <main className="dg-page-main">
        <div className="dg-card">
          <h2 className="font-semibold text-white">Recent runs</h2>
          <p className="mt-1 text-sm text-slate-400">
            Logs appear when automations fire — e.g. commerce payment completed, quote accepted, or
            invoice overdue events.
          </p>
          {!session ? (
            <p className="mt-4 text-sm text-slate-500">Sign in to view automation logs.</p>
          ) : !items.length ? (
            <p className="mt-4 text-sm text-slate-500">
              No automation activity yet. When a registered rule runs, an entry will appear here.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium text-white">{item.title}</p>
                    <time className="text-xs text-slate-500">{formatDate(item.createdAt)}</time>
                  </div>
                  {item.body ? <p className="mt-1 text-slate-400">{item.body}</p> : null}
                  <p className="mt-1 font-mono text-xs text-slate-600">{item.activityType}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
