# Customer Success (Built Into Product)

**Most platforms stop at support. DigitalGate embeds success in the product.**

Customer success metrics feed the **customer dashboard** (simple) and **Command Centre** (operational). Same data pipeline.

---

## Success metrics

| Metric | Definition | Surface |
|--------|------------|---------|
| **DigitalGate Success Score™** | Composite health 0–100 | Customer + Command Centre |
| **Adoption score** | % of licensed features used in 30 days | Command Centre |
| **Onboarding progress** | Checklist completion % | Customer dashboard |
| **Platform usage** | DAU/WAU, sessions, key actions | Command Centre |
| **Feature usage** | Per-App, per-feature event counts | Command Centre |
| **Time to value** | Days from signup to first meaningful action | Command Centre |
| **Response SLA** | Lead first-response time vs target | Customer + alerts |

---

## Onboarding checklist (customer-facing)

Persisted on Organisation `settings.onboarding`:

| Step | Trigger complete |
|------|------------------|
| Account created | Signup |
| Connect website | WordPress Connector sync |
| Import contacts | First contact or CSV import |
| Invite team | Second membership |
| Connect Google | GBP Connector |
| First lead received | `lead.created` |
| Install RE App | AppInstallation |

**Today:** Live checklist from WP tags (transition). **Platform 1.0:** Postgres-backed checklist.

Progress drives onboarding UI and Success Score component.

---

## Health alerts

Automations + Command Centre flag:

| Alert | Condition | Action |
|-------|-----------|--------|
| Low usage | No login 14 days | Email + AM notification |
| Success Score drop | −10 points in 30 days | Command Centre "Needs attention" |
| SLA breach | Lead uncontacted > 4 hrs | Customer notification + task |
| Connector down | Sync failed 3x | Support ticket auto-create |
| Trial expiring | 7 days left | Upgrade prompt |

Alerts emit `client.health_alert` events for Command Centre.

---

## Suggested training

Based on adoption gaps:

| Gap detected | Suggestion |
|--------------|------------|
| CRM used, RE not | "Set up your first vendor pipeline" |
| No automations | "Save 5 hrs/week — enable lead auto-assign" |
| Low AI Visibility | "Run your first AI Visibility audit" |

Delivered in-app — see [IN-PLATFORM-EDUCATION.md](./IN-PLATFORM-EDUCATION.md).

---

## Command Centre integration

| View | Data |
|------|------|
| Agency Health Ranking | Success Score + usage + growth |
| Needs Attention | Alerts + declining scores |
| Client detail | Full adoption breakdown |
| Opportunity Engine | Upsell based on unused Apps |

See [COMMAND-CENTRE.md](../COMMAND-CENTRE.md).

---

## Scalable design

- Metrics computed from **events** — not manual CRM fields  
- Nightly aggregation job per org (Phase 1.5) — not real-time full scan  
- Benchmarks only when cohort size ≥ minimum — see Intelligence doc  

---

## Related

- [DIGITALGATE-INTELLIGENCE.md](./DIGITALGATE-INTELLIGENCE.md) — network benchmarks  
- [IN-PLATFORM-EDUCATION.md](./IN-PLATFORM-EDUCATION.md) — training delivery  
