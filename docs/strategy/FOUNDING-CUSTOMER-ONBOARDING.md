# Founding Customer Onboarding

**Status:** P0 commercial workflow · 19 August 2026  
**Audience:** Ben + staff implementing the first Founding 10 customers  
**Related:** [COMMERCIAL-ENGINE.md](./COMMERCIAL-ENGINE.md) · [FOUNDING-COHORTS.md](./FOUNDING-COHORTS.md)

The Founding application **qualifies** the business. Onboarding **configures** the business. A personal invitation is a second entry into the **same** Founding 10 cohort — not a separate programme.

```
PUBLIC APPLICATION → DISCOVERY → ACCEPTED → AGREEMENT → ONBOARDING → …
PERSONAL INVITATION → CONSULTATION → ACCEPTED → AGREEMENT → ONBOARDING → …
```

Do **not** wire the retired public 12-section form at `digitalgate.com.au/onboarding/`. That URL now explains the Gen 2 path.

## Two ways in

1. **Public application** — `/founding-customers/` → review → consult → accept/reject.
2. **Direct invitation** — conversation first → CRM **Invite to Founding 10** → personal email → they accept the invitation → consultation → you accept them into the 10.

Inviting someone does **not** count as a seat. `Founding 10: 7 / 10` only includes opportunities at `accepted` or later. Command Centre shows Invited / Accepted / Remaining.

## Surfaces

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

Setup link in the acceptance email: `/founding/setup?invite=…` (agreement first, then Gen 2 onboarding).

**Commercial lock:** standard published pricing + annual months-equivalent saving + 14-day Stripe trial. No Founding % discount. Command Centre shows **Start Onboarding** from Accepted / Agreement signed / Onboarding stages.

## Staff actions

On a Founding 10 opportunity:

1. **Invite to Founding 10** (optional) — from a CRM contact or Command. Creates an invitation record. Send / resend / copy link / withdraw. They are not yet one of the 10.
2. **Accept & send welcome** — CRM stage `accepted`, acceptance email, invite token, next-action task. **This** is a seat.
3. **Send agreement** — legal stays separate from the wizard.
4. **Mark signed + invite onboarding** — or the customer confirms terms themselves.
5. Advance remaining stages as configuration and go-live actually happen.

Every stage has a next action (task on the opportunity).

## Customer onboarding

Progressive 12-step wizard (save and return). Submission:

- Writes Business Profile + Goals
- Creates an implementation record
- Generates implementation tasks and the 30-day success journey
- Emails the setup plan
- Moves the Founding opportunity to `onboarding_complete` → `configuration`
- Optionally overlays an LLM implementation recommendation (Gateway `openai/gpt-5.6-sol` when keyed). Submit **never** waits on a working model — the rule-based plan is the floor.

## Honesty

This is not e-sign, not OAuth-complete for every connector, and not a ServiceM8-class implementation desk. It is the machine you run for every Founding 10 customer so acceptance is not email-only.
