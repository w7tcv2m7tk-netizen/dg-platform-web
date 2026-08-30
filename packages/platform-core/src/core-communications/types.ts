/** Core Communications — Communication Record types. @see docs/foundations/COMMUNICATIONS.md */

export type CommunicationChannel = "email" | "sms" | "voice" | "whatsapp" | "chat";

export type CommunicationDirection = "outbound" | "inbound";

export type CommunicationSource =
  | "manual"
  | "automation"
  | "ai_assist"
  | "prospecting"
  | "agent"
  | "system"
  | "mailbox";

export type CommunicationStatus =
  | "draft"
  | "scheduled"
  /** Transient claim held by the scheduled-send cron while delivery is in flight. */
  | "sending"
  | "sent"
  | "delivered"
  | "bounced"
  | "opened"
  | "replied"
  | "failed";

export type PlatformCommunication = {
  id: string;
  organisationId: string;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  source: CommunicationSource;
  status: CommunicationStatus;
  subject?: string;
  bodyPreview?: string;
  /** Full HTML body — returned on get / thread loads when stored. */
  bodyHtml?: string;
  fromAddress?: string;
  toAddresses: string[];
  ccAddresses: string[];
  contactId?: string;
  companyId?: string;
  opportunityId?: string;
  taskId?: string;
  threadKey?: string;
  provider: string;
  externalId?: string;
  whySent?: string;
  triggerRule?: string;
  approvedBy?: string;
  sentBy?: string;
  aiGenerated: boolean;
  sentAt?: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
};

/** Grouped conversation for Inbox list (Phase 1). */
export type ConversationSummary = {
  /** Stable key: threadKey, or contact:{id}, or message:{id} */
  key: string;
  subject: string;
  preview: string;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  source: CommunicationSource;
  status: CommunicationStatus;
  /** Operator-facing status label */
  statusLabel: string;
  contactId?: string;
  companyId?: string;
  opportunityId?: string;
  contactName?: string;
  companyName?: string;
  fromAddress?: string;
  toAddresses: string[];
  latestAt: string;
  messageCount: number;
  /** Inbound and not replied — Phase 1 needs-reply heuristic */
  needsReply: boolean;
  aiGenerated: boolean;
  latestMessageId: string;
};

export type InboxFolderId =
  | "all"
  | "needs_reply"
  | "email"
  | "manual"
  | "automated"
  | "ai"
  | "mailbox";
