import type { AppNavItem, AppTier, AppVisibility, RegisteredApp } from "./manifest";
import { commandCentreApp } from "./builtins/command-centre";
import { commerceApp } from "./builtins/commerce";
import { crmApp } from "./builtins/crm";
import { aiCommunicationsApp } from "./builtins/ai-communications";
import { infrastructureApp } from "./builtins/infrastructure";
import { realEstateApp } from "./builtins/real-estate";
import { accommodationApp } from "./builtins/accommodation";
import { financeApp } from "./builtins/finance";
import { servicesApp } from "./builtins/services";
import { creatorApp } from "./builtins/creator";
import { commercialApp } from "./builtins/commercial";
import { seoApp, aiVisibilityApp } from "./builtins/seo";
import { websitesApp } from "./builtins/websites";

function appVisibility(manifest: RegisteredApp["manifest"]): AppVisibility {
  return manifest.visibility ?? "customer";
}

/** Built-in app manifests shipped with the platform */
const BUILTIN_APPS: RegisteredApp[] = [
  { manifest: crmApp, enabled: true },
  { manifest: commerceApp, enabled: true },
  { manifest: realEstateApp, enabled: true },
  { manifest: accommodationApp, enabled: false },
  { manifest: financeApp, enabled: false },
  { manifest: servicesApp, enabled: false },
  { manifest: creatorApp, enabled: false },
  { manifest: commercialApp, enabled: false },
  { manifest: seoApp, enabled: false },
  { manifest: aiVisibilityApp, enabled: false },
  { manifest: aiCommunicationsApp, enabled: false },
  { manifest: websitesApp, enabled: true },
  { manifest: infrastructureApp, enabled: false },
  { manifest: commandCentreApp, enabled: true },
];

export class AppRegistry {
  private apps = new Map<string, RegisteredApp>();

  constructor(apps: RegisteredApp[] = BUILTIN_APPS) {
    for (const app of apps) {
      this.apps.set(app.manifest.id, app);
    }
  }

  register(app: RegisteredApp) {
    this.apps.set(app.manifest.id, app);
  }

  get(id: string): RegisteredApp | undefined {
    return this.apps.get(id);
  }

  list(): RegisteredApp[] {
    return [...this.apps.values()];
  }

  listByTier(tier: AppTier): RegisteredApp[] {
    return this.list().filter((a) => a.manifest.tier === tier);
  }

  enabledApps(): RegisteredApp[] {
    return this.list().filter((a) => a.enabled);
  }

  customerApps(): RegisteredApp[] {
    return this.enabledApps().filter((a) => appVisibility(a.manifest) === "customer");
  }

  internalApps(): RegisteredApp[] {
    return this.enabledApps().filter((a) => appVisibility(a.manifest) === "internal");
  }

  /** Navigation items from enabled customer apps (tenant dashboard shell) */
  navigation(): AppNavItem[] {
    return this.customerApps().flatMap((a) => a.manifest.navigation);
  }

  /** Navigation for DigitalGate staff (Command Centre shell) */
  commandCentreNavigation(): AppNavItem[] {
    return this.internalApps().flatMap((a) => a.manifest.navigation);
  }
}

/** Singleton registry for the running platform */
export const platformApps = new AppRegistry();

/** Platform shell links + enabled app navigation */
export function getPlatformNavigation(): AppNavItem[] {
  const shell: AppNavItem[] = [
    { href: "/dashboard", label: "Overview", icon: "◉" },
    { href: "/dashboard/apps", label: "Apps", icon: "▦" },
    { href: "/onboarding", label: "Onboarding", icon: "◎" },
    { href: "/signup", label: "Plan & apps", icon: "▣" },
  ];

  const appNav = platformApps.navigation();
  return [...shell, ...appNav];
}

export function getAppsByTier() {
  return {
    core: platformApps.listByTier("core"),
    business: platformApps.listByTier("business"),
    growth: platformApps.listByTier("growth"),
    internal: platformApps.listByTier("internal"),
  };
}
