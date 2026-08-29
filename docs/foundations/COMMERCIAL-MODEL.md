# Commercial Model

**Flexible licensing now — avoid rework when revenue streams multiply**

DigitalGate revenue is not subscriptions alone. Architecture must support multiple streams via Feature Registry + App licensing.

**App hierarchy (canonical):** [APP-HIERARCHY.md](./APP-HIERARCHY.md) — Core → Infrastructure → Industry → Specialisation → Template → Growth → Intelligence.  
**Industry packaging:** [INDUSTRY-PLATFORM.md](./INDUSTRY-PLATFORM.md) — Industry App **$99/mo** · **1 Industry Template included** · **+$29/mo** each additional Template. Industry App = commercial boundary; Templates = expansion layer.

---

## Commercial model lock (public)

| Layer | What it is |
|-------|------------|
| **Platform** | The operating system (Starter / Growth / Scale / Enterprise) |
| **Apps** | Add-ons — Core included; Infrastructure / Industry / Growth priced as ready |
| **Professional Services** | People — optional; never required |
| **Customer Success** | Ongoing support plans — Standard included; Priority / Success Partner optional |
| **AI · Twin · Automation · Intelligence** | Intelligence / action layer **across** the platform — not sold as separate Apps |

**Public pricing lock:** Starter **$99/mo** · Growth **$249/mo** · Scale **$499/mo** + **Apps additional**. Industry and Growth Apps are **not** included in platform tier pricing. Avoid wording such as “1 Industry App included” or “Unlimited Industry Apps.”

**Founding cohorts (GTM):** Only **Founding 10** is commercially active. Arc: Founding 10 → 100 → 1,000 → Standard. Initial-config discount for 24 months (not permanent). Exact % in offer/agreement — not the public site. Canon: [FOUNDING-COHORTS.md](../strategy/FOUNDING-COHORTS.md).

---

## Revenue streams

| Stream | Model | Phase |
|--------|-------|-------|
| **Platform subscription** | Monthly/annual tier (**Starter $99 · Growth $249 · Scale $499 · Enterprise Custom** — GTM lock; older drafts may say Pro/Business/Agency) | 1.5 |
| **Industry Apps** | Industry App $99/mo — 1 Template included; additional Templates +$29/mo. Templates are not separate Industry SKUs. | 1.5 |
| **Growth Apps** | AI Visibility $99, SEO $99, Analytics $49, Social $79, AI Comms $99 | 1.5 |
| **Infrastructure** | Connect/manage digital infra — priced progressively as commercially ready | 1.5–2.0 |
| **AI usage tiers** | Included tokens + overage | 1.5 |
| **Managed / Professional Services** | Implementation, migration, training, **Website Build (From $1,997 one-time public)**, custom — optional; one-off, not subscription | Now |
| **Customer Success plans** | Priority $199 · Success Partner $499 (Standard included) | 1.5 |
| **Marketplace revenue** | % of third-party App sales | 3.0 / Phase 5 |
| **Platform Refer & Earn** | Commission system (separate from founding subscription discounts) — target tiers in [FOUNDING-COHORTS.md](../strategy/FOUNDING-COHORTS.md); shipped MVP detail in [REVIEWS-AND-REFERRALS.md](./REVIEWS-AND-REFERRALS.md) §A. **Acquisition Partner Programme** is a separate commercial model — do not use “Acquisition Partner” as the Founding 10 referral tier name. | With Billing / Core |
| **Customer Commerce (quotes/invoices)** | Core capability — customer-facing AR, not platform SaaS billing; AU tax documents + reports adjacent to Core | Core / Commerce |
| **Business referral / transaction fees** | Disclosed Free / Reciprocal / Paid / Commission between DG businesses — [REVIEWS-AND-REFERRALS.md](./REVIEWS-AND-REFERRALS.md) §B | Phase 5+ |
| **Enterprise licensing** | Custom features, SLA, white-label, dedicated support | 2.0 |

---

## Plan structure

