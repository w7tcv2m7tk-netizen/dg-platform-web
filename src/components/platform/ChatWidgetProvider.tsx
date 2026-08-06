"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { SupportChatWidget } from "@/components/support/SupportChatPanel";

type ChatWidgetContextValue = {
  openSupportChat: (draft?: string) => void;
};

const ChatWidgetContext = createContext<ChatWidgetContextValue | null>(null);

export function useChatWidget() {
  const ctx = useContext(ChatWidgetContext);
  if (!ctx) {
    throw new Error("useChatWidget must be used within ChatWidgetProvider");
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
  const [open, setOpen] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<string | undefined>();

  const openSupportChat = useCallback((draft?: string) => {
    if (draft?.trim()) setPendingDraft(draft.trim());
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openSupportChat }), [openSupportChat]);

  return (
    <ChatWidgetContext.Provider value={value}>
      {children}
      {showFloatingChat ? (
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
