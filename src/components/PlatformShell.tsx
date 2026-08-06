import { EnabledAppsProvider } from "@/components/platform/EnabledAppsProvider";
import { ChatWidgetProvider } from "@/components/platform/ChatWidgetProvider";
import { AppShellLayout } from "@/components/AppShellLayout";

export function PlatformShell({
  children,
  showFloatingChat = true,
  enabledIds,
  userName,
  showCommandCentre = false,
}: {
  children: React.ReactNode;
  showFloatingChat?: boolean;
  enabledIds: string[];
  userName?: string;
  showCommandCentre?: boolean;
}) {
  return (
    <EnabledAppsProvider
      initialEnabledIds={enabledIds}
      showCommandCentre={showCommandCentre}
    >
      <ChatWidgetProvider userName={userName} showFloatingChat={showFloatingChat}>
        <AppShellLayout>{children}</AppShellLayout>
      </ChatWidgetProvider>
    </EnabledAppsProvider>
  );
}
