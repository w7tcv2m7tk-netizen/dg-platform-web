# Voice Agent Architecture

**Status:** Locked · August 2026  
**App:** AI Communications (Growth) · Voice Agents · Agent Builder  
**Ops:** [VOICE-AGENT-RUNBOOK.md](./VOICE-AGENT-RUNBOOK.md) · [COMMUNICATIONS-ARCHITECTURE.md](./COMMUNICATIONS-ARCHITECTURE.md)  
**Context:** [BUSINESS-BRAIN.md](../foundations/BUSINESS-BRAIN.md) · [CONNECTED-BUSINESS.md](../foundations/CONNECTED-BUSINESS.md)

---

## Core principles (locked)

### 1. Voice is a replaceable provider — not the intelligence layer

> **ElevenLabs is the initial Voice Provider. DigitalGate owns agent intelligence, Business Brain context, tools, CRM writes, and the audit trail.**

Do **not** hard-wire DigitalGate’s architecture around ElevenLabs alone. OpenAI Realtime (and future providers) are first-class Direction options behind the same adapter interface.

```
DigitalGate Business Brain
        ↓
DigitalGate AI Service / Model Router
        ↓
Agent reasoning + DigitalGate Tools
        ↓
Voice Provider (ElevenLabs · OpenAI Realtime · future)
        ↓
Phone / Web voice / other channels
```

**Wrong:** DigitalGate → ElevenLabs does everything.  
**Right:** DigitalGate is the operating system; the voice provider is how the business’s brain speaks.

### 2. DigitalGate is the system of record

Every meaningful action — Contact create/update, Opportunity create/update, Task, SMS, email, transfer — runs through **DigitalGate’s permission-controlled tools** and the **audit trail**. The voice provider never writes directly to the customer database.

### 3. Position the product as AI employees — not “ElevenLabs inside DigitalGate”

Customers choose roles, not vendors:

- Inbound Receptionist  
- Sales Agent  
- Lead Qualifier  
- Appointment Agent  
- Customer Service Agent  
- Follow-up Agent  

DigitalGate then gives that agent: **voice · personality · Business Brain · knowledge · permissions · tools · CRM · automation · audit trail.**

Voice is one way the Business Brain interacts with the outside world (Body analogy) — not the product itself.

### 4. Provider is a field on every agent

Every `CommunicationAgent` stores `provider` (DB + API). UI may initially expose **ElevenLabs only**; the field remains so OpenAI Realtime (and others) can be enabled without a rebuild.

| Provider id | Status |
|-------------|--------|
| `elevenlabs` | **Live** — default v1 voice provider (ConvAI / ElevenAgents) |
| `openai_voice` | **Direction** — OpenAI Realtime adapter |
| `stub` | Dev / missing API key |

---

## Why ElevenLabs for v1 (keep)

For DigitalGate’s premium receptionist / sales experience:

- Excellent naturalness and perceived quality (critical for AU business demos)
- Eleven v3 Conversational — expressive, context-aware delivery and turn-taking
- Broad language support and strong voice customisation
- ElevenAgents tooling: telephony, tools, webhooks, analytics, deployment
- AU/NZ enterprise presence
- Competitive conversational pricing within ElevenAgents

Use **ElevenLabs (v3 Conversational where available)** for the premium voice experience — while keeping intelligence in DigitalGate.

## Why not lock only to ElevenLabs

OpenAI Realtime is a serious alternative (latency, interruption handling, instruction following, and proximity to DigitalGate’s broader Model Router). Provider independence is cheaper now than a rebuild later.

---

## Module shape

```
AI Communications
│
├── Agents
│   ├── Receptionist · Lead Qualifier · Sales · Appointment · CS · Follow-up
│
├── Agent Intelligence (DigitalGate)
│   ├── Business Brain · Knowledge Base · Context Builder
│   ├── Model Router · DigitalGate Tools · Permissions · Audit
│
├── Voice Providers
│   ├── ElevenLabs (Live)
│   ├── OpenAI Realtime (Direction)
│   └── Future providers
│
└── Channels
    ├── Phone · Web voice · SMS · Email · WhatsApp
```

Agent config stack:

```
Voice Agent
  → Provider (internal field)
  → Identity · Personality · Purpose · Behaviour
  → Business Brain Context (authorised)
  → Knowledge Base
  → DigitalGate Tools · Permissions
  → Compliance · Escalation
  → Post-call Actions · Sales Intelligence · Analytics
```

**Post-call:** Voice provider webhook → DigitalGate → Contact / Opportunity / Task / Timeline / Opportunity Intelligence

---

## Default template: Inbound Receptionist

| Field | Value |
|-------|--------|
| **Template id** | `receptionist` |
| **Purpose** | Answer inbound calls, identify intent, qualify, update/create Contact and Opportunity, ensure a follow-up action is recorded |
| **Agent name** | DigitalGate Receptionist (customer may rename) |
| **Role** | AI Business Receptionist |
| **Personality** | Professional, warm, helpful, confident, conversational — a capable team member, not a robotic IVR |
| **Tone** | Natural, concise, friendly |
| **Language** | English — Australian (`en-AU`) |
| **Timezone** | Inherited from Business Profile when available |
| **Voice / model** | Business-selected provider voice and conversational model (configurable) |
| **Provider** | `elevenlabs` (default) |

