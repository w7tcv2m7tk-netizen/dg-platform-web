import Link from "next/link";
import { getAppSetupHref, listOrganisationActivities } from "@dg/platform-core";

import { ResolutionAction } from "@/components/ui/ResolutionAction";
import { getPlatformPageContext } from "@/lib/org-apps";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
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
        <Link href="/apps/automation" className="text-sm text-blue-400 hover:underline">
          ← Automation
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Automation run history</h1>
          <Link
            href={getAppSetupHref("automation")}
            className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-0.5 text-xs font-medium text-blue-300 hover:bg-blue-500/15"
          >
            Setup guide
          </Link>
        </div>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · recent automated activity
        </p>
      </header>
      <main className="dg-page-main">
        <div className="dg-card">
          <h2 className="font-semibold text-white">Recent runs</h2>
          <p className="mt-1 text-sm text-slate-400">
            Activity appears here when a supported automation runs for your organisation.
          </p>
          {!session ? (
            <p className="mt-4 text-sm text-slate-500">Sign in to view automation activity.</p>
          ) : !items.length ? (
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-4">
              <p className="font-medium text-amber-100">No automation activity yet</p>
              <p className="mt-1 text-sm text-slate-400">
                Set up or review your automation rules so DigitalGate has a supported workflow to run.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <ResolutionAction
                  href="/apps/automation/rules"
                  mode="guided"
                  label="Review automation rules"
                />
                <ResolutionAction
                  href={getAppSetupHref("automation")}
                  mode="guided"
                  label="Open setup guide"
                />
                <ResolutionAction
                  href="/dashboard/advisor"
                  mode="guided"
                  label="Help me automate this"
                />
              </div>
            </div>
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
