import type { SupportChatMessage, SupportChatRole } from "./types";

type MessageRow = {
  id: number;
  senderRole: string;
  body: string;
  createdAt: Date;
  senderClerkUserId: string | null;
};

export function formatSupportMessage(
  row: MessageRow,
  clientName: string,
): SupportChatMessage {
  const role = row.senderRole as SupportChatRole;
  let sender = "Support";
  if (role === "client") {
    sender = clientName || "Client";
  } else if (role === "ai") {
    sender = "DigitalGate Assist";
  }

  return {
    id: row.id,
    role,
    sender,
    body: row.body,
    at: row.createdAt.toISOString(),
  };
}
