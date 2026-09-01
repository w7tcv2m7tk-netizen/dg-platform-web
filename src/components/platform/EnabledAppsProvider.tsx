"use client";

import {
  appIdsFromPlanSelection,
  buildAccessContext,
  filterNavigationByAccess,
  getCategorizedPlatformNavigation,
  getDefaultEnabledAppIds,
  getPartnerWorkspaceShellLinks,
  type PartnerType,
  type PlanSelectionInput,
} from "@dg/platform-core";
import { useRouter } from "next/navigation";
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
  /** True while any persist is in flight (plan apply / reset). */
  syncing: boolean;
  /** App id currently being toggled — other toggles stay interactive. */
  syncingAppId: string | null;
  lastError: string | null;
  clearError: () => void;
};

const EnabledAppsContext = createContext<EnabledAppsContextValue | null>(null);

async function persistOrgApps(body: Record<string, unknown>) {
  const res = await fetch("/api/v1/org/apps", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    const message =
      json?.error?.message ?? `Failed to save app settings (${res.status})`;
    throw new Error(message);
  }
  return res.json();
}

export function EnabledAppsProvider({
  initialEnabledIds,
  industrySelectionIds = [],
  showCommandCentre = false,
  isPlatformOperator = false,
  showPartnerPortal = false,
  showResellerAdmin = false,
  partnerType = null,
  membershipRole = "member",
  organisationId,
  permissionGrants,
  children,
}: {
  initialEnabledIds: string[];
  industrySelectionIds?: string[];
  showCommandCentre?: boolean;
  isPlatformOperator?: boolean;
  showPartnerPortal?: boolean;
  showResellerAdmin?: boolean;
  partnerType?: PartnerType | null;
  membershipRole?: string;
  /** Active tenant id — used for platform-authority aware nav filtering. */
  organisationId?: string;
  permissionGrants?: unknown;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [enabledIds, setEnabledIdsState] = useState(initialEnabledIds);
  const [syncing, setSyncing] = useState(false);
  const [syncingAppId, setSyncingAppId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

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

  const clearError = useCallback(() => setLastError(null), []);

  const toggleApp = useCallback(
    async (appId: string, enabled?: boolean) => {
      setSyncingAppId(appId);
      setLastError(null);
      const previous = enabledIds;
      const next = new Set(enabledIds);
      const turnOn = enabled ?? !next.has(appId);
      if (turnOn) next.add(appId);
      else next.delete(appId);
      const ids = [...next];
      setEnabledIds(ids);
      try {
        await persistOrgApps({ action: "toggle", appId, enabled: turnOn });
        router.refresh();
      } catch (err) {
        setEnabledIds(previous);
        setLastError(err instanceof Error ? err.message : "Failed to update app");
      }
      setSyncingAppId(null);
    },
    [enabledIds, router, setEnabledIds],
  );

  const applyPlan = useCallback(
    async (plan: PlanSelectionInput) => {
      setSyncing(true);
      setLastError(null);
      const previous = enabledIds;
      const ids = appIdsFromPlanSelection(plan);
      setEnabledIds(ids);
      try {
        await persistOrgApps({ action: "apply_plan", plan });
        router.refresh();
      } catch (err) {
        setEnabledIds(previous);
        setLastError(err instanceof Error ? err.message : "Failed to apply plan");
      }
      setSyncing(false);
    },
    [enabledIds, router, setEnabledIds],
  );

  const resetApps = useCallback(async () => {
    setSyncing(true);
    setLastError(null);
    const previous = enabledIds;
    const ids = getDefaultEnabledAppIds();
    setEnabledIds(ids);
    try {
      await persistOrgApps({ action: "reset" });
      router.refresh();
    } catch (err) {
      setEnabledIds(previous);
      setLastError(err instanceof Error ? err.message : "Failed to reset apps");
    }
    setSyncing(false);
  }, [enabledIds, router, setEnabledIds]);

  const nav = useMemo(() => {
    const base = getCategorizedPlatformNavigation(enabledIds, {
      showCommandCentre,
      showPartnerPortal,
      showResellerAdmin,
      partnerType,
      industrySelectionIds,
    });
    const ctx = buildAccessContext({
      role: membershipRole,
      organisationId,
      isPlatformOperator,
      enabledAppIds: enabledIds,
      grants: permissionGrants,
    });
    return filterNavigationByAccess(base, ctx);
  }, [
    enabledIds,
    industrySelectionIds,
    showCommandCentre,
    showPartnerPortal,
    showResellerAdmin,
    partnerType,
    membershipRole,
    organisationId,
    isPlatformOperator,
    permissionGrants,
  ]);

  const value = useMemo(
    () => ({
      enabledIds,
      setEnabledIds,
      toggleApp,
      applyPlan,
      resetApps,
      nav,
      syncing,
      syncingAppId,
      lastError,
      clearError,
    }),
    [
      enabledIds,
      setEnabledIds,
      toggleApp,
      applyPlan,
      resetApps,
      nav,
      syncing,
      syncingAppId,
      lastError,
      clearError,
    ],
  );

  return (
    <EnabledAppsContext.Provider value={value}>{children}</EnabledAppsContext.Provider>
  );
}

export function useEnabledApps() {
  const ctx = useContext(EnabledAppsContext);
  if (!ctx) throw new Error("useEnabledApps must be used within EnabledAppsProvider");
  return ctx;
}

export function useEnabledAppsOptional() {
  return useContext(EnabledAppsContext);
}

/** Partner shell links helper kept for callers */
export function usePartnerShellLinks(partnerType?: PartnerType | null) {
  return getPartnerWorkspaceShellLinks(partnerType);
}
