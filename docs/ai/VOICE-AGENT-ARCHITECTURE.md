# Voice Agent Architecture

**Status:** Locked · August 2026  
**App:** AI Communications (Growth) · Voice Agents · Agent Builder  
**Ops:** [VOICE-AGENT-RUNBOOK.md](./VOICE-AGENT-RUNBOOK.md) · [COMMUNICATIONS-ARCHITECTURE.md](./COMMUNICATIONS-ARCHITECTURE.md)  
**Context:** [BUSINESS-BRAIN.md](../foundations/BUSINESS-BRAIN.md) · [CONNECTED-BUSINESS.md](../foundations/CONNECTED-BUSINESS.md)

---

## Core principle

> **ElevenLabs provides the voice intelligence; DigitalGate remains the system of record.**

The agent may have a natural conversation. Every meaningful action — Contact create/update, Opportunity create/update, Task, SMS, email, transfer — runs through **DigitalGate’s permission-controlled tools** and is written to the **audit trail**.

The voice provider **never** writes directly to the customer database.

```
Voice Agent
  → Identity
  → Personality
  → Purpose
  → Behaviour
  → Business Brain Context (authorised)
  → Knowledge Base
  → DigitalGate Tools
  → Permissions
  → Compliance
  → Escalation
  → Post-call Actions
  → Analytics
```

**Post-call:** ElevenLabs → Post-call webhook → DigitalGate → Contact / Opportunity / Task / Timeline / AI analysis

This foundation supports future inbound, outbound, qualification, appointment, service, follow-up and industry-specific agents without rebuilding the stack.

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
| **Voice / model** | Business-selected ElevenLabs voice and conversational model (configurable) |

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

> DigitalGate is the system of record. ElevenLabs provides the conversational voice experience. The voice agent never writes directly to your database. All business actions run through DigitalGate’s permission-controlled tools, with an audit trail.

---

## Escalation & compliance

| Control | Default | Notes |
|---------|---------|--------|
| Recording disclosure | Enabled | “Just letting you know, this call may be recorded to help us improve our service.” — configurable by jurisdiction |
| Out of hours | Take message | Options: (1) Take message (2) Provide information + create follow-up (3) Transfer to emergency/on-call when configured |
| Human fallback | Transfer / task | “I want to make sure you get the right help with this. I’ll pass this through to someone from the team.” |

Escalate when the caller asks for a person, the matter is sensitive/complex, or the agent cannot confidently resolve.

---

## Business Brain context layer

Architecture target:

```
Business Brain → Agent → DigitalGate Tools
```

Not merely Business Profile → Voice Agent.

The agent should eventually understand (within permissions): what the business does, who it serves, services, terminology, processes, policies, hours, ideal customers, qualification criteria, FAQs, escalation rules, compliance, current priorities.

Same **Inbound Receptionist** template behaves differently for Real Estate vs Accountant via Industry App + Template + Brain.

**Live today:** Authorised Business Profile subset via `getAuthorisedAgentContext` / `compileAgentSystemPrompt`.  
**Direction:** Deeper Brain readiness, documents, Industry Template qualification fields.

---

## Implementation map

| Concern | Location |
|---------|----------|
| Template definition | `packages/platform-core/src/communications/templates.ts` |
| Prompt compile + authorised context | `packages/platform-core/src/communications/context.ts` |
| Tool execution + audit | `packages/platform-core/src/communications/tools.ts` · webhooks |
| Agent Builder UI | `src/components/ai-communications/AgentBuilderForm.tsx` |
| Seed | `scripts/seed-voice-receptionist.mjs` |
