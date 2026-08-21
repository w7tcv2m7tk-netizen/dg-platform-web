# Digital Business Brain

**Surface:** `/dashboard/brain` (Intelligence)  
**Conceptual frame:** [BUSINESS-BODY.md](./BUSINESS-BODY.md) · [CONNECTED-BUSINESS.md](./CONNECTED-BUSINESS.md) · [CONNECTED-BUSINESS-IMPLEMENTATION.md](./CONNECTED-BUSINESS-IMPLEMENTATION.md)

> **Business Brain™** — the intelligence layer that turns your **connected business** into a **smart business**.
>
> Customer experience: *“DigitalGate understands my business.”* — never expose RAG, embeddings, or retrieval plumbing.

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

| Layer | Contents |
|-------|----------|
| Platform Knowledge | DigitalGate docs, capabilities, policies |
| Business Knowledge | Customer plans, SOPs, brand, pricing, internal docs |
| Live Business Context | Contacts, opportunities, website, revenue, tasks, reviews |
| External Intelligence | Industry, market, search, AI visibility, connectors |

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

## Delivery

Implementation builds the Brain during onboarding (SOP stage 09). Prefer Body-led onboarding language from [BUSINESS-BODY.md](./BUSINESS-BODY.md) (DNA → Eyes → Ears → Heart → Arms → Think). See [DELIVERY-OPERATING-MODEL.md](../partners/DELIVERY-OPERATING-MODEL.md).

**Lock:** `packages/platform-core/src/brain/` · `packages/platform-core/src/partners/delivery-model.ts` (`BUSINESS_BRAIN_ONBOARDING`)
