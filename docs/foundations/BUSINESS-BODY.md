# DigitalGate Business Body™ (conceptual framework)

**Status:** Locked · Platform Architect (Ben) · August 2026  
**Use as:** Mental model for onboarding, education, demos, marketing, AI explanations, Customer Success, and help — **not** as primary UI chrome  
**Related:** [BUSINESS-BRAIN.md](./BUSINESS-BRAIN.md) · [CONNECTED-BUSINESS.md](./CONNECTED-BUSINESS.md) · [INTELLIGENT-LAYER.md](./INTELLIGENT-LAYER.md) · [OPERATOR-EXPERIENCE.md](./OPERATOR-EXPERIENCE.md) · [APP-HIERARCHY.md](./APP-HIERARCHY.md)

---

## The problem this solves

DigitalGate may become extremely sophisticated. A business owner should not need to understand software architecture to understand their business.

The **Business Body™** is the human-readable model sitting above the technical architecture. It maps platform capabilities to recognisable functions of a living organisation.

**Deeper philosophy** (why connection matters at all): [CONNECTED-BUSINESS.md](./CONNECTED-BUSINESS.md) — *A healthy business, like a healthy body, depends on its systems being connected and working together.*

---

## Naming (locked — avoid brand sprawl)

| Name | Role |
|------|------|
| **Business Brain™** | Intelligence layer — what the business knows and understands ([BUSINESS-BRAIN.md](./BUSINESS-BRAIN.md)) |
| **Business Body™** | Conceptual model for how DigitalGate connects everything (this document) |
| **Business DNA** | Identity & knowledge that make *this* business unique (feeds the Brain) |

Do **not** rename the whole platform “Business Brain.” Brain is one organ in the Body. Twin / Decision Intelligence / Action / Learning remain the technical north-star stack ([INTELLIGENT-LAYER.md](./INTELLIGENT-LAYER.md)).

---

## Living-organisation loop

```
See → Think → Decide → Act → Communicate → Learn → Grow
```

This is the customer-facing reading of Connect → Centralise → Understand → Decide → Act → Learn → Grow.

---

## Body map (capability → meaning)

Use only where the analogy is intuitive. Do **not** force every module into an organ.

| Concept | Meaning | Platform (underneath) | One-liner |
|---------|---------|------------------------|-----------|
| **🧬 DNA** | Identity & knowledge | Brand, values, mission, model, products/services, policies, SOPs, plans, legal, Brain dimensions | *What makes your business your business* |
| **🧠 Brain** | Intelligence | Twin + AI + Business Knowledge + Advisor + Intelligence surfaces | *Understands what is happening* |
| **👁️ Eyes** | Visibility | Analytics, SEO, AI Visibility, Reputation, Twin signals, market intelligence, Opportunities | *Can’t act on what it can’t see* |
| **👂 Ears** | Listening | Calls, email, messages, reviews, enquiries, forms, social, AI Communications | *Hears what customers are saying* |
| **❤️ Heart** | Relationships | CRM, contacts, companies, history, relationship communications, reputation | *Customers circulate value* |
| **🫁 Lungs** | Connections | Connectors, Google, Meta, Stripe, Xero, email, ElevenLabs, APIs, external systems | *Outside world exchanges with the business* |
| **🦴 Skeleton** | Infrastructure | Core, orgs, users, permissions, domains, hosting, security, data architecture | *Structure everything depends on* |
| **🧬 Nervous system** | Signals & coordination | Event Bus + Automation + Notifications + AI + Universal Objects | *Carries signals and coordinates action* |
| **💪 Arms / Hands** | Action | Automation, tasks, workflows, AI Actions, campaigns, follow-up, publishing, ops actions | *Doesn’t just know — it acts* |
| **🦵 Legs** | Movement & growth | Prospecting, pipeline, sales, Growth Apps, marketing, BD | *Needs momentum* |

### Broader ecosystem (when organs stop helping)

