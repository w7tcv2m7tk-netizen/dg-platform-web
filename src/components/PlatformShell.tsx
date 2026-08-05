import { EnabledAppsProvider } from "@/components/platform/EnabledAppsProvider";
import { Sidebar } from "@/components/Sidebar";
import { getOrgEnabledAppIds } from "@/lib/org-apps";

export async function PlatformShell({ children }: { children: React.ReactNode }) {
  const enabledIds = await getOrgEnabledAppIds();

  return (
    <EnabledAppsProvider initialEnabledIds={enabledIds}>
      <div className="flex min-h-full">
        <Sidebar />
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </EnabledAppsProvider>
  );
}
