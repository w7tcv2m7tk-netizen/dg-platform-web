"use client";

import {
  appIdsFromPlanSelection,
  getCategorizedPlatformNavigation,
  getDefaultEnabledAppIds,
  getPartnerWorkspaceShellLinks,
  type PartnerType,
  type PlanSelectionInput,
} from "@dg/platform-core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "dg_enabled_apps";

type EnabledAppsContextValue = {
  enabledIds: string[];
  setEnabledIds: (ids: string[]) => void;
  toggleApp: (appId: string, enabled?: boolean) => Promise<void>;
  applyPlan: (plan: PlanSelectionInput) => Promise<void>;
  resetApps: () => Promise<void>;
  nav: ReturnType<typeof getCategorizedPlatformNavigation>;
  syncing: boolean;
};

const EnabledAppsContext = createContext<EnabledAppsContextValue | null>(null);

async function persistToggle(appId: string, enabled: boolean) {
  await fetch("/api/v1/org/apps", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "toggle", appId, enabled }),
  });
}

async function persistSet(enabled: string[]) {
  await fetch("/api/v1/org/apps", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "set", enabled }),
  });
}

async function persistPlan(plan: PlanSelectionInput) {
  await fetch("/api/v1/org/apps", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "apply_plan", plan }),
  });
}

async function persistReset() {
  await fetch("/api/v1/org/apps", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "reset" }),
  });
}

export function EnabledAppsProvider({
  initialEnabledIds,
  showCommandCentre = false,
  showPartnerPortal = false,
  showResellerAdmin = false,
  partnerType = null,
  children,
}: {
  initialEnabledIds: string[];
  showCommandCentre?: boolean;
  showPartnerPortal?: boolean;
  showResellerAdmin?: boolean;
  partnerType?: PartnerType | null;
  children: React.ReactNode;
}) {
  const [enabledIds, setEnabledIdsState] = useState(initialEnabledIds);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setEnabledIdsState(initialEnabledIds);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialEnabledIds));
    } catch {
      /* ignore */
    }
  }, [initialEnabledIds]);

  const setEnabledIds = useCallback((ids: string[]) => {
    setEnabledIdsState(ids);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent("dg-enabled-apps-changed", { detail: ids }));
  }, []);

  const toggleApp = useCallback(
    async (appId: string, enabled?: boolean) => {
      setSyncing(true);
      const next = new Set(enabledIds);
      const turnOn = enabled ?? !next.has(appId);
      if (turnOn) next.add(appId);
      else next.delete(appId);
      const ids = [...next];
      setEnabledIds(ids);
      try {
        await persistToggle(appId, turnOn);
      } catch {
        /* keep local state for preview */
      }
      setSyncing(false);
    },
    [enabledIds, setEnabledIds],
  );

  const applyPlan = useCallback(
    async (plan: PlanSelectionInput) => {
      setSyncing(true);
      const ids = appIdsFromPlanSelection(plan);
      setEnabledIds(ids);
      try {
        await persistPlan(plan);
      } catch {
        /* preview still works locally */
      }
      setSyncing(false);
    },
    [setEnabledIds],
  );

  const resetApps = useCallback(async () => {
    setSyncing(true);
    const ids = getDefaultEnabledAppIds();
    setEnabledIds(ids);
    try {
      await persistReset();
    } catch {
      /* ignore */
    }
    setSyncing(false);
  }, [setEnabledIds]);

  const nav = useMemo(
    () =>
      getCategorizedPlatformNavigation(enabledIds, {
        showCommandCentre,
        showPartnerPortal,
        showResellerAdmin,
        partnerType,
      }),
    [enabledIds, showCommandCentre, showPartnerPortal, showResellerAdmin, partnerType],
  );

  const value = useMemo(
    () => ({
      enabledIds,
      setEnabledIds,
      toggleApp,
      applyPlan,
      resetApps,
      nav,
      syncing,
    }),
    [enabledIds, setEnabledIds, toggleApp, applyPlan, resetApps, nav, syncing],
  );

  return (
    <EnabledAppsContext.Provider value={value}>{children}</EnabledAppsContext.Provider>
  );
}

export function useEnabledApps() {
  const ctx = useContext(EnabledAppsContext);
  if (!ctx) {
    throw new Error("useEnabledApps must be used within EnabledAppsProvider");
  }
  return ctx;
}

/** Optional hook for components outside provider (falls back to defaults). */
export function useEnabledAppsOptional() {
  return useContext(EnabledAppsContext);
}