```typescript
Plan {
  id                 // starter | growth | scale | enterprise  (legacy drafts: pro/business/agency)
  name
  basePriceCents
  currency
  interval           // month | year
  includedFeatures[] // Feature Registry IDs
  includedApps[]     // App IDs
  aiTokenAllowance
  seatLimit?         // starter=1, growth=5, scale/enterprise=unlimited
  trialDays
}
```

Organisation links to Plan via Stripe subscription. `AppInstallation.licenseId` for add-ons.

**GTM packaging narrative:** Starter / Growth / Scale + Apps — *Start with the platform, add as you grow* — [DIGITALGATE-ROLLOUT.md](../strategy/DIGITALGATE-ROLLOUT.md) Phase 9 · public surface: marketing pricing page.

---

## Feature Registry as licensing unit

Billing grants **features**, not Apps directly:

| Plan | Features |
|------|----------|
| Starter | Platform Core essentials, CRM & Dashboard, AI Assistant, Digital Twin snapshot, Standard support |
| Growth | + Automation & workflows, website integration, advanced AI, reporting, email/SMS, Growth-tier platform capabilities (**Apps still add-ons**) |
| Scale | + Unlimited users, multiple pipelines, advanced automation/AI, API, advanced reporting/permissions/BI (**Apps still add-ons**) |
| Enterprise | Custom feature set + integrations + SLA + dedicated support |

Platform tiers grant **platform features**, not free Industry/Growth App seats. Apps attach via add-on licensing.

Apps declare which features they need — install blocked if plan lacks features.

---

## AI metering

| Tier | Included | Overage |
|------|----------|---------|
| Starter | 10k tokens/mo | Block or upsell |
| Growth | 100k tokens/mo | $X per 1k |
| Scale | 500k tokens/mo | $X per 1k |
| Enterprise | Custom | Invoice |

Token usage from [OBSERVABILITY.md](./OBSERVABILITY.md) AiUsageLog → Stripe meter.

---

## Implementation & services

Managed services (websites, campaigns) remain separate from SaaS billing:

- CRM tag or Organisation flag: `managed_client: true`  
- Command Centre shows services revenue vs SaaS MRR  
- Optional: link Service invoices to Organisation for unified view  

---

## Marketplace economics (Platform 3.0)

| Party | Share |
|-------|-------|
| Third-party developer | 70–80% |
| DigitalGate | 20–30% |

Stripe Connect for publisher payouts.

---

## Trial & conversion

| Metric | Tracked in |
|--------|------------|
| Trial starts | `organisation.created` + plan=trial |
| Trial conversion | Stripe subscription created |
| Churn | Subscription cancelled |
| Expansion MRR | App add-on installed |

Command Centre Revenue Intelligence module.

---

## Scalable billing rules

1. **One Stripe customer per Organisation**  
2. **Plan changes prorated** via Stripe  
3. **Feature checks at API layer** — not UI-only gating  
4. **Published pricing for Founding** — Founding customers pay standard published Platform + App pricing; benefits are access/influence, not a recurring % discount ([FOUNDING-COHORTS.md](../strategy/FOUNDING-COHORTS.md))  
5. **Founding status** persists as programme membership; subscription billing follows published monthly / annual / trial terms unless a separate agreement applies  

---

## Related

- [FOUNDING-COHORTS.md](../strategy/FOUNDING-COHORTS.md) — Founding 10 / 100 / 1,000 commercial architecture  
- [APP-HIERARCHY.md](./APP-HIERARCHY.md) — canonical Core → Infrastructure → Industry → Growth  
- [DIGITALGATE-ROLLOUT.md](../strategy/DIGITALGATE-ROLLOUT.md) — GTM packaging  
- [APP-MARKETPLACE.md](./APP-MARKETPLACE.md) — App install licensing  
- [ADR 0007](../adr/0007-feature-registry-permissions.md) — Feature Registry  
- [PLATFORM-RELEASES.md](./PLATFORM-RELEASES.md) — when billing ships  
