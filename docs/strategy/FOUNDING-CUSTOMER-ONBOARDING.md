# Founding Customer Onboarding

**Status:** P0 commercial workflow · 19 August 2026  
**Audience:** Ben + staff implementing the first Founding 10 customers  
**Related:** [COMMERCIAL-ENGINE.md](./COMMERCIAL-ENGINE.md) · [FOUNDING-COHORTS.md](./FOUNDING-COHORTS.md)

The Founding application **qualifies** the business. Onboarding **configures** the business.

```
APPLICATION → DISCOVERY → ACCEPTED → AGREEMENT → ONBOARDING → CONFIGURATION → IMPLEMENTATION → GO LIVE → 30-DAY SUCCESS
```

Do **not** wire the retired public 12-section form at `digitalgate.com.au/onboarding/`. That URL now explains the Gen 2 path.

## Surfaces

| Step | Where |
|------|--------|
| Apply | `https://digitalgate.com.au/founding-customers/` |
| Staff pipeline | `/command/founding` and CRM opportunity |
| Accept / emails | Opportunity → Accept & send welcome |
| Agreement | `/founding/agreement` (signed-in) |
| Guided onboarding | `/onboarding` (Founding journey) |
| Implementation plan | `/implementation` |
| Live platform | `/dashboard` |

Setup link in the acceptance email: `/founding/setup?invite=…` (agreement first, then onboarding).

## Staff actions

On a Founding 10 opportunity:

1. **Accept & send welcome** — CRM stage `accepted`, acceptance email, invite token, next-action task.
2. **Send agreement** — legal stays separate from the wizard.
3. **Mark signed + invite onboarding** — or the customer confirms terms themselves.
4. Advance remaining stages as configuration and go-live actually happen.

Every stage has a next action (task on the opportunity).

## Customer onboarding

Progressive 12-step wizard (save and return). Submission:

- Writes Business Profile + Goals
- Creates an implementation record
- Generates implementation tasks and the 30-day success journey
- Emails the setup plan
- Moves the Founding opportunity to `onboarding_complete` → `configuration`

## Honesty

This is not e-sign, not OAuth-complete for every connector, and not a ServiceM8-class implementation desk. It is the machine you run for every Founding 10 customer so acceptance is not email-only.
