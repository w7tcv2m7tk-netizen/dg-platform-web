import { EnabledAppsProvider } from "@/components/platform/EnabledAppsProvider";
import { ChatWidgetProvider } from "@/components/platform/ChatWidgetProvider";
import { Sidebar } from "@/components/Sidebar";

export function PlatformShell({
  children,
  showFloatingChat = true,
  enabledIds,
  userName,
}: {
  children: React.ReactNode;
  showFloatingChat?: boolean;
  enabledIds: string[];
  userName?: string;
}) {
  return (
    <EnabledAppsProvider initialEnabledIds={enabledIds}>
      <ChatWidgetProvider userName={userName} showFloatingChat={showFloatingChat}>
        <div className="flex min-h-full">
          <Sidebar />
          <div className="flex flex-1 flex-col">{children}</div>
        </div>
      </ChatWidgetProvider>
    </EnabledAppsProvider>
  );
}
