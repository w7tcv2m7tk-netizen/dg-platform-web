# Founding Customer Onboarding

**Status:** P0 commercial workflow · 19 August 2026  
**Audience:** Ben + staff implementing the first Founding 10 customers  
**Related:** [COMMERCIAL-ENGINE.md](./COMMERCIAL-ENGINE.md) · [FOUNDING-COHORTS.md](./FOUNDING-COHORTS.md)

Founding 10 is an **invitation-only** early-customer cohort. A private invitation identifies the customer; in-product Founding terms acceptance and the standard onboarding engine configure the business. It is not a separate public application funnel.

```\nPRIVATE INVITATION → FOUNDING TERMS ACCEPTANCE → ONBOARDING → 14-DAY TRIAL → PLATFORM\n```

Do **not** recreate a public Founding application or a separate manual agreement gate. Public customers use the standard self-serve signup path; invited Founding 10 customers use their private invitation and then the same onboarding/trial engine.

## Entry\n\n**Private invitation only** — DigitalGate issues the Founding 10 invitation. The customer accepts the current Founding terms in-product and continues into onboarding. There is no active Founding 100/1,000 cohort and no public Founding application funnel.\n\n## Surfaces

| Step | Where |
|------|--------|
| Apply | `https://digitalgate.com.au/founding-customers/` |
| Personal invite | `https://digitalgate.com.au/founding-customers/invite/[token]` |
| Staff pipeline | `/command/founding` and CRM opportunity / contact |
| Accept / emails | Opportunity → Accept & send welcome |
| Agreement | `/founding/agreement` (signed-in) |
| Guided onboarding | `/onboarding` — **Gen 2 progressive wizard** (Welcome → Identity → Profile → Goals → Plan → Apps → Monthly/Annual → Stripe 14-day trial → Connect → Checklist → Implementation) |
| Implementation plan | `/implementation` |
| Live platform | `/dashboard` (persistent getting-started checklist until complete) |

The private invitation carries the customer into Founding terms acceptance and then the standard onboarding engine. A separate emailed agreement or manual signature is not required unless an assisted commercial process is expressly agreed.

**Commercial lock:** standard published pricing + annual months-equivalent saving + 14-day Stripe trial. No Founding % discount. Command Centre shows **Start Onboarding** from Accepted / Agreement signed / Onboarding stages.

## Staff actions\n\nFor a Founding 10 customer:\n\n1. **Issue the private invitation** to an approved Founding customer.\n2. **Customer accepts Founding terms in-product**; record the accepting identity, organisation, time and applicable terms version.\n3. **Continue into onboarding** using the standard plan, Apps, support and 14-day trial engine.\n4. Track implementation and go-live in Command/CRM as the customer progresses.\n\nDo not require a discovery call, separate emailed agreement, manual signature or second onboarding invitation unless DigitalGate and the customer expressly choose an assisted commercial process.\n\n## Customer onboarding

Progressive 12-step wizard (save and return). Submission:

- Writes Business Profile + Goals
- Creates an implementation record
- Generates implementation tasks and the 30-day success journey
- Emails the setup plan
- Moves the Founding opportunity to `onboarding_complete` → `configuration`
- Optionally overlays an LLM implementation recommendation (Gateway `openai/gpt-5.6-sol` when keyed). Submit **never** waits on a working model — the rule-based plan is the floor.

## Honesty

This is not e-sign, not OAuth-complete for every connector, and not a ServiceM8-class implementation desk. It is the machine you run for every Founding 10 customer so acceptance is not email-only.
