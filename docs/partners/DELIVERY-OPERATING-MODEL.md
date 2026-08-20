# DigitalGate Delivery Operating Model

**Active now** — Partner + Implementation architecture is part of the operating model, not something to build later.

**Positioning:** Powered by DigitalGate. DigitalGate owns account, subscription, platform, data, product, support and AI infrastructure. Partners deliver implementation and professional services.

## Commercial engine

1. **Resellers** — create opportunities through trusted introductions  
2. **Ben / DigitalGate** — qualify and close (Ben remains closer initially)  
3. **Implementation** — get customers live  
4. **Customer Success** — drive adoption  
5. **DigitalGate Platform** — continuously creates more value  
6. **Upsell / expansion** — more Apps, automation, AI, services and usage  

## Team structure

| Role | Responsibility |
|------|----------------|
| Ben — Founder / Platform Architect | Product, sales/close, partnerships, key relationships, commercial |
| 2 × Founding Resellers | Prospects, introductions, qualified opportunities; Ben closes |
| Head of Implementation | Methodology, QC, standards, coordinates delivery capacity |
| DigitalGate Delivery Team (internal) | Config, migration, connectors, CRM, automation, testing, docs, training support |

**Public naming:** Do not call outsourced capacity an "implementation team" yet. Internally: **DigitalGate Delivery Team**. Technical contact: **Head of Implementation**.

## Delivery chain

```
Customer → DigitalGate → Head of Implementation → Delivery Team
```

**Avoid:** Customer → random outsourced developer

## Head of Implementation — first mandate

Build the **DigitalGate Implementation System** — not only onboard customers. Document the 15-stage SOP so every future customer follows the same framework:

1. Customer acceptance  
2. Agreement  
3. Kick-off  
4. Discovery  
5. Business setup  
6. Data migration  
7. Connector setup  
8. App configuration  
9. AI / Business Brain setup  
10. Automation  
11. Testing  
12. Staff training  
13. Go-live  
14. 30-day review  
15. Handover to ongoing support  

## Implementation packages (internal only)

Not published yet — for scoping and pricing.

- **DigitalGate Launch** — straightforward businesses (setup, team, core config, basic connectors/CRM, training, go-live)  
- **DigitalGate Growth** — multi-system migration (+ migration, CRM, automation, website, AI, advanced connectors)  
- **DigitalGate Enterprise** — complex (+ custom workflows, multiple teams, custom dev, extensive training, ongoing optimisation)  

## Business Brain during onboarding

Implementation should build the customer's **Digital Business Brain**, not only configure software:

- **Business** — plan, company info, brand, strategy, goals  
- **People** — team, roles, responsibilities, contacts  
- **Operations** — SOPs, processes, workflows, policies  
- **Commercial** — products, services, pricing, sales processes  
- **Knowledge** — documents, FAQs, training, internal knowledge  
- **Technology** — existing software, connectors, websites, domains, data sources  
- **AI** — knowledge, context, permissions, approved tools, business-specific instructions  

Feeds: Overview → Command Centre → Advisor → Business Health → AI Communications → CRM → Automation

## Scaling delivery

| Scale | Model |
|-------|--------|
| 2–5 customers | Head of Implementation manages almost everything |
| 10–20 customers | Delegate defined tasks to Delivery Team |
| 50+ customers | Specialised delivery (Migration, CRM, Web, Automation, AI, QA, Training); Lead manages the standard |

## Relationship ownership

**DigitalGate owns:** account, subscription, platform, customer data, product relationship, support, roadmap, AI infrastructure  

**Partner delivery owns:** implementation, configuration, training, professional services, specialist work  

**Surfaces:** `/command/partners/delivery` · `/command/partners/onboarding` · `/command/partners/implementation`

**Lock:** `packages/platform-core/src/partners/delivery-model.ts`
