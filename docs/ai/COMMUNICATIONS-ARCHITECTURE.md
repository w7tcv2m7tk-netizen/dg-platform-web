# AI Communications Architecture

**DigitalGate as the orchestration layer for AI voice, chat, email, and messaging**

**Version:** 0.2  
**Status:** Live slice — ElevenLabs as initial Voice Provider + Agent Builder + Call Centre  
**Architecture lock:** [VOICE-AGENT-ARCHITECTURE.md](./VOICE-AGENT-ARCHITECTURE.md) — *Voice is a replaceable provider; DigitalGate owns intelligence and is the system of record.*  
**Ops:** [VOICE-AGENT-RUNBOOK.md](./VOICE-AGENT-RUNBOOK.md)  
**Last updated:** August 2026  

**Related:** [foundations/COMMUNICATIONS.md](../foundations/COMMUNICATIONS.md) · [AI-ARCHITECTURE.md](./AI-ARCHITECTURE.md) · [VOICE-AGENT-ARCHITECTURE.md](./VOICE-AGENT-ARCHITECTURE.md) · [VOICE-AGENT-RUNBOOK.md](./VOICE-AGENT-RUNBOOK.md) · [AI-GOVERNANCE.md](../foundations/AI-GOVERNANCE.md) · [BUSINESS-BRAIN.md](../foundations/BUSINESS-BRAIN.md) · [CONNECTOR-SPECIFICATION.md](../connectors/CONNECTOR-SPECIFICATION.md)

---

## Strategic intent

DigitalGate does **not** compete with speech vendors and does **not** position AI Communications as “ElevenLabs inside DigitalGate.”

**Customer position:** *AI employees connected to your business.*

Customers choose agent roles (Receptionist, Sales, Qualifier, …). DigitalGate supplies personality, Business Brain, knowledge, permissions, tools, CRM, automation and audit. The **voice provider** is how that agent speaks — ElevenLabs today, OpenAI Realtime (and others) tomorrow.

| DigitalGate owns | Voice providers own |
|------------------|---------------------|
| Agent identity, purpose, behaviour | Speech-to-text / TTS / realtime audio |
| Business Brain + Knowledge context | Provider conversational voice models |
| Model Router (reasoning) + tools | Telephony / streaming (as configured) |
| CRM / Opportunity Intelligence | |
| Permissions, audit, automations | |
| Call Centre UX | |

**Principle:** Build provider adapters behind a stable interface. Persist `provider` on every agent. ElevenLabs is the **Live** v1 Voice Provider — not the underlying AI architecture.

```
Business Brain → AI Service / Model Router → Agent + DigitalGate Tools
        → Voice Provider (ElevenLabs | OpenAI Realtime | …)
        → Phone / Web voice / SMS / Email / WhatsApp
```

---

## Position in the platform

```
Platform Core
     │
     ├── Universal Objects (Contact, Lead, Activity, Task, Document)
     ├── AI Service (prompts, context, tool registry)
     ├── Event Bus (call.completed, message.received, …)
     ├── Automation Engine (Phase 2 — triggers/actions declared now)
     └── Connectors (Twilio, ElevenLabs, Resend, …)
              │
              ▼
     AI Communications App (Growth)
              │
              ├── Inbox (unified threads)
              ├── Voice Agents (inbound, outbound, receptionist, …)
              ├── Call Centre (recordings, transcripts, outcomes)
              ├── Agent Builder (prompts, personality, escalation)
              ├── Knowledge Base (website, docs, CRM, products)
              └── Analytics & Coaching
```

**App manifest:** `packages/platform-core/src/apps/builtins/ai-communications.ts`  
**Commercial:** `voice_ai` addon (+$99/mo) in `src/lib/plans.ts`

---

## Module structure

### Voice Agents

| Agent type | Use case |
|------------|----------|
| Inbound | General enquiries |
| Outbound | Follow-up calls |
| Receptionist | After-hours / overflow |
| Sales | Lead qualification |
| Customer support | FAQ + escalation |
| Booking | Appointments |
| Lead qualification | RE vendor intake |
| Follow-up | Post-appraisal nurture |

### Knowledge Base

Agents pull context from org-scoped sources:

- Website content (Connector)
- Documents (Platform assets)
- FAQs (Knowledge Base module)
- CRM (Contact, Lead, Activity history)
- Products & services (Business Memory)
- Internal documentation

Context is assembled by **AI Service Context Builder** — not embedded in provider prompts.

### Prompt Builder

Per-agent configuration:

- Personality & tone
- Objectives
- Opening / closing scripts
- Escalation rules
- Compliance instructions (industry-specific)

Prompts are versioned, auditable, and org-scoped. See [AI-GOVERNANCE.md](../foundations/AI-GOVERNANCE.md).

### Call Centre

Every interaction produces:

