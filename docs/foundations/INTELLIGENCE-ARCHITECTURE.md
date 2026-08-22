# Intelligence Architecture

**Status:** Locked · August 2026  
**Related:** [OPERATOR-OS.md](./OPERATOR-OS.md) · [SIDEBAR-NAVIGATION.md](./SIDEBAR-NAVIGATION.md) · [COMMAND-CENTRE.md](../COMMAND-CENTRE.md)

---

## Principle

Each Intelligence surface answers **one question**. Reports are an **output** of the intelligence system — not a step in the reasoning chain before Command Centre.

Analytics is a **related evidence surface** — not part of the Intelligence hierarchy.

---

## Reasoning chain

```
DIGITAL TWIN
What does DigitalGate currently know?
The live state of the business.

        ↓

BUSINESS BRAIN
What does DigitalGate understand about the business?
Strategy, goals, knowledge, documents, context and business rules.

        ↓

INTELLIGENCE
┌──────────────┬──────────────┬──────────────┐
│ Health       │ Benchmarks   │ Insights     │
│ How healthy? │ How compare? │ What changed?│
└──────────────┴──────────────┴──────────────┘
                    ↓
               AI ADVISOR
        What should the business do?
                    ↓
          RECOMMENDED ACTIONS
        What matters most right now?
                    ↓
             COMMAND CENTRE
        What needs to happen next?
```

**Separation:**

| Surface | Role | Question |
|---------|------|----------|
| AI Advisor | Reasoning | What should I do? |
| Recommended Actions | Prioritisation | What matters most? |
| Command Centre | Execution | What needs to happen now? |

Customer UI should not expose LLM vs deterministic implementation details. Behind the scenes: Business Brain → Context Builder → AI Service → Model Router → Tools → Permission checks → Audit trail, with deterministic fallbacks where appropriate.
---

## Output layer (branch)

```
                    ↘
                  REPORTS
What needs to be communicated or exported?
Formal outputs generated from the intelligence layer.
```

Reports = presentation / export. Primary action: **View Report →**  
Secondary: Open Analytics → · Ask AI Advisor →  
Future: Download PDF · Share Report · Schedule Report

---

## Related surface (outside hierarchy)

| Surface | Question | Route |
|---------|----------|-------|
| **Analytics** | What do the numbers show? | `/apps/analytics` |

Explore the underlying performance data behind DigitalGate intelligence — distinct from finished Reports output.

---

## Surface reference

| Surface | Question |
|---------|----------|
| Digital Twin | What does DigitalGate currently know? |
| Business Brain | What does DigitalGate understand about the business? |
| Business Health | How healthy is the business? |
| Benchmarks | How does the business compare? |
| Insights | What is DigitalGate noticing? |
| AI Advisor | What should the business do? |
| Recommended Actions | What matters most right now? |
| Command Centre | What needs to happen next? |
| Reports | What needs to be communicated or exported? |
| Analytics | What do the numbers show? |

**Code:** `src/components/intelligence/intelligence-model.ts` · `IntelligenceFlow.tsx` · `IntelligenceHierarchy.tsx`
