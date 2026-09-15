"use client";

import { listTemplates } from "@dg/platform-core";
import { platformApps } from "@dg/platform-core/apps/registry";

import { useEnabledAppsOptional } from "@/components/platform/EnabledAppsProvider";

export function AppInstallToggle({
  appId,
  installed,
}: {
  appId: string;
  installed: boolean;
}) {
  const ctx = useEnabledAppsOptional();
  const registryApp = platformApps.get(appId);
  const isAvailable = Boolean(registryApp?.enabled);
  const isIndustryRuntime = listTemplates().some((template) => template.appId === appId);

  // Industry runtimes are shared implementation engines. Activating the runtime
  // directly loses the customer's exact business-type identity (for example,
  // every Services template shares appId "services"). Industry business types
  // are therefore managed only through the template activation API in Apps.
  if (isIndustryRuntime) {
    return (
      <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300">
        Manage business type
      </span>
    );
  }

  if (!isAvailable) {
    return (
      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-500">
        Not available
      </span>
    );
  }

  if (!ctx) {
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${
          installed ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-500"
        }`}
      >
        {installed ? "Installed" : "Off"}
      </span>
    );
  }

  const { toggleApp, syncing, syncingAppId, enabledIds } = ctx;
  const isOn = enabledIds.includes(appId);
  const thisSyncing = syncingAppId === appId;
  const busy = syncing || thisSyncing;

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => toggleApp(appId)}
      className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
        isOn
          ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25"
          : "bg-slate-800 text-slate-400 ring-1 ring-slate-700 hover:bg-slate-700"
      }`}
      title={isOn ? "Turn off — hides from sidebar" : "Turn on — shows in sidebar"}
      aria-busy={thisSyncing}
    >
      {thisSyncing ? "…" : isOn ? "On" : "Off"}
    </button>
  );
}