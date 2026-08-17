# Business Discovery — Prospect Opportunity Score Spec

**Status:** Spec for P1 implementation (Aug 2026)  
**Principle:** DigitalGate prioritises — humans decide. Not an autonomous AI SDR.

---

## Purpose

Rank prospects so the CEO opens DigitalGate each morning and knows **who deserves attention and why**.

A boutique RE agency with commercial potential and weak digital presence should outrank a tiny business with a terrible website but no commercial value.

---

## Target model

```
Opportunity Score = Fit × Need × Reachability × Commercial × Weakness
```

Each factor is **normalised 0.0–1.0**. Final score = product × 100 (0–100 scale).

**Why multiplicative:** One zero factor (e.g. no fit, unreachable) should collapse the score. Additive models let bad-fit prospects rank too high.

---

## Factor definitions

### 1. Fit (0–1)

*Would we want this business as a Founding Customer?*

| Signal | Weight | Notes |
|--------|--------|-------|
| Industry pack match | High | RE, accommodation, prof services packs in `industry-packs.ts` |
| Geography | High | Southern Gold Coast RE = 1.0; outside ICP = decay |
| Business type | Medium | Agency vs sole trader |
| Employee band | Medium | Types exist (`minEmployees`/`maxEmployees`) — **not yet used** |
| Active Google presence | Low | Rating + review count = operating business |

**RE ICP example:** 5–15 staff, sales agency, Gold Coast / Tweed, active GBP.

**Default when unknown:** 0.5 (neutral — requires manual review)

### 2. Need (0–1)

*Does this business have a problem DigitalGate solves?*

| Signal | Weight | Notes |
|--------|--------|-------|
| Digital gap severity | High | Inverse audit scores (website, SEO, AI visibility) |
| No conversion mechanism | Medium | Probe: forms, booking, clear CTA |
| Fragmented stack signals | Low | WordPress + third-party CRM hints in HTML |
| Pipeline stage intent | Medium | `report_viewed` > `prospect` (post-import) |

**Default pre-audit:** 0.4 (assume moderate need until audit runs)

### 3. Reachability (0–1)

*Can we actually start a conversation?*

| Signal | Points |
|--------|--------|
| Phone (Places) | +0.35 |
| Website (contact path) | +0.25 |
| Email (known) | +0.25 |
| Decision-maker identifiable | +0.15 |

**Current gap:** Email rarely captured from providers. ABN records lack phone/website merge post-import.

**Cap at 1.0.**

### 4. Commercial (0–1)

*Is the deal worth pursuing?*

| Signal | Weight | Notes |
|--------|--------|-------|
| Industry ACV potential | High | RE agency >> sole tradie |
| Platform + Apps attach | Medium | RE + Growth Apps vs Starter only |
| Employee / scale proxy | Medium | Staff count when available |
| Proposal pipeline value | Low | Existing `proposalPipelineCents` on prospect |

**Current gap:** Not in scoring today. **P1 add.**

**RE default:** 0.7 · **Accommodation:** 0.6 · **Unknown SME:** 0.4

### 5. Weakness (0–1)

*How broken is their digital operating layer?*

| Signal | Weight | Notes |
|--------|--------|-------|
| Low Business Health Score | High | From presence audit |
| Weak AI visibility | Medium | Pillar score |
| Weak SEO / website health | Medium | Pillar scores |
| Good reputation + weak site | Bonus | “Fixable with high trust” pattern |

**Not:** “worst website = best prospect” alone. Weakness is multiplied by Fit and Commercial.

---

## Score bands

| Score | Band | Recommended action |
|-------|------|-------------------|
| ≥ 80 | very_high | Call today + personalised audit outreach |
| ≥ 65 | high | Send audit / follow up within 24h |
| ≥ 50 | medium | Queue for Daily Recommended |
| < 50 | low | Hold — manual review only |

Actions map to existing `recommendedAction` in `opportunity-engine.ts`.

