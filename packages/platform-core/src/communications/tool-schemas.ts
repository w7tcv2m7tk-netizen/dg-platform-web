import type { AgentToolName } from "./providers/types";

export type ToolBodyProperty = {
  type: "string" | "number" | "boolean" | "object";
  description: string;
};

export type ToolBodySchema = {
  type: "object";
  description: string;
  properties: Record<string, ToolBodyProperty>;
  required?: string[];
};

export type AgentToolDefinition = {
  name: AgentToolName;
  description: string;
  requestBodySchema: ToolBodySchema;
};

const emptyObject = (description: string): ToolBodySchema => ({
  type: "object",
  description,
  properties: {},
});

/** Descriptions + JSON body schemas for ElevenLabs webhook tools. */
export const AGENT_TOOL_DEFINITIONS: Record<AgentToolName, AgentToolDefinition> = {
  get_business_profile: {
    name: "get_business_profile",
    description: "Fetch the organisation business profile used for accurate answers.",
    requestBodySchema: emptyObject("No parameters required."),
  },
  get_business_hours: {
    name: "get_business_hours",
    description: "Fetch business hours and timezone for the organisation.",
    requestBodySchema: emptyObject("No parameters required."),
  },
  search_contact: {
    name: "search_contact",
    description: "Search CRM contacts by name, phone, or email.",
    requestBodySchema: {
      type: "object",
      description: "Search fields — provide at least one.",
      properties: {
        query: { type: "string", description: "Free-text name or keyword" },
        phone: { type: "string", description: "Caller phone number" },
        email: { type: "string", description: "Caller email address" },
      },
    },
  },
  create_contact: {
    name: "create_contact",
    description: "Create a new CRM contact from the call.",
    requestBodySchema: {
      type: "object",
      description: "Contact fields collected on the call.",
      properties: {
        firstName: { type: "string", description: "Caller first name" },
        lastName: { type: "string", description: "Caller last name" },
        phone: { type: "string", description: "Caller phone" },
        email: { type: "string", description: "Caller email" },
        name: { type: "string", description: "Full name if first/last unknown" },
      },
      required: ["firstName"],
    },
  },
  update_contact: {
    name: "update_contact",
    description: "Update an existing CRM contact.",
    requestBodySchema: {
      type: "object",
      description: "Fields to update on an existing contact.",
      properties: {
        contactId: { type: "string", description: "DigitalGate contact id" },
        firstName: { type: "string", description: "Updated first name" },
        lastName: { type: "string", description: "Updated last name" },
        phone: { type: "string", description: "Updated phone" },
        email: { type: "string", description: "Updated email" },
      },
      required: ["contactId"],
    },
  },
  search_opportunity: {
    name: "search_opportunity",
    description: "Search open opportunities / deals in CRM.",
    requestBodySchema: {
      type: "object",
      description: "Optional title filter.",
      properties: {
        query: { type: "string", description: "Opportunity title keyword" },
      },
    },
  },
  create_opportunity: {
    name: "create_opportunity",
    description: "Create a CRM opportunity / qualified lead from the call.",
    requestBodySchema: {
      type: "object",
      description: "Opportunity details.",
      properties: {
        title: { type: "string", description: "Short opportunity title" },
        stage: { type: "string", description: "Pipeline stage, default new" },
        contactId: { type: "string", description: "Linked contact id if known" },
      },
      required: ["title"],
    },
  },
  update_opportunity: {
    name: "update_opportunity",
    description: "Update an opportunity (Phase 2 — may return not enabled).",
    requestBodySchema: {
      type: "object",
      description: "Opportunity update fields.",
      properties: {
        opportunityId: { type: "string", description: "Opportunity id" },
        title: { type: "string", description: "Updated title" },
        stage: { type: "string", description: "Updated stage" },
      },
      required: ["opportunityId"],
    },
  },
  create_task: {
    name: "create_task",
    description: "Create a follow-up task for the team.",
    requestBodySchema: {
      type: "object",
      description: "Task details.",
      properties: {
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Task notes" },
        entityType: { type: "string", description: "Optional related entity type" },
        entityId: { type: "string", description: "Optional related entity id" },
      },
      required: ["title"],
    },
  },
  get_available_appointments: {
    name: "get_available_appointments",
    description: "List available appointment slots (Phase 2).",
    requestBodySchema: emptyObject("No parameters required."),
  },
  book_appointment: {
    name: "book_appointment",
    description: "Book an appointment (Phase 2).",
    requestBodySchema: {
      type: "object",
      description: "Appointment details.",
      properties: {
        slotId: { type: "string", description: "Selected slot id" },
        contactId: { type: "string", description: "Contact to book for" },
      },
    },
  },
  send_sms: {
    name: "send_sms",
    description: "Send an SMS (requires SMS provider).",
    requestBodySchema: {
      type: "object",
      description: "SMS payload.",
      properties: {
        to: { type: "string", description: "Destination phone" },
        body: { type: "string", description: "Message body" },
      },
      required: ["to", "body"],
    },
  },
  send_email: {
    name: "send_email",
    description: "Send an email via the organisation email channel.",
    requestBodySchema: {
      type: "object",
      description: "Email payload.",
      properties: {
        to: { type: "string", description: "Destination email" },
        subject: { type: "string", description: "Subject line" },
        body: { type: "string", description: "Plain-text body" },
      },
      required: ["to", "subject", "body"],
    },
  },
  transfer_to_human: {
    name: "transfer_to_human",
    description: "Escalate / request human handoff for this call.",
    requestBodySchema: {
      type: "object",
      description: "Handoff reason.",
      properties: {
        reason: { type: "string", description: "Why transfer is needed" },
      },
    },
  },
};

export function getAgentToolDefinition(name: string): AgentToolDefinition | null {
  if (name in AGENT_TOOL_DEFINITIONS) {
    return AGENT_TOOL_DEFINITIONS[name as AgentToolName];
  }
  return null;
}
