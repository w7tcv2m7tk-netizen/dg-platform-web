# Knowledge layers

**Status:** Locked · August 2026  
**Related:** [BUSINESS-BRAIN.md](./BUSINESS-BRAIN.md) · [OPERATOR-OS.md](./OPERATOR-OS.md) · [ai/PLATFORM-INTELLIGENCE.md](../ai/PLATFORM-INTELLIGENCE.md) · `packages/platform-core/src/brain/knowledge-layers.ts`

---

## Principle

DigitalGate combines multiple knowledge layers without confusing them. Each layer answers a different question.

| Layer | Question | Owner | Primary surface |
|-------|----------|-------|-----------------|
| **Platform Knowledge** | How does DigitalGate work? | DigitalGate | Platform Docs (`/command/docs`) |
| **Business Knowledge** | How does *this* business work? | Customer organisation | Business Brain → Business Knowledge |
| **Live Business Context** | What is happening right now? | Customer organisation | Digital Twin |
| **Intelligence** | What does the pattern mean? | Derived | Business Health · Benchmarks · Insights |
| **AI Advisor** | What should happen next? | Derived | AI Advisor |

**Locked terminology:**

- **Platform Docs** = How DigitalGate works.
- **Business Brain** = How the customer’s business works.
- **Digital Twin** = What is currently happening in the business.
- **AI Advisor** = What should happen next.

---

## Platform Knowledge

DigitalGate’s official product documentation — owned and maintained by DigitalGate.

**Corpus:** curated allowlist in `docs/` via [`platform-docs.ts`](../../packages/platform-core/src/command-centre/platform-docs.ts) and `/command/docs`.

May include:

- Platform architecture and core functionality
- App and Industry App documentation
- Pricing and commercial rules
- Onboarding, connector and API documentation
- Troubleshooting, policies, reseller and delivery SOPs
- Product roadmap and developer documentation

**Used by:** Platform Intelligence, DigitalGate staff AI, Support, Resellers, Delivery partners — and customer-facing AI only where appropriate (e.g. explaining a platform capability).

**Not shown** as the customer’s primary knowledge area. Customers do not see Platform Docs in normal Platform Admin navigation.

**Navigation:** DIGITALGATE → Platform Docs (staff operator OS only).

---

## Business Knowledge

Each customer’s private business knowledge layer.

Examples:

- Business plan, brand guidelines, staff handbook
- Sales process, listing procedures, pricing policies
- SOPs, FAQs, training material, service agreements
- Internal policies, templates, compliance documents

**Used by:** Business Brain, AI Advisor, AI Communications, Automation, Reports, industry workflows, customer support assistant.

**Navigation:** Intelligence → Business Brain → **Business Knowledge** (documents and approved sources).

**Distinct from Platform Knowledge.** A real estate agency’s listing procedure belongs here — not in Platform Docs.

---

## Personal / team knowledge (future)

Optional controlled layer above Business Brain:

- User preferences and role responsibilities
- Personal workflows and saved instructions
- Team-specific procedures and individual AI preferences

Not required for initial launch — architecture reserves the concept.

---

## How layers combine (example)

| Layer | Example |
|-------|---------|
| Platform Knowledge | “DigitalGate’s Automation App supports webhooks.” |
| Business Knowledge | “ABC Plumbing requires every new lead to receive a call within 10 minutes.” |
| Digital Twin | “ABC Plumbing currently has 7 uncontacted leads.” |
| Intelligence | “Lead response is currently below the business target.” |
| **AI Advisor** | “You have seven new leads that haven’t been contacted within your 10-minute target. I’d prioritise these today. You could also create an automation that alerts the assigned salesperson when a new lead arrives.” |

That combination is more powerful than giving an AI access to a single undifferentiated document pile.

---

## Sidebar (locked)

### DigitalGate staff

```
DIGITALGATE · Platform Operator
  …operator apps…
  Platform Docs

PLATFORM
  Apps · Marketplace · Network · Settings (Billing · Connectors · API · Audit Log)
```

### Customer

```
INTELLIGENCE
  AI Advisor · Digital Twin · Business Brain · Business Health · Benchmarks · Insights · Reports
```

Business Knowledge is **inside** Business Brain — not a top-level “Platform Docs” entry.

---

## Implementation

| Concern | Location |
|---------|----------|
| Platform Docs catalogue | `packages/platform-core/src/command-centre/platform-docs.ts` |
| Platform Intelligence RAG | `docs/ai/PLATFORM-INTELLIGENCE.md` |
| Business Knowledge metadata | `packages/platform-core/src/brain/knowledge-layers.ts` |
| Staff nav | `packages/platform-core/src/apps/navigation.ts` |
| Customer nav filter | `packages/platform-core/src/access/nav-filter.ts` |
