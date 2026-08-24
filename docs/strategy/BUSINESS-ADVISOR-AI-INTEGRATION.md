# DigitalGate — AI integration lock (Advisor decision)

**Audience:** Product / engineering / Founding operating rhythm  
**From:** Ben (Platform Architect) · External Business Advisor recommendation **adopted**  
**Date:** 24 August 2026  
**Status:** **Locked** — strategic product milestone, not a feature-completion exercise  
**Canon:** [AI-ARCHITECTURE.md](../ai/AI-ARCHITECTURE.md) · [AI-GOVERNANCE.md](../foundations/AI-GOVERNANCE.md) · [INTELLIGENT-LAYER.md](../foundations/INTELLIGENT-LAYER.md)

---

## Verdict (locked)

DigitalGate is an **AI-native Business Operating Platform**, not an “AI platform.”

**Do not** treat “complete AI integration” as wallpapering chat onto every screen.  
**Do** finish the operating loop:

```
KNOW → UNDERSTAND → ADVISE → ACT → RECORD → LEARN
```

**Next 30 days capacity split (locked):**

| Share | Focus |
|-------|--------|
| **70%** | **ACT** — tools that turn a recommendation into an outcome |
| **20%** | **Context Builder** — reliable shared context for Advisor / Assist / Industry |
| **10%** | **ASK** — only enough to keep recommendations grounded |

> A mediocre recommendation that can **safely execute** is commercially more valuable than a brilliant answer that does nothing.

**Slogan:** Don’t build more AI. **Finish the AI loop.**

---

## Intelligence hierarchy (do not add concepts)

| Layer | Role |
|-------|------|
| **Digital Twin** | What DigitalGate **knows** |
| **Business Brain** | What DigitalGate **understands** |
| **Business Health** | How the business is **performing** |
| **Insights** | What DigitalGate **notices** |
| **AI Advisor** | What the business **should do** |
| **Tools** | How DigitalGate **acts** |
| **Audit** | What **actually happened** |
| **Learning** | What DigitalGate **learns** from the outcome |

No new intelligence brands. These are enough.

---

## Where intelligence belongs

Put AI where a **decision** is being made — not an AI button on every page.

**Pattern (CRM example):**

```
Opportunity stalled
  → Insight: no contact for 8 days
  → Advisor: follow up today
  → Act: draft follow-up → approve → send
  → Learn: outcome on opportunity timeline
```

Same pattern for Overview / Command Centre “three things today,” Prospecting (“who to speak to next”), and Documents (“prepare agency agreement…”).

---

## Definition of done (redefined)

**Do not promise:** “AI is fully integrated across DigitalGate.”

**Internal / Founding 10 promise:**

> Every Founding 10 organisation should experience the core **Brain → Advisor → Action** loop.

**Operator proof (DigitalGate first):**

Open platform → see what matters → ask why → grounded recommendation → approve → DigitalGate executes → result recorded on the timeline.

Then: DigitalGate org → one founding customer → another → DG / RE / Finance / Services — **one** AI Service, no separate AI systems.

---

## Trust ladder (no autonomous agents yet)

| Level | Behaviour |
|-------|-----------|
| **1 Recommend** | “I think you should follow up.” |
| **2 Prepare** | “I’ve prepared the follow-up.” |
| **3 Approve** | “Send it?” |
| **4 Execute** | “Done.” |
| **5 Governed automation** | Org has authorised this task type to run automatically |

**Firm bans for now:** autonomous SDR · autonomous CRM modification · autonomous client email · autonomous legal/document decisions · autonomous financial decisions.

---

## Context Builder (architectural insist)

One hub — callers must not each invent custom prompt stacks:

```
                    BUSINESS BRAIN
                          │
                    CONTEXT BUILDER
                          │
               ┌──────────┼──────────┐
               ↓          ↓          ↓
            Advisor     Assist     Industry
               │          │          │
               └──────────┼──────────┘
                          ↓
                    MODEL ROUTER
                          ↓
                   DIGITALGATE TOOLS
                          ↓
                     AUDIT / EVENTS
                          ↓
                  TWIN / BRAIN UPDATE
```

Context package (minimum): Profile · Goals · Contacts · Opportunities · Tasks · Activities · Business Health · relevant app data · Business Knowledge.

---

## Demo priorities (operating workflows)

| Surface | Killer line | Next AI step |
|---------|-------------|--------------|
| **Prospecting** | “Who should you speak to next?” | Why this prospect → what to say → prepare follow-up |
| **Documents & Signing** | Core Document Engine; AI on top | Prepare from template → CRM populate → approve → sign → store → update Opportunity |
| **Advisor daily** | “Three things to do today” | Why → Do it → timeline |

Documents are **not** an “AI project” — Core Documents & Signing; AI prepares and drives workflow. See [DOCUMENTS-AND-SIGNING.md](../foundations/DOCUMENTS-AND-SIGNING.md) · [PROSPECTING-ENGINE.md](../foundations/PROSPECTING-ENGINE.md).

---

## Commercial principles (locked)

1. Customers buy **DigitalGate capability**, not tokens or models. Model Router is internal infrastructure.  
2. Customer experiences **DigitalGate Intelligence** — not OpenAI / Anthropic / Sol / Gateway.  
3. Founding 10: include a sensible floor of Brain · Advisor · Assist · recommendations · basic generation — **do not** meter every micro-action yet.  
4. Monetise later (once usage is observed): **AI Communications** (voice, call/outbound agents, large-scale generation) and optionally **Advanced Intelligence** (deeper prospect/document analysis, higher usage).

---

## ACT backlog (70% — next major milestone)

Permission-gated tools (human approve by default):

- Create / assign task  
- Update opportunity stage  
- Schedule follow-up  
- Create contact / opportunity  
- Trigger **approved** automation  
- Draft communication  
- Eventually: send **approved** communication  

---

## Founding 10 learning goals

By customer #10, know:

- Which recommendations are useful vs ignored  
- Which actions customers trust AI to perform  
- Where context is missing  
- Which tools need approval  
- Which AI functions create commercial value  
- How much AI usage costs DigitalGate  

That is what Founding 10 is for.

---

## Live baseline (unchanged facts)

Model Router live (Gateway + failover). Advisor Ask + Assist + thin tool/ledger path exist. Honesty floor / template fallback remain. Support chat ≠ Advisor.

---

## Bottom line

Infrastructure is sufficient to stop “building more AI.”  
The milestone is: **see → why → recommend → approve → execute → record → learn** — beautifully — for DigitalGate and the Founding 10.

That is the beginning of: *a connected business with a brain that can help run it.*
