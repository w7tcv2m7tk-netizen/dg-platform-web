/**
 * Create (and optionally publish) the Inbound Receptionist for DigitalGate.
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
  name: "Inbound Receptionist",
  description:
    "Answer inbound calls, qualify the enquiry, create a Contact + Opportunity, and leave a follow-up task.",
  type: "receptionist",
  greeting:
    "Hello, thanks for calling. This call may be recorded for quality. How can I help you today?",
  language: "en-AU",
  timezone: "Australia/Brisbane",
  systemPrompt:
    "You are the DigitalGate inbound receptionist. Prefer short spoken sentences. Use tools to look up or create CRM records — never invent CRM ids. If unsure, create a follow-up task.",
  enabledTools: [
    "get_business_profile",
    "get_business_hours",
    "search_contact",
    "create_contact",
    "create_opportunity",
    "create_task",
  ],
  config: {
    personality: "Warm, professional, concise",
    tone: "Australian English, calm and clear",
    primaryObjective:
      "Answer inbound enquiries, capture caller details, and qualify whether this is a lead.",
    secondaryObjectives: [
      "Confirm name, phone, and email when possible",
      "Summarise what they need in plain language",
      "Create a CRM contact and opportunity when they are a prospect",
      "Create a follow-up task for the team",
    ],
    successCriteria:
      "Caller feels heard; CRM has accurate contact details; team has a clear next step.",
    qualificationQuestions: [
      "What can I help you with today?",
      "Is this for your business or personal?",
      "What is the best phone or email to reach you on?",
      "Would you like someone from the team to follow up?",
    ],
    mayProvide: [
      "Business hours and general location",
      "High-level product / service overview from the business profile",
      "How the team will follow up",
    ],
    mustNotProvide: [
      "Confidential customer records",
      "Unpublished pricing or discounts",
      "Legal, medical, or financial advice",
    ],
    enabledTools: [
      "get_business_profile",
      "get_business_hours",
      "search_contact",
      "create_contact",
      "create_opportunity",
      "create_task",
    ],
    recordingConsent: true,
    disclosure:
      "This call may be recorded for quality and training. Handle personal information under the Australian Privacy Act.",
    outOfHoursMessage: "Take a message, capture contact details, and offer a callback.",
    fallback: "message",
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
    description: "Search CRM contacts by name, phone, or email.",
    properties: {
      query: { type: "string", description: "Free-text name or keyword" },
      phone: { type: "string", description: "Caller phone number" },
      email: { type: "string", description: "Caller email address" },
    },
  },
  create_contact: {
    description: "Create a new CRM contact from the call.",
    properties: {
      firstName: { type: "string", description: "Caller first name" },
      lastName: { type: "string", description: "Caller last name" },
      phone: { type: "string", description: "Caller phone" },
      email: { type: "string", description: "Caller email" },
      name: { type: "string", description: "Full name if first/last unknown" },
    },
    required: ["firstName"],
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
};

function appOrigin() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://app.digitalgate.com.au").replace(/\/$/, "");
}

function toolUrl(agentId, tool) {
  const params = new URLSearchParams({ agentId, tool });
  return `${appOrigin()}/api/webhooks/elevenlabs/tools?${params.toString()}`;
}

function conversationConfig(agentId) {
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
  ].join("\n\n");

  return {
    agent: {
      first_message: RECEPTIONIST.greeting,
      language: "en",
      prompt: {
        prompt,
        llm: "gemini-2.0-flash",
        tools,
      },
    },
    tts: {
      model_id: "eleven_flash_v2_5",
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
    where: { organisationId: org.id, name: RECEPTIONIST.name },
  });

  const data = {
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
    conversation_config: conversationConfig(agent.id),
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