| Field | Storage |
|-------|---------|
| Recording | External provider URL → `Activity.metadata` |
| Transcript | `Activity` (`activityType: "voice_transcript"`) |
| AI summary | `Activity` (`activityType: "ai_summary"`) |
| Sentiment | `Activity.metadata.sentiment` |
| Outcome | `Activity.metadata.outcome` |
| Duration | `Activity.metadata.durationSeconds` |
| Next action | `Task` or automation trigger |
| Linked contact | `Activity.entityType: "Contact"` |

### AI Coaching (Phase 2+)

Metrics derived from call Activities:

- Response quality
- Conversion / booking rate
- Average call length
- Missed opportunities
- Customer sentiment trends

Coaching suggestions via `comms.coaching_feedback` aiTool.

---

## Universal Timeline integration

A phone call is not a separate silo. It is an **Activity** on the Universal Timeline.

```
Contact
   │
   └── Timeline
         ├── Activity: call (inbound, 4m 32s)
         ├── Activity: voice_transcript
         ├── Activity: ai_summary ("Vendor interested in appraisal…")
         ├── Task: "Send appraisal pack" (created from extract_actions)
         ├── Activity: email (confirmation sent)
         └── Automation: lead.stage → appraisal
```

Existing CRM contact detail (`/apps/crm/contacts/[id]`) and RE lead detail (`/apps/re/vendor-leads/[id]`) render these Activities automatically when `sourceApp: "ai-communications"`.

**Phase 1 rule:** Use `Activity` + JSON metadata. Dedicated `Conversation` / `Message` models are deferred until query volume requires them.

---

## Provider abstraction

```typescript
/** packages/platform-core/src/communications/providers/types.ts (planned) */

interface VoiceProvider {
  readonly id: "elevenlabs" | "vapi" | "twilio";
  createAgent(config: VoiceAgentConfig): Promise<ExternalAgentRef>;
  updateAgent(ref: ExternalAgentRef, config: VoiceAgentConfig): Promise<void>;
  initiateOutboundCall(params: OutboundCallParams): Promise<CallRef>;
  endCall(ref: CallRef): Promise<void>;
}

interface MessageProvider {
  readonly id: "twilio" | "resend" | "sendgrid";
  sendSms(params: SmsParams): Promise<MessageRef>;
  sendEmail(params: EmailParams): Promise<MessageRef>;
}

interface CommunicationsOrchestrator {
  /** Resolve contact, assemble context, route to provider */
  handleInboundCall(webhook: InboundCallWebhook): Promise<void>;
  handleOutboundRequest(params: OutboundRequest): Promise<void>;
  recordActivity(input: CommunicationActivityInput): Promise<Activity>;
}
```

**v1 default:** ElevenLabs for voice synthesis + conversational model; Twilio for telephony if required.  
**Migration path:** Vapi adapter implements `VoiceProvider` — swap without changing app UI or CRM integration.

---

## Connector pattern

Follow the WordPress connector model (`packages/platform-core/src/connectors/wordpress/`):

```
External webhook (Twilio / ElevenLabs)
       ↓
Connector handler (packages/platform-core/src/connectors/{provider}/)
       ↓
Communications orchestrator
       ↓
Contact lookup / create → Activity write → Event publish → Audit log
       ↓
/api/v1/connectors/{provider}/status (health probe)
```

Inbound webhooks:

- `/api/v1/connectors/twilio/voice/webhook`
- `/api/v1/connectors/elevenlabs/webhook`

Org credentials stored in `AppInstallation.settings` or `Organisation.settings.connectors`.

---

## Event catalogue (new)

| Event | Trigger | Typical automation |
|-------|---------|-------------------|
| `message.received` | Inbound SMS/email/chat | Assign, draft reply |
| `message.sent` | Outbound confirmed | Log, notify |
| `call.started` | Call connected | — |
| `call.completed` | Call ended | Summarise, create task |
| `call.missed` | No answer | SMS callback, notify team |
| `appointment.booked` | Agent books slot | Calendar, confirmation email |
| `lead.qualified` | Agent scores lead | Update pipeline stage |

Events publish via `platformEvents` — same bus as `contact.created`, `lead.created`.

---

## Automation integration

The Automation Engine (Phase 2) executes rules declared in the app manifest. Example flow:

```
Lead calls (inbound)
       ↓
Appointment booked (call.completed + outcome)
       ↓
Create calendar event
       ↓
Send SMS confirmation
       ↓
Email confirmation
       ↓
Notify salesperson
       ↓
Update CRM / RE pipeline
       ↓
Generate report entry
```

RE app already declares `lead.send_followup` — first cross-app automation action target.

**Governance:** Outbound client messages require automation rule + opt-in. See [AI-GOVERNANCE.md](../foundations/AI-GOVERNANCE.md).