---

## Discovery workflow (deliberate)

```
Step 1 — Find     Search (Places + ABN + industry + location + radius)
Step 2 — Enrich   Website, phone, rating, industry pack, fit hints
Step 3 — Audit    Run Business Audit (optional on import: runAudit=true)
Step 4 — Score    computeProspectOpportunityScore (v2 multiplicative)
Step 5 — Act      Daily Recommended → human outreach
```

**Rule:** Discovery candidates stay **outside CRM** until intentional import via `/api/v1/command/growth/discovery/import`.

---

## Current implementation vs spec

**Today:** `packages/platform-core/src/command-centre/growth-engine/opportunity-engine.ts`

Additive model (max 100):

| Component | Max pts |
|-----------|---------|
| Digital gap | 35 |
| Intent / urgency | 30 |
| Reachability | 15 |
| Industry fit | 10 |
| Reputation signal | 10 |

**Migration path (P1):**

1. Add `computeProspectFactors()` returning `{ fit, need, reachability, commercial, weakness }`.
2. Store factors on `GrowthProspect.metadata.scoreFactors` for transparency (“why this rank”).
3. Switch `computeProspectOpportunityScore` to multiplicative with additive fallback when any factor missing.
4. Add discovery-time **preview score** (Fit × Reachability × Commercial only) before import.
5. Tune from won/lost outcomes (`growth.opportunity_learning` roadmap item).

---

## Daily Recommended

**Engine:** `getDailyOpportunityBriefing({ limit: 20 })`  
**UI:** `/command/growth-engine`

Morning queue = top N active prospects by score, with:

- Rank
- Business name
- Score + band
- Top 2–3 reasons (from factor breakdown)
- Recommended action

**Related:** Smart Follow-Up (`/command/growth-engine/follow-ups`) — idle ≥5 days, not score-ranked.

---

## Pipeline stages (sales machine)

Align Discovery imports to Founding 10 pipeline:

```
PROSPECT          → imported from Discovery
AUDIT CREATED     → audit run
AUDIT SENT        → report delivered (email confirmed)
ENGAGED           → opened / clicked / replied
CONTACTED         → personal outreach logged
DISCOVERY         → conversation booked
QUALIFIED         → commercial fit confirmed
PROPOSAL          → Founding offer presented
WON               → Founding Customer accepted
ONBOARDING        → implementation
LIVE              → operating on DigitalGate
SUCCESS           → outcome documented
REFERRAL          → introduces others
```

Map to existing `GrowthProspect.stage` values — extend labels where needed, don't duplicate CRM Opportunity until qualified.

---

## First 100 prospects (CEO list)

**Do not search 10,000.** Curate 100:

1. **50** — Southern Gold Coast RE (Roe story)
2. **25** — Accommodation / hospitality (CVH story)
3. **25** — Professional services / high-value SMEs

Manually inspect top 10 before outreach. Reject if you wouldn't want them as Founding Customer.

**Example RE candidates (from Discovery):** Ray White Tugun, McGrath Palm Beach, Harcourts Aspire, LJ Hooker Coolangatta/Tweed, etc.

---

## Anti-patterns

| Don't | Do |
|-------|-----|
| Autonomous AI SDR | Prioritised queue + human judgement |
| Blast audits to 20 businesses | Curate 10–15; personalise |
| Rank by worst website only | Fit × Commercial × Weakness |
| Import everything to CRM | Import intentional targets only |
| Build Founding 100 infra now | Prove Founding 10 first |

---

## Related

- [FOUNDING-10-ACQUISITION.md](./FOUNDING-10-ACQUISITION.md)
- [BUSINESS-DISCOVERY.md](../foundations/BUSINESS-DISCOVERY.md)
- [OPPORTUNITY-ENGINE.md](../foundations/OPPORTUNITY-ENGINE.md)
- [GROWTH-ENGINE.md](../GROWTH-ENGINE.md)
