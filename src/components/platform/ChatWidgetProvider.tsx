"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import { SupportChatWidget } from "@/components/support/SupportChatPanel";

type ChatWidgetContextValue = {
  openSupportChat: (draft?: string) => void;
};

const ChatWidgetContext = createContext<ChatWidgetContextValue | null>(null);

function shouldShowFloatingChat(pathname: string | null, forced?: boolean) {
  if (forced === false) return false;
  if (!pathname) return true;
  return !(pathname.startsWith("/command") || pathname.startsWith("/support"));
}

export function useChatWidget() {
  const ctx = useContext(ChatWidgetContext);
  if (!ctx) {
    // Prefer a no-op over crashing Growth app surfaces if the shell provider is missing.
    return {
      openSupportChat: (_draft?: string) => {
        if (typeof window !== "undefined") {
          window.location.assign("/dashboard/advisor");
        }
      },
    };
  }
  return ctx;
}

export function ChatWidgetProvider({
  children,
  userName,
  showFloatingChat = true,
}: {
  children: ReactNode;
  userName?: string;
  showFloatingChat?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<string | undefined>();
  const floating = shouldShowFloatingChat(pathname, showFloatingChat);

  const openSupportChat = useCallback((draft?: string) => {
    if (draft?.trim()) setPendingDraft(draft.trim());
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openSupportChat }), [openSupportChat]);

  return (
    <ChatWidgetContext.Provider value={value}>
      {children}
      {floating ? (
        <SupportChatWidget
          userName={userName}
          open={open}
          onOpenChange={setOpen}
          initialDraft={pendingDraft}
          onDraftApplied={() => setPendingDraft(undefined)}
        />
      ) : null}
    </ChatWidgetContext.Provider>
  );
}
