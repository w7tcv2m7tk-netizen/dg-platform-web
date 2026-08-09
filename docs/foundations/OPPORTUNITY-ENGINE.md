# Opportunity Engine™

**Core Command Centre capability — “Who should I speak to today?”**

**Version:** 0.1  
**Last updated:** August 2026  
**Status:** V1 Daily Briefing shipped (honest signals only)  
**Parent:** [GROWTH-ENGINE.md](../GROWTH-ENGINE.md) · [BUSINESS-DISCOVERY.md](./BUSINESS-DISCOVERY.md)

---

## Naming

| Layer | Name |
|-------|------|
| Capability | **Opportunity Engine™** |
| Morning UX | **Daily Briefing** (`/command` + `/command/growth-engine`) |
| Parent OS | **Growth Engine™** |
| Verb in copy | Prospecting |

Not a separate App. Not tenant-facing in V1.

---

## Flow

```
Business Discovery
        ↓
Enrichment / presence audit
        ↓
Prospect Opportunity Score
        ↓
Daily Briefing (ranked actions)
        ↓
Pipeline → Outreach → Meeting → Proposal → Customer
        ↓
(Outcomes → weight tuning — future)
```

Discovery answers **who can I find?**  
Opportunity Engine answers **who should I speak to today?**

---

## Prospect Opportunity Score (V1)

Weighted from **observable** Growth Engine fields only:

| Component | Weight (approx) | Signals |
|-----------|-----------------|---------|
| Digital gap | 0–35 | Audit health / SEO / AI / website (lower = higher opportunity) |
| Intent / urgency | 0–30 | Stage, idle days, report views |
| Reachability | 0–15 | Website, phone, email on file |
| Industry fit | 0–10 | Discovery pack / industry |
| Reputation | 0–10 | Import rating when present |

**Bands:** Very high (≥90) · High (≥80) · Medium (≥70) · Low (&lt;70)

**Recommended actions (deterministic):**

| Condition | Action |
|-----------|--------|
| No audit | Run audit |
| Audit, no report | Send audit |
| Report sent, idle | Follow up |
| Report viewed | Call + email |
| Proposal / meeting | Close the loop |

### Explicitly OUT of V1 score

- GBP depth / competitor outperformance / tech-stack detection  
- ML close-probability  
- Invented **Today’s opportunity $MRR** (open proposal $ only when `proposal_sent` engagement carries real `totalCents`)  
- Autonomous email / SMS / LinkedIn send  

---

## Daily Briefing UX

- Greeting + “N prospects recommended today”  
- Counters: recommended · contacted today · conversations · meetings  
- Priority #1 card (reasons + approach + CTAs)  
- Ranked table: Rank / Business / Opportunity / Score / Action  

Command home shows a compact **Today’s Prospecting** strip linking into Growth Engine.

---

## Prospecting modes (Discovery)

| Mode | Behaviour (V1) |
|------|----------------|
| Daily Recommended | → Growth Engine Daily Briefing |
| Location Search | Preset location + radius search |
| Industry Search | Preset industry / type search |
| Problem Search | Filter book: weak SEO from latest audit |
| AI Visibility Search | Filter book: weak AI Visibility |
| High-Value Prospects | Filter book: `proposal_sent` |
| Hot Prospects | Planned — needs buying-signal sources |

---

## Code

- `packages/platform-core/src/command-centre/growth-engine/opportunity-engine.ts`  
- Sales Assistant v0 is a thin compatibility wrapper over the same scorer  

---

## Roadmap (next)

- Richer score breakdown UI (Visibility / Conversion / Reputation axes)  
- Outcome-learning weight tuning  
- Hot / buying-signal mode  
- Staff reminder + outreach assist (still human-gated, not AI SDR)  

---

## Related

- [GROWTH-ENGINE.md](../GROWTH-ENGINE.md)  
- [BUSINESS-DISCOVERY.md](./BUSINESS-DISCOVERY.md)  
- [COMMAND-CENTRE-BETA.md](../COMMAND-CENTRE-BETA.md)
