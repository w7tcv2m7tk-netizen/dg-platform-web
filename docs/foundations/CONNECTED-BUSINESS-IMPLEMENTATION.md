# Connected Business & Business Brain — Implementation Brief

**Status:** Locked · Platform Architect (Ben) · August 2026  
**Narrative lock:** [CONNECTED-BUSINESS.md](./CONNECTED-BUSINESS.md)  
**Body education (selective):** [BUSINESS-BODY.md](./BUSINESS-BODY.md)  
**Product UX:** [OPERATOR-EXPERIENCE.md](./OPERATOR-EXPERIENCE.md) · [SIDEBAR-NAVIGATION.md](./SIDEBAR-NAVIGATION.md)

---

## Purpose

Ship the positioning:

> **Connect your business. Give it a brain.**

Most businesses have disconnected digital systems. The owner is forced to act as the “brain.” DigitalGate connects those systems into one operating platform and, through Twin, Business Knowledge, AI and Automation, begins giving the business its own intelligence.

**Not** a novelty body-parts product. Body analogy is **selective education** only. Customer experience stays clean, modern, sophisticated.

---

## Positioning hierarchy (locked)

| Layer | Concept |
|-------|---------|
| Primary | **Connected Business** — parts into one operating system |
| Intelligence | **Business Brain™** — context + Twin + knowledge + goals + AI → understand & next actions |
| Transformation | Disconnected → Connected → Intelligent (→ Autonomous) |

Supporting copy and competitor contrast: [CONNECTED-BUSINESS.md](./CONNECTED-BUSINESS.md).

**Role stack (product language):**

| Concept | Role |
|---------|------|
| DigitalGate | AI-powered Business Operating Platform |
| Digital Twin | See the business as one connected system |
| Business Brain | Understand the business and what it needs next |
| AI Advisor | Turn context into decisions |
| Automation | Turn decisions into action |
| Command Centre | See what matters and act |
| Business Health | Measure how healthy the business is |

```
Business Brain = understands
Business Health = measures
Command Centre = prioritises
AI Advisor = explains
Automation = acts
```

---

## Knowledge architecture (locked)

| Layer | Meaning |
|-------|---------|
| **Platform Knowledge** | DigitalGate docs, capabilities, policies, implementation, troubleshooting |
| **Business Knowledge** | Customer plans, SOPs, brand, pricing, internal docs |
| **Live Business Context** | Contacts, opportunities, website, revenue, tasks, reviews, analytics |
| **External Intelligence** | Industry/market/search/AI visibility/connectors |

Business Brain reasons across layers with **permissions** and **source attribution**. Never expose vector/RAG/embeddings to operators.

Metadata (every source): organisationId · source type · access level · owner · permissions · created/updated · reference · indexing status.

---

## Architecture principle

**Do not build Business Brain as an isolated App.** It is an intelligence layer:

```
Universal Objects → Connected data → Twin → Business Knowledge
  → Business Brain → AI / Intelligence → Decisions → Automation / Actions
  → Outcomes → Twin (learn)
```

---

## Ship priority

### P0 — Immediate

- [x] Business Brain under Intelligence nav  
- [x] `/dashboard/brain` route  
- [x] Business Brain screen answers: *What does DigitalGate know about my business?* (readiness, dimensions, connected context, missing context)  
- [x] Knowledge layer types in platform-core  
- [x] Narrative on marketing: homepage section, `/business-brain/`, Featured Insight (+ social series draft)  
- [x] Surface Brain context cues in Advisor / Command Centre (progressive)  
- [ ] Permission-aware knowledge store (org/user) — metadata contract landed; storage/indexing is P1  

### P1

Business knowledge upload · document indexing · source attribution · AI context retrieval · Twin ↔ Brain integration · richer missing-context recommendations  

### P2

Cross-platform / industry intelligence · predictive recommendations · AI Actions · autonomous workflow suggestions · continuous learning  

---

## Marketing surfaces

| Surface | Intent |
|---------|--------|
| Homepage section after Digital Twin | Connected business → then give it a brain · flywheel |
| `/business-brain/` | Full narrative (disconnected → connect → Twin → Brain → think → act → learn) · selective body map |
| Featured Insight | *From Dumb Businesses to Smart Businesses* |
| Social series (8 posts) | Narrative campaign — not a one-shot |
| Brand video (later) | 60–90s CONNECT → UNDERSTAND → THINK → ACT → GROW |

Visual: premium **connected-nodes → central intelligence** — never cartoon organs.

---

## UX hierarchy (every Intelligence surface)

1. What matters now?  
2. Why?  
3. What should I do?  
4. Show me the detail.  
5. Let me access the underlying system.
