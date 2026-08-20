# Digital Business Brain

**Surface:** `/dashboard/brain` (Business sidebar)

The Business Brain is the customer knowledge corpus DigitalGate AI uses. It is **not** a generic knowledge base and **not** the Digital Twin.

| | Twin | Brain |
|--|------|-------|
| Role | Live operating snapshot | What the business is and how it works |
| Examples | Contacts, pipeline, health scores | Identity, people, SOPs, commercial offer, connectors, AI instructions |
| Feeds | Overview, Health, Advisor | Overview, Advisor, Communications, CRM, Automation |

## Dimensions

1. **Business** — plan, company information, brand, strategy, goals  
2. **People** — team, roles, responsibilities, contacts  
3. **Operations** — SOPs, processes, workflows, policies  
4. **Commercial** — products, services, pricing, sales processes  
5. **Knowledge** — documents, FAQs, training, internal knowledge  
6. **Technology** — existing software, connectors, websites, domains, data sources  
7. **AI** — knowledge, context, permissions, approved tools, business-specific instructions  

Coverage is scored from live Business Profile, Goals, Team, CRM, Apps, connectors and Communications — not a separate wiki until those sources exist.

## Delivery

Implementation builds the Brain during onboarding (SOP stage 09). See [DELIVERY-OPERATING-MODEL.md](../partners/DELIVERY-OPERATING-MODEL.md).

**Lock:** `packages/platform-core/src/brain/` · `packages/platform-core/src/partners/delivery-model.ts` (`BUSINESS_BRAIN_ONBOARDING`)
