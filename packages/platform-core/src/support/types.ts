export type SupportChatRole = "client" | "staff" | "ai";

export type SupportChatMessage = {
  id: number;
  role: SupportChatRole;
  sender: string;
  body: string;
  at: string;
};

export type SupportConversationResult =
  | {
      ok: true;
      conversationId: string;
      messages: SupportChatMessage[];
    }
  | {
      ok: false;
      code: "not_linked" | "unavailable";
      message: string;
    };

export type SupportPostMessageResult =
  | { ok: true; messages: SupportChatMessage[] }
  | { ok: false; code: "validation_error" | "unavailable"; message: string };
