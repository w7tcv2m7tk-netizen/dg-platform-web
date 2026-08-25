/** Provider-agnostic AI Communications types. */

export const COMMUNICATION_PROVIDERS = [
  "elevenlabs",
  "openai_voice",
  "anthropic",
  "twilio",
  "telnyx",
  "resend",
  "stub",
] as const;
export type CommunicationProviderId = (typeof COMMUNICATION_PROVIDERS)[number];

/** Voice providers that can drive Conversational Agents (Live + Direction). */
export const VOICE_PROVIDER_OPTIONS = [
  {
    id: "elevenlabs" as const,
    label: "ElevenLabs",
    status: "live" as const,
    description: "Initial Voice Provider — ConvAI / ElevenAgents (premium naturalness).",
  },
  {
    id: "openai_voice" as const,
    label: "OpenAI Realtime",
    status: "direction" as const,
    description: "Direction — realtime voice with reasoning; adapter not Live yet.",
  },
] as const;

export type VoiceProviderId = (typeof VOICE_PROVIDER_OPTIONS)[number]["id"];

export const AGENT_TYPES = [
  "receptionist",
  "sales",
  "support",
  "booking",
  "qualification",
  "follow_up",
  "custom",
] as const;
export type CommunicationAgentType = (typeof AGENT_TYPES)[number] | (string & {});

export const AGENT_STATUSES = ["draft", "published", "disabled"] as const;
export type CommunicationAgentStatus = (typeof AGENT_STATUSES)[number];

export const COMMUNICATION_CHANNELS = ["voice", "sms", "email", "chat", "whatsapp"] as const;
export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];

export const COMMUNICATION_DIRECTIONS = ["inbound", "outbound"] as const;
export type CommunicationDirection = (typeof COMMUNICATION_DIRECTIONS)[number];

export const SESSION_STATUSES = [
  "ringing",
  "in_progress",
  "completed",
  "missed",
  "failed",
  "transferred",
] as const;
export type CommunicationSessionStatus = (typeof SESSION_STATUSES)[number];

export const SESSION_OUTCOMES = [
  "information_request",
  "lead",
  "appointment_booked",
  "follow_up_required",
  "transferred",
  "not_interested",
  "existing_customer",
  "support_issue",
  "unknown",
] as const;
export type CommunicationOutcome = (typeof SESSION_OUTCOMES)[number];

export const AGENT_TOOLS = [
  "get_business_profile",
  "get_business_hours",
  "search_contact",
  "create_contact",
  "update_contact",
  "search_opportunity",
  "create_opportunity",
  "update_opportunity",
  "create_task",
  "get_available_appointments",
  "book_appointment",
  "send_sms",
  "send_email",
  "transfer_to_human",
] as const;
export type AgentToolName = (typeof AGENT_TOOLS)[number];

export type CommunicationBusinessHours = {
  timezone?: string;
  days?: Array<{
    day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
    open: string;
    close: string;
  }>;
};

export type AgentBuilderConfig = {
  personality?: string;
  tone?: string;
  /** Display role, e.g. AI Business Receptionist */
  roleTitle?: string;
  primaryObjective?: string;
  secondaryObjectives?: string[];
  successCriteria?: string;
  qualificationQuestions?: string[];
  mayProvide?: string[];
  mustNotProvide?: string[];
  enabledTools?: AgentToolName[];
  knowledgeSourceIds?: string[];
  recordingConsent?: boolean;
  disclosure?: string;
  /** Out-of-hours behaviour mode (UI + prompt). */
  outOfHoursMode?: "take_message" | "inform_and_follow_up" | "transfer_on_call";
  outOfHoursMessage?: string;
  fallback?: "transfer" | "voicemail" | "message";
  /** Spoken line before transfer / task handoff */
  humanFallbackMessage?: string;
};

export type SerializedCommunicationAgent = {
  id: string;
  organisationId: string;
  name: string;
  description: string | null;
  type: string;
  status: CommunicationAgentStatus;
  provider: string;
  providerAgentId: string | null;
  voiceId: string | null;
  model: string | null;
  systemPrompt: string | null;
  greeting: string | null;
  language: string;
  timezone: string;
  businessHours: CommunicationBusinessHours | null;
  enabledChannels: string[];
  knowledgeBaseId: string | null;
  routingRules: Record<string, unknown> | null;
  transferRules: Record<string, unknown> | null;
  escalationRules: Record<string, unknown> | null;
  config: AgentBuilderConfig;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SerializedCommunicationSession = {
  id: string;
  organisationId: string;
  agentId: string | null;
  agentName: string | null;
  contactId: string | null;
  companyId: string | null;
  opportunityId: string | null;
  channel: string;
  direction: string;
  provider: string;
  providerSessionId: string | null;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  transcript: string | null;
  summary: string | null;
  sentiment: string | null;
  outcome: string | null;
  recordingUrl: string | null;
  costCents: number | null;
  callerPhone: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type SerializedCommunicationMessage = {
  id: string;
  sessionId: string;
  sender: string;
  recipient: string | null;
  direction: string;
  channel: string;
  content: string;
  timestamp: string;
  status: string;
};

export type SerializedAgentAction = {
  id: string;
  sessionId: string | null;
  agentId: string | null;
  tool: string;
  status: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  entityType: string | null;
  entityId: string | null;
  error: string | null;
  createdAt: string;
};

export type VoiceOption = {
  id: string;
  name: string;
  previewUrl?: string | null;
  labels?: Record<string, string>;
};

export type ProviderAgentRef = { provider: string; providerAgentId: string };
export type ProviderSessionRef = { provider: string; providerSessionId: string };

export type UpsertAgentInput = {
  name: string;
  description?: string | null;
  greeting?: string | null;
  systemPrompt: string;
  language?: string;
  voiceId?: string | null;
  model?: string | null;
  timezone?: string;
  tools?: Array<{
    name: string;
    description: string;
    url: string;
    method?: "POST" | "GET";
    requestBodySchema?: {
      type: "object";
      description: string;
      properties: Record<string, { type: string; description: string }>;
      required?: string[];
    };
  }>;
};

export type ProviderConversation = {
  providerSessionId: string;
  agentProviderId?: string | null;
  status?: string;
  startedAt?: Date | null;
  endedAt?: Date | null;
  durationSeconds?: number | null;
  transcript?: string | null;
  summary?: string | null;
  recordingUrl?: string | null;
  callerPhone?: string | null;
  messages?: Array<{
    role: string;
    content: string;
    timestamp?: Date;
  }>;
  usage?: { units?: number; costCents?: number };
  raw?: unknown;
};

export interface CommunicationProvider {
  readonly id: CommunicationProviderId;
  createAgent(config: UpsertAgentInput): Promise<ProviderAgentRef>;
  updateAgent(ref: ProviderAgentRef, config: UpsertAgentInput): Promise<ProviderAgentRef>;
  deleteAgent(ref: ProviderAgentRef): Promise<void>;
  getAgent(ref: ProviderAgentRef): Promise<Record<string, unknown> | null>;
  listAgents(): Promise<Array<{ id: string; name: string }>>;
  listVoices(): Promise<VoiceOption[]>;
  getConversation(ref: ProviderSessionRef): Promise<ProviderConversation | null>;
  listConversations(opts?: { agentProviderId?: string; limit?: number }): Promise<ProviderConversation[]>;
  getUsage(): Promise<{ connected: boolean; raw?: unknown }>;
}
