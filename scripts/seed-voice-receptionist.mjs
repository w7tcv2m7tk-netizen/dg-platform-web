/**
 * Create (and optionally publish) the Inbound Receptionist for DigitalGate.
 *
 * Spec: docs/ai/VOICE-AGENT-ARCHITECTURE.md
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-voice-receptionist.mjs
 *   node --env-file=.env.local scripts/seed-voice-receptionist.mjs --publish
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });

const publish = process.argv.includes("--publish");
const prisma = new PrismaClient();
const BASE = "https://api.elevenlabs.io";

const RECEPTIONIST = {
  name: "DigitalGate Receptionist",
  description:
    "An intelligent inbound receptionist that answers calls on behalf of the business, understands why the caller is calling, collects relevant information, assists where appropriate, and ensures every meaningful enquiry is captured in DigitalGate.",
  type: "receptionist",
  greeting:
    "Thanks for calling {{business_name}}, you’re speaking with {{agent_name}}. How can I help you today?",
  language: "en-AU",
  timezone: "Australia/Brisbane",
  systemPrompt: `You are an AI member of the business team. Your job is not simply to answer the phone; your job is to understand the caller and help the business take the appropriate next action.

Have a natural conversation. Do not interrogate callers with a checklist. Ask questions conversationally and only when relevant.

Use DigitalGate tools whenever information needs to be retrieved or an action needs to be recorded.

Always search for an existing Contact before creating a new Contact.
Never create duplicate Contacts when an existing Contact can be confidently identified.
When a genuine sales or service enquiry is identified, search for an existing Opportunity before creating a new one.

Important information gathered during the call should be recorded against the appropriate DigitalGate records.
Meaningful enquiries should always result in a clear next action.

Never invent information. If you don’t know, say so and offer an appropriate alternative.

Escalate to a human whenever the caller requests a person, the matter is sensitive or complex, or you cannot confidently resolve the enquiry.

Protect customer privacy and follow all business-specific compliance requirements.
Prefer short spoken sentences suitable for a phone call.
The caller should feel that they are speaking with a competent member of the business team.

ElevenLabs provides the voice conversation. DigitalGate is the system of record — never claim you wrote to a database yourself; use tools.`,
  enabledTools: [
    "get_business_profile",
    "get_business_hours",
    "search_contact",
    "search_opportunity",
    "create_contact",
    "update_contact",
    "create_opportunity",
    "create_task",
    "send_sms",
    "send_email",
    "transfer_to_human",
  ],
  config: {
    roleTitle: "AI Business Receptionist",
    personality:
      "Professional, warm, helpful, confident and conversational. Sounds like a capable member of the business team rather than a robotic phone system.",
    tone: "Natural, concise and friendly",
    primaryObjective:
      "Understand the reason for the call and ensure the enquiry is properly captured and routed.",
    secondaryObjectives: [
      "Identify the caller",
      "Search for an existing Contact before creating a new one",
      "Collect relevant qualification information",
      "Create or update the appropriate Opportunity",
      "Create a follow-up Task where required",
      "Provide approved business information",
      "Send an SMS or email when appropriate",
      "Transfer to a human when the matter requires human assistance",
      "Never leave a meaningful enquiry without a recorded next action",
    ],
    successCriteria:
      "Caller receives a helpful response; intent understood; Contact identified or created; Opportunity created or updated where appropriate; qualification captured; follow-up recorded; escalate when necessary.",
    qualificationQuestions: [
      "What can we help you with today?",
      "Have you contacted us about this before?",
      "Can I get your name?",
      "What’s the best phone number and email address to reach you on?",
      "Is there anything specific you’d like us to know?",
      "How soon are you looking to proceed?",
      "Is there anything else you’d like us to help with?",
    ],
    mayProvide: [
      "Business name",
      "Services and products (from authorised Business Brain / profile)",
      "Business hours",
      "Location and public contact information",
      "Website information",
      "General service descriptions",
      "Approved pricing information",
      "Appointment availability where integrated",
      "Approved FAQs and authorised Knowledge Base content",
    ],
    mustNotProvide: [
      "Unverified information",
      "Confidential business information",
      "Private customer information",
      "Information belonging to another Contact or Opportunity",
      "Legal advice",
      "Financial advice unless specifically authorised and configured",
      "Medical advice",
      "Guarantees or promises that cannot be fulfilled",
      "Internal system information",
      "AI or system configuration details",
      "Anything without reliable information to answer",
    ],
    enabledTools: [
      "get_business_profile",
      "get_business_hours",
      "search_contact",
      "search_opportunity",
      "create_contact",
      "update_contact",
      "create_opportunity",
      "create_task",
      "send_sms",
      "send_email",
      "transfer_to_human",
    ],
    recordingConsent: true,
    disclosure:
      "Just letting you know, this call may be recorded to help us improve our service.",
    outOfHoursMode: "take_message",
    outOfHoursMessage:
      "Take a message, capture contact details, create a follow-up Task, and offer a callback.",
    fallback: "transfer",
    humanFallbackMessage:
      "I want to make sure you get the right help with this. I’ll pass this through to someone from the team.",
  },
};

const TOOL_META = {
  get_business_profile: {
    description: "Fetch the organisation business profile used for accurate answers.",
    properties: {},
  },
  get_business_hours: {
    description: "Fetch business hours and timezone for the organisation.",
    properties: {},
  },
  search_contact: {
    description: "Search CRM contacts by name, phone, or email. Always search before creating.",
    properties: {
      query: { type: "string", description: "Free-text name or keyword" },
      phone: { type: "string", description: "Caller phone number" },
      email: { type: "string", description: "Caller email address" },
    },
  },
  search_opportunity: {
    description: "Search existing opportunities before creating a duplicate.",
    properties: {
      query: { type: "string", description: "Title or keyword" },
      contactId: { type: "string", description: "Linked contact id if known" },
    },
  },
  create_contact: {
    description: "Create a new CRM contact from the call (only after search finds none).",
    properties: {
      firstName: { type: "string", description: "Caller first name" },
      lastName: { type: "string", description: "Caller last name" },
      phone: { type: "string", description: "Caller phone" },
      email: { type: "string", description: "Caller email" },
      name: { type: "string", description: "Full name if first/last unknown" },
    },
    required: ["firstName"],
  },
  update_contact: {
    description: "Update an existing CRM contact with details gathered on the call.",
    properties: {
      contactId: { type: "string", description: "Contact id" },
      phone: { type: "string" },
      email: { type: "string" },
      notes: { type: "string" },
    },
    required: ["contactId"],
  },
  create_opportunity: {
    description: "Create a CRM opportunity / qualified lead from the call.",
    properties: {
      title: { type: "string", description: "Short opportunity title" },
      stage: { type: "string", description: "Pipeline stage, default new" },
      contactId: { type: "string", description: "Linked contact id if known" },
    },
    required: ["title"],
  },
  create_task: {
    description: "Create a follow-up task for the team.",
    properties: {
      title: { type: "string", description: "Task title" },
      description: { type: "string", description: "Task notes" },
    },
    required: ["title"],
  },
  send_sms: {
    description: "Send an SMS via DigitalGate (when configured).",
    properties: {
      to: { type: "string", description: "Phone number" },
      body: { type: "string", description: "Message body" },
    },
    required: ["to", "body"],
  },
  send_email: {
    description: "Send an email via DigitalGate (when configured).",
    properties: {
      to: { type: "string", description: "Email address" },
      subject: { type: "string" },
      body: { type: "string" },
    },
    required: ["to", "subject", "body"],
  },
  transfer_to_human: {
    description: "Escalate / transfer to a human team member.",
    properties: {
      reason: { type: "string", description: "Why the transfer is needed" },
      summary: { type: "string", description: "Call summary for the human" },
    },
  },
};

function appOrigin() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://app.digitalgate.com.au").replace(/\/$/, "");
}

function toolUrl(agentId, tool) {
  const params = new URLSearchParams({ agentId, tool });
  return `${appOrigin()}/api/webhooks/elevenlabs/tools?${params.toString()}`;
}

function resolveGreeting(template, businessName, agentName) {
  return String(template || "")
    .replaceAll("{{business_name}}", businessName || "us")
    .replaceAll("{{agent_name}}", agentName || "the receptionist");
}

function conversationConfig(agentId, businessName) {
  const toolSecret =
    process.env.ELEVENLABS_TOOL_SECRET?.trim() || process.env.ELEVENLABS_API_KEY?.trim();
  const tools = RECEPTIONIST.enabledTools.map((name) => {
    const meta = TOOL_META[name] || { description: name, properties: {} };
    return {
      type: "webhook",
      name,
      description: meta.description,
      api_schema: {
        url: toolUrl(agentId, name),
        method: "POST",
        content_type: "application/json",
        request_headers: {
          Authorization: `Bearer ${toolSecret}`,
          "Content-Type": "application/json",
        },
        request_body_schema: {
          type: "object",
          description: meta.description,
          properties: meta.properties || {},
          required: meta.required || [],
        },
      },
    };
  });

  const prompt = [
    RECEPTIONIST.systemPrompt,
    `Objective: ${RECEPTIONIST.config.primaryObjective}`,
    `Tone: ${RECEPTIONIST.config.tone}`,
    "Architecture: ElevenLabs provides voice; DigitalGate is the system of record.",
  ].join("\n\n");

  return {
    agent: {
      first_message: resolveGreeting(
        RECEPTIONIST.greeting,
        businessName,
        RECEPTIONIST.name,
      ),
      language: "en",
      prompt: {
        prompt,
        llm: "gemini-2.0-flash",
        tools,
      },
    },
    tts: {
      model_id: "eleven_flash_v2",
    },
  };
}

async function elevenJson(path, init) {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "xi-api-key": key,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : {};
}

async function resolveOrg() {
  const org =
    (await prisma.organisation.findFirst({ where: { slug: "digitalgate" } })) ||
    (await prisma.organisation.findFirst({
      where: { name: { contains: "DigitalGate", mode: "insensitive" } },
    }));
  if (!org) throw new Error("DigitalGate organisation not found");
  return org;
}

async function main() {
  const org = await resolveOrg();
  console.log(`Org: ${org.name} (${org.id})`);

  let agent = await prisma.communicationAgent.findFirst({
    where: {
      organisationId: org.id,
      OR: [
        { name: RECEPTIONIST.name },
        { name: "Inbound Receptionist" },
        { type: "receptionist" },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });

  const data = {
    name: RECEPTIONIST.name,
    description: RECEPTIONIST.description,
    type: RECEPTIONIST.type,
    greeting: RECEPTIONIST.greeting,
    language: RECEPTIONIST.language,
    timezone: RECEPTIONIST.timezone,
    systemPrompt: RECEPTIONIST.systemPrompt,
    config: RECEPTIONIST.config,
    provider: process.env.ELEVENLABS_API_KEY?.trim() ? "elevenlabs" : "stub",
  };

  if (agent) {
    agent = await prisma.communicationAgent.update({
      where: { id: agent.id },
      data,
    });
    console.log(`Updated agent ${agent.id}`);
  } else {
    agent = await prisma.communicationAgent.create({
      data: {
        organisationId: org.id,
        name: RECEPTIONIST.name,
        status: "draft",
        enabledChannels: ["voice"],
        ...data,
      },
    });
    console.log(`Created agent ${agent.id}`);
  }

  console.log(`UI: /apps/ai-communications/agents?id=${agent.id}`);
  console.log(`Post-call webhook: ${appOrigin()}/api/webhooks/elevenlabs`);

  if (!publish) {
    console.log("Draft only. Re-run with --publish after ELEVENLABS_API_KEY is set.");
    return;
  }

  const payload = {
    name: RECEPTIONIST.name,
    conversation_config: conversationConfig(agent.id, org.name),
  };

  let providerAgentId = agent.providerAgentId;
  if (providerAgentId) {
    await elevenJson(`/v1/convai/agents/${encodeURIComponent(providerAgentId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    console.log(`Updated ElevenLabs agent ${providerAgentId}`);
  } else {
    const created = await elevenJson("/v1/convai/agents/create", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    providerAgentId = created.agent_id || created.agentId;
    if (!providerAgentId) throw new Error("ElevenLabs did not return agent_id");
    console.log(`Created ElevenLabs agent ${providerAgentId}`);
  }

  agent = await prisma.communicationAgent.update({
    where: { id: agent.id },
    data: {
      status: "published",
      provider: "elevenlabs",
      providerAgentId,
      publishedAt: new Date(),
    },
  });

  console.log(
    JSON.stringify(
      {
        agentId: agent.id,
        providerAgentId,
        postCallWebhook: `${appOrigin()}/api/webhooks/elevenlabs`,
        toolExample: toolUrl(agent.id, "create_contact"),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
