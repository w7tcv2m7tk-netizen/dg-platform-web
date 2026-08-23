# Digital Business Brain

**Surface:** `/dashboard/brain` (Intelligence)  
**Conceptual frame:** [BUSINESS-BODY.md](./BUSINESS-BODY.md) · [CONNECTED-BUSINESS.md](./CONNECTED-BUSINESS.md) · [CONNECTED-BUSINESS-IMPLEMENTATION.md](./CONNECTED-BUSINESS-IMPLEMENTATION.md)  
**DigitalGate org master context:** [DIGITALGATE-MASTER-BUSINESS-PLAN.md](../strategy/DIGITALGATE-MASTER-BUSINESS-PLAN.md) — authoritative Business Brain source for what DigitalGate is, sells, how it operates and grows (Live vs Vision)

> **Business Brain™** — the intelligence layer that turns your **connected business** into a **smart business**.
>
> Customer experience: *“DigitalGate understands my business.”* — never expose RAG, embeddings, or retrieval plumbing.
>
> For **DigitalGate itself**, the Master Business Plan is Platform Knowledge / Business Knowledge that AI must prefer for strategy — never confuse Vision with Live capability.

It combines Business DNA (what the business is), Digital Twin (what is happening), Business Knowledge, Goals, AI, Intelligence recommendations, and Automation. It is **not** a generic knowledge base, **not** the Digital Twin alone, and **not** an isolated App.

| Concept | Role |
|---------|------|
| Digital Twin | Awareness — what is happening |
| Business Brain | Understands — what the business is and needs next |
| Business Health | Measures |
| Command Centre | Prioritises |
| AI Advisor | Explains |
| Automation | Acts |

| | Twin | Brain |
|--|------|-------|
| Role | Live operating snapshot | What the business is and how it works — plus organisational knowledge for AI |
| Examples | Contacts, pipeline, health scores | Identity, people, SOPs, commercial offer, connectors, AI instructions |
| Feeds | Overview, Health, Advisor | Command Centre, Advisor, Communications, CRM, Automation |

**Business DNA** (within / under the Brain): brand, values, mission, business model, products/services, processes, policies, strategy, legal, plans, SOPs — *what makes this business this business.*

## Knowledge layers

See [KNOWLEDGE-LAYERS.md](./KNOWLEDGE-LAYERS.md) for the locked Platform vs Business vs Twin vs Advisor distinction.

| Layer | Role |
|-------|------|
| **Platform Knowledge** | How DigitalGate works — Platform Docs (`/command/docs`, staff only) |
| **Business Knowledge** | How this organisation works — documents, SOPs, brand, pricing (Business Brain) |
| **Live Business Context** | What is happening now — Twin signals |
| **External Intelligence** | Industry, market, connectors where authorised |

**Personal / team knowledge** is reserved for a future controlled layer above Business Brain.

Permissions are organisation- and user-aware. AI may only use what the current user is authorised to access. Metadata contract: `packages/platform-core/src/brain/knowledge-layers.ts`.

## Dimensions

1. **Business** — plan, company information, brand, strategy, goals  
2. **People** — team, roles, responsibilities, contacts  
3. **Operations** — SOPs, processes, workflows, policies  
4. **Commercial** — products, services, pricing, sales processes  
5. **Knowledge** — documents, FAQs, training, internal knowledge  
6. **Technology** — existing software, connectors, websites, domains, data sources  
7. **AI** — knowledge, context, permissions, approved tools, business-specific instructions  

Coverage is scored from live Business Profile, Goals, Team, CRM, Apps, connectors and Communications — not a separate wiki until those sources exist. The Brain screen answers: **What does DigitalGate know about my business?**

## Voice Agents (consumer)

Voice Agents are shaped by **Business Brain → Agent → DigitalGate Tools**, not a generic phone script. ElevenLabs provides the conversational voice; DigitalGate remains the system of record for Contact, Opportunity, Task, SMS, email and transfer.

See [VOICE-AGENT-ARCHITECTURE.md](../ai/VOICE-AGENT-ARCHITECTURE.md). Authorised Profile subset is Live today (`getAuthorisedAgentContext`); deeper Brain retrieval is Direction.

## Delivery

Implementation builds the Brain during onboarding (SOP stage 09). Prefer Body-led onboarding language from [BUSINESS-BODY.md](./BUSINESS-BODY.md) (DNA → Eyes → Ears → Heart → Arms → Think). See [DELIVERY-OPERATING-MODEL.md](../partners/DELIVERY-OPERATING-MODEL.md).

**Lock:** `packages/platform-core/src/brain/` · `packages/platform-core/src/partners/delivery-model.ts` (`BUSINESS_BRAIN_ONBOARDING`)