**Greeting (dynamic):**

> Thanks for calling {{business_name}}, you’re speaking with {{agent_name}}. How can I help you today?

### Primary objective

Understand the reason for the call and ensure the enquiry is properly captured and routed.

### Secondary objectives

- Identify the caller  
- Search for an existing Contact before creating a new one  
- Collect relevant qualification information  
- Create or update the appropriate Opportunity  
- Create a follow-up Task where required  
- Provide approved business information  
- Send SMS or email when appropriate  
- Transfer to a human when required  
- Never leave a meaningful enquiry without a recorded next action  

### Success criteria

Caller helped · Intent understood · Contact identified/created · Opportunity created/updated when appropriate · Qualification captured · Follow-up recorded · Escalation when necessary  

---

## Behaviour

Qualification questions are **defaults**, not a forced checklist. Ask conversationally and only when relevant. Prefer Industry App + Template + Business Brain + Business Profile over a static script.

**Default questions (use selectively):** What can we help with? Contacted before? Name? Best phone/email? Anything specific we should know? How soon to proceed? Anything else?

### May provide (authorised Business Brain / Knowledge)

Business name, services, products, hours, location, public contact info, website, general service descriptions, approved pricing, appointment availability when integrated, approved FAQs, other authorised Knowledge / Brain content.

### Must not provide

Unverified info · confidential business data · private customer data · other Contacts/Opportunities · legal/financial/medical advice (unless specifically authorised) · guarantees that cannot be fulfilled · internal system/AI configuration details · anything without reliable source  

When uncertain: say so and offer a team follow-up.

---

## DigitalGate tools (UI groups)

| Group | Tools |
|-------|--------|
| **Understand** | Get Business Profile · Get Business Hours · Search Contact · Search Opportunity |
| **Record** | Create Contact · Update Contact · Create Opportunity · Create Task |
| **Communicate** | Send SMS · Send Email |
| **Escalate** | Transfer to Human |

Copy for Agent Builder:

> DigitalGate is the system of record. The voice provider provides the conversational experience. The agent never writes directly to your database. All business actions run through DigitalGate’s permission-controlled tools, with an audit trail.

---

## Escalation & compliance

| Control | Default | Notes |
|---------|---------|--------|
| Recording disclosure | Enabled | “Just letting you know, this call may be recorded to help us improve our service.” — configurable by jurisdiction |
| Out of hours | Take message | Options: (1) Take message (2) Provide information + create follow-up (3) Transfer to emergency/on-call when configured |
| Human fallback | Transfer / task | “I want to make sure you get the right help with this. I’ll pass this through to someone from the team.” |

Escalate when the caller asks for a person, the matter is sensitive/complex, or the agent cannot confidently resolve.

---

## Sales Intelligence (Opportunity Intelligence)

Sales / qualification voice agents are the first place **Business Brain + Opportunity Engine** become visible after a conversation.

```
Voice provider call
  → Post-call webhook
  → DigitalGate ingest
  → Opportunity Intelligence (structured)
  → CRM Opportunity metadata + score
  → Call Centre / Activity timeline
  → Command Centre / human next step  (Direction)
```

### Opportunity Intelligence contract

| Field | Example |
|-------|---------|
| Fit | High |
| Need | High |
| Urgency | Medium |
| Commercial potential | High |
| Decision-maker | Identified |
| Current solution | Existing CRM |
| Primary problem | Disconnected systems |
| Desired outcome | One integrated platform |
| Recommended next step | Platform demonstration |
| Opportunity score | 86/100 |
| AI recommendation | Strong-fit — progress to consultation |

**Live today:** Rules-based extraction from transcript/summary on post-call (`sales-intelligence.ts`), stored on `CommunicationSession.metadata.salesIntelligence` and CRM `Opportunity.metadata`, shown in Call Centre.  
**Direction:** LLM enrichment, Command Centre prioritisation, Advisor “recommended next step” actions.

---

## Business Brain context layer

Architecture target:

```
Business Brain → Agent → DigitalGate Tools → Voice Provider
```

Not merely Business Profile → vendor agent.

**Live today:** Authorised Business Profile subset via `getAuthorisedAgentContext` / `compileAgentSystemPrompt`.  
**Direction:** Deeper Brain readiness, documents, Industry Template qualification fields.

---

## Implementation map

| Concern | Location |
|---------|----------|
| Template definition | `packages/platform-core/src/communications/templates.ts` |
| Prompt compile + authorised context | `packages/platform-core/src/communications/context.ts` |
| Provider adapters | `packages/platform-core/src/communications/providers/` |
| Tool execution + audit | `packages/platform-core/src/communications/tools.ts` · webhooks |
| Sales Intelligence | `packages/platform-core/src/communications/sales-intelligence.ts` |
| Agent Builder UI | `src/components/ai-communications/AgentBuilderForm.tsx` |
| Seed | `scripts/seed-voice-receptionist.mjs` |

### Instruction for implementers

> Keep ElevenLabs for the initial DigitalGate voice implementation. Build the integration properly around DigitalGate tools and Business Brain.  
> **Do not make ElevenLabs the underlying AI architecture. Make ElevenLabs the initial Voice Provider.**  
> Always persist `provider` on the agent. Excellent voice today; provider independence tomorrow.