| Concept | Meaning |
|---------|---------|
| **Environment** | Market, industry, competitors, customers outside the walls |
| **Energy** | Revenue / cash flow |
| **Traffic** | Opportunities and pipeline flow |
| **Immune system** | Security, compliance, reputation, risk |
| **Memory** | Documents, history, CRM timeline, knowledge |

**Circulatory flow** (optional teaching metaphor): leads, opportunities, tasks, information, communications, payments, documents, events, workflows — “DigitalGate keeps information flowing” — without saying Universal Objects or Event Bus first.

---

## Hard rule — not a gimmick UI

**Do not** turn the sidebar or primary shell into:

🧠 Brain · 👁 Eyes · ❤️ Heart · 🫁 Lungs …

That becomes gimmicky and fights [OPERATOR-EXPERIENCE.md](./OPERATOR-EXPERIENCE.md).

The operator interface stays clean, professional, and business-like (Overview · Priorities · Opportunities · AI Advisor · Apps).

The Body analogy **surfaces** in:

- Onboarding (“Let’s build your Business Brain”)  
- Product education & platform tours  
- Demos & Founding conversations  
- Marketing / GTM narrative  
- AI Advisor explanations (“Visibility…” / “Relationships…” / “Growth…”)  
- Help / Customer Success  
- Business Brain education surfaces  

---

## Onboarding sequence (Body-led)

Replace “configure 47 modules” with building a living system:

| Step | Framing | Connect / import |
|------|---------|------------------|
| 1 | **Give it DNA** | What you do, who you serve, what you sell, goals, plans & key documents |
| 2 | **Open its eyes** | Website, Google, Analytics, Social, SEO / AI Visibility |
| 3 | **Connect its ears** | Email, phone, forms, messaging, reviews |
| 4 | **Give it a heart** | Customers, contacts, companies, opportunities |
| 5 | **Give it arms** | Automation, AI Actions, follow-up, campaigns |
| 6 | **Teach it to think** | Goals, priorities, strategy, Advisor, Business Knowledge |

Operators build the Brain/Body without learning the technical architecture.

---

## AI interface pattern

When explaining health or recommendations, group by Body concepts — not by module IDs:

> Your business is healthy overall, but three areas need attention.  
> **Visibility** — AI search visibility fell 8% → review local content.  
> **Relationships** — 17 enquiries without follow-up → activate follow-up workflow.  
> **Growth** — pipeline slowed 30 days → review prospecting.

Same signals as Recommended Actions / Opportunity Engine; human-readable framing.

---

## Nervous system example (architecture without jargon)

```
New website enquiry
  → CRM opportunity
  → AI scores it
  → Automation triggers
  → Agent notified
  → Customer acknowledgement
  → Task created
  → Follow-up monitored
```

Customer language: *The nervous system carries signals and coordinates action across the business.*  
Builder language: Event Bus + Universal Objects + Automation + Notifications + AI.

---

## Map to Intelligent Layer

| Body concept | North-star loop |
|--------------|-----------------|
| Lungs / Ears / Eyes | Connect |
| Heart / Memory / Flow | Centralise |
| DNA / Brain / Twin | Understand |
| Nervous system / Advisor | Decide |
| Arms / Hands | Act |
| Memory / Brain learning | Learn |
| Legs / Traffic / Energy | Grow |

---

## Implementation rules

1. Prefer Body language in **education and AI copy**; prefer outcome language in **daily UI**.  
2. Never require Body literacy to operate DigitalGate.  
3. Never put organ emoji nav in the default shell.  
4. When explaining architecture to non-technical operators, start with Body — then optionally deepen to Twin / Apps / Connectors.  
5. Keep trademarked names sparse: Business Brain™, Business Body™, Business DNA — then stop inventing organ brands.

```
The Body is how humans understand DigitalGate.
The Intelligent Layer is how DigitalGate understands the business.
Neither should force the other into a gimmick.
```