---

## Business intelligence

Command Centre and org dashboards surface:

| Metric | Source |
|--------|--------|
| AI calls today | Activity count (`activityType: "call"`) |
| Appointments booked | Activities with `outcome: "appointment_booked"` |
| Qualified leads | `lead.qualified` events |
| Average sentiment | `metadata.sentiment` aggregate |
| Missed calls | `call.missed` events |
| Average wait | Provider webhook metadata |
| Hours saved | Automation time-saved model |
| Estimated labour savings | BI Engine (Phase 2) |

Types stubbed in `packages/platform-core/src/command-centre/types.ts` (`emailVolumeToday`, `smsVolumeToday`).

---

## Core Communications (architecture lock)

**Canonical lock:** [foundations/COMMUNICATIONS.md](../foundations/COMMUNICATIONS.md)

Do **not** build a standalone “Email App.” Core owns the **Communication Record** (Message · Channel · Thread · Activity · Source · delivery · audit). Google/Microsoft remain mailbox SoT; DigitalGate orchestrates association, history, automation and AI Assist.

**AI Communications (this Growth app)** remains voice agents, Call Centre, Agent Builder and monetised AI depth — channels (voice, SMS, email, WhatsApp, …) should progressively emit into the **same Core Communication model** so the operator sees one communication layer, not four products.

```
Core Communications (History + Record)
├── Email (Google / Microsoft OAuth)
├── SMS
├── Phone / AI Voice   ← AI Communications Growth modules feed here
├── WhatsApp
├── Web Chat / Messenger / …
└── Future channels
```

---

## Competitive advantage

Most platforms bolt AI onto an existing CRM. DigitalGate makes AI **native** because agents already understand:

- Customers (Contact, Company)
- Properties & listings (RE app)
- Bookings & pipeline stage (Lead metadata)
- Previous conversations (Activity timeline)
- Business rules (Automation + prompts)
- Documents & website content (Connectors + Knowledge Base)

Context is what makes an agent genuinely useful — not better TTS.

---

## Build phases

| Phase | Scope | Exit criteria |
|-------|-------|---------------|
| **0 — Manifest** | App registered, docs, feature flags | Visible on `/dashboard/apps` as Available |
| **1 — Activity-first** | `communications/index.ts`; inbox reads Contact Activities | Comms appear on CRM timeline |
| **2 — Email/SMS v0** | Resend/Twilio connector; draft → approve → send | Inbound email creates Activity |
| **3 — Voice v0 (Roe)** | One inbound receptionist; ElevenLabs adapter | Call → transcript → summary on timeline |
| **4 — Call Centre UI** | Recordings, search, outcomes | `/apps/ai-communications/call-centre` |
| **5 — Agent Builder** | Prompt templates, knowledge, escalation | Self-service agent config |
| **6 — Automation** | Wire triggers to Automation Engine | `call.completed` → task + email |
| **7 — Coaching & BI** | Sentiment, conversion, labour savings | Command Centre metrics live |

**Dependency:** Platform 1.0 exit (CRM + RE pipeline in prod) before Phase 3 voice work.

---

## Code map (planned)

| Path | Purpose |
|------|---------|
| `packages/platform-core/src/apps/builtins/ai-communications.ts` | App manifest ✅ |
| `packages/platform-core/src/communications/index.ts` | Activity write/list helpers |
| `packages/platform-core/src/communications/providers/` | VoiceProvider, MessageProvider adapters |
| `packages/platform-core/src/connectors/elevenlabs/` | Webhook + sync |
| `packages/platform-core/src/connectors/twilio/` | SMS + voice telephony |
| `src/app/apps/ai-communications/` | App UI routes |
| `src/app/api/v1/communications/` | Platform API |
| `src/app/api/v1/connectors/elevenlabs/` | Webhook endpoints |

---

## Rules

1. Apps never call LLM or voice APIs directly — use AI Service and provider adapters  
2. All communication events write to `Activity` with `sourceApp: "ai-communications"`  
3. Provider credentials are org-scoped; never in client bundles  
4. Draft messages require human approval before send (default)  
5. Declare automation triggers/actions in manifest — do not implement engine in app  
6. PII scoped to organisation; no cross-tenant context in prompts  

---

## Roe Realty v0 scenario

First production voice agent for the flagship tenant:

1. Inbound call to Roe office number  
2. Agent greets, qualifies vendor intent  
3. Match phone → Contact or create from call  
4. Link to existing WordPress Lead if phone/email matches  
5. Transcript + summary → Activity on Contact and Lead timelines  
6. If appraisal requested: create Task for Louise, draft follow-up SMS (user approves)  
7. Metrics visible in Call Centre dashboard  

This validates the full stack without replacing Vapi on day one — ElevenLabs direct with optional Vapi adapter for speed.
