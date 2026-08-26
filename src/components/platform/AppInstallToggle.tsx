"use client";

import { useEnabledAppsOptional } from "@/components/platform/EnabledAppsProvider";

export function AppInstallToggle({
  appId,
  installed,
}: {
  appId: string;
  installed: boolean;
}) {
  const ctx = useEnabledAppsOptional();

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
