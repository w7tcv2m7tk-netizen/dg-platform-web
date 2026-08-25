/** Core Communications — Communication Record types. @see docs/foundations/COMMUNICATIONS.md */

export type CommunicationChannel = "email" | "sms" | "voice" | "whatsapp" | "chat";

export type CommunicationDirection = "outbound" | "inbound";

export type CommunicationSource =
  | "manual"
  | "automation"
  | "ai_assist"
  | "prospecting"
  | "agent"
  | "system";

export type CommunicationStatus =
  | "draft"
  | "scheduled"
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
