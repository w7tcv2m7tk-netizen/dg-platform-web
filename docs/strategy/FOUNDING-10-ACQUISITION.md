# Founding 10 — Acquisition Operating Lock

**Status:** Active (Aug 2026)  
**Objective (30 days):** Get the first 10 suitable businesses operating successfully on DigitalGate, document results, use evidence to sell Founding 100.

**Not in scope:** More Apps, bigger website, speculative AI features, Founding 100 infrastructure.

---

## The four pieces (enough to sell)

| Piece | Role |
|-------|------|
| **DigitalGate Platform** | The product |
| **Business Audit** | Acquisition hook |
| **Business Discovery Engine** | Prospecting engine |
| **Founding Customer Programme** | Commercial offer |

## The operational loop (build this)

```
Find → Audit → Contact → Conversation → Opportunity → Proposal → Close
  → Onboard → Operate → Prove result → Refer
```

**Product principle:** DigitalGate should be used to sell DigitalGate.

---

## Priority classification

| Class | Rule | Examples |
|-------|------|----------|
| **P0** | Prevents selling or operating | Resend deliverability, audit email loop, founder application broken |
| **P1** | Significantly improves selling/onboarding | Discovery scoring, Daily Recommended, pipeline stages |
| **P2** | Nice improvement | Dashboard polish |
| **Later** | Product expansion | New Industry Apps, autonomous AI SDR |

---

## Developer priorities (in order)

### 1. P0 — Resend deliverability

- Branded transactional email must **arrive** (not just “sent”).
- Verified sending domain: **`mail.digitalgate.com.au`** (`hello@mail.digitalgate.com.au`).
- Reply-To: human inbox (`hello@digitalgate.com.au`).
- Run: `node scripts/diagnose-resend-domains.mjs`
- Docs: [EMAIL-INFRASTRUCTURE.md](../foundations/EMAIL-INFRASTRUCTURE.md)

**Acceptance test (CEO runs manually):**

| Step | Pass criteria |
|------|---------------|
| Submit audit | Form completes at `audit.digitalgate.com.au` |
| Report generated | Score + opportunities returned |
| Email delivered | Inbox (not spam) on Gmail, Outlook, external domain |
| CTA works | Strategy session link loads |
| Lead captured | Lead + Contact in CRM |
| Admin notify | `DG_BUSINESS_AUDIT_ADMIN_EMAIL` receives alert |

Test with: DigitalGate, Roe Realty branding context, Gmail, Outlook, one external domain.

**Code fixes (P0):**

- `auditSent` only true when Resend returns `status: "sent"` (not `queued` on failure).
- Follow-up sequence gated on confirmed email 1 delivery.
- Admin notify includes send error when delivery fails.

### 2. P0 — Stage 1 advisor evidence

See [ADVISOR-EVIDENCE-STAGE-1.md](./ADVISOR-EVIDENCE-STAGE-1.md).

- Customer-shell walkthrough / 18-path capture
- Roe vendor-lead workflow recording
- Export 10–20 live Opportunities
- Complete Stage 1 pack

### 3. P0/P1 — Business Audit acquisition loop

**Flow:**

```
audit.digitalgate.com.au → probe → submit → Contact + Lead
  → presence audit → email 1 (report) → follow-ups 2–5 (cron)
  → CTA: digitalgate.com.au/strategy-session
```

**Key files:**

- `packages/platform-core/src/marketing/public-business-audit.ts`
- `packages/platform-core/src/marketing/business-audit-emails.ts`
- `src/app/api/public/business-audit/route.ts`
- `src/components/websites/BusinessAuditCapture.tsx`
- Cron: `src/app/api/cron/lead-followups/route.ts` (daily 08:00 UTC)

**Gaps (not P0 blockers for Day 1 test):**

- No auto Opportunity creation from audit lead
- Embedded audit widget missing honeypot
- Contact create failure is silent

### 4. P1 — Business Discovery Engine

See [DISCOVERY-SCORING-SPEC.md](./DISCOVERY-SCORING-SPEC.md).

- Keep Discovery **separate from CRM** until intentional import
- Google Places + ABN enrichment
- Prospect Opportunity Score (human decides, system prioritises)
- Daily Recommended queue
- Audit → Send → Propose → Pipeline workflow

**UI:** `/command/growth-engine/discovery`  
**Docs:** [BUSINESS-DISCOVERY.md](../foundations/BUSINESS-DISCOVERY.md)

### 5. P1 — Founding 10 pipeline

Growth prospect stages (already in platform):

`prospect` → `audit_created` → `report_sent` → `email_opened` → `report_viewed`
→ `follow_up_due` → `meeting_booked` → `proposal_sent` → `won` → `onboarding`

**Kanban:** `/command/growth-engine/pipeline`

**Not an AI SDR.** DigitalGate tells you who deserves attention and why. You make the commercial judgement.

---

## CEO — first 7 days

| Day | Action |
|-----|--------|
| 1 | Personally test audit + email + CTA + booking + lead capture |
| 2 | Review top 20 from Discovery → curate 10–15 genuine targets |
| 3 | Run audits on targets; read every report manually |
| 4 | Personalise outreach (not mass spam) |
| 5 | Begin conversations — goal: “Would DG genuinely solve a problem?” |
| 6–7 | Follow up; record objections as product/commercial intelligence |

---

## First prospect list (100 total)

| Segment | Count | Why |
|---------|-------|-----|
| Southern Gold Coast RE agencies | 50 | Roe Realty production proof |
| Accommodation / hospitality | 25 | CVH proof |
| Professional services / high-value SMEs | 25 | Vertical diversity |

**Founding 10 target mix (curated, not first-come):**

- Real Estate: ~4
- Accommodation: ~2
- Professional Services: ~2
- Other SMEs: ~2

---

## Sales conversation (front door)

**Don't say:** “I'd like to sell you DigitalGate.”

**Do say:** “I ran a DigitalGate Business Audit on your business and found areas that may be costing you visibility and enquiries.”

**Funnel:**

```
Prospect → Free Audit → Audit email → Personal follow-up
  → 15–30 min conversation → Diagnosis → Platform proposal → Founding offer
```

---

## Daily Recommended (CEO morning workflow)

Growth hub should answer:

- 3 businesses worth contacting today
- 1 follow-up due
- 2 audits to send
- 1 proposal requiring attention
- 1 existing customer requiring attention

**Surface:** `/command/growth-engine` → Daily recommended table

---

## Progression gates

| Milestone | Requirement |
|-----------|-------------|
| **Founding 10** | 10 customers → 10 implementations → case studies → repeatable onboarding |
| **Founding 100** | Scale proven process (do not build yet) |
| **Founding 1,000** | Ecosystem (later) |

---

## Related docs

- [CEO-PLAN-2026-08-17.md](./CEO-PLAN-2026-08-17.md) — Email P0 → Stage 1 gates
- [FOUNDING-COHORTS.md](./FOUNDING-COHORTS.md) — Commercial architecture
- [DISCOVERY-SCORING-SPEC.md](./DISCOVERY-SCORING-SPEC.md) — Scoring model
- [ADVISOR-EVIDENCE-STAGE-1.md](./ADVISOR-EVIDENCE-STAGE-1.md) — Evidence pack
