# Commercial Model

**Flexible licensing now — avoid rework when revenue streams multiply**

DigitalGate revenue is not subscriptions alone. Architecture must support multiple streams via Feature Registry + App licensing.

**App hierarchy (canonical):** [APP-HIERARCHY.md](./APP-HIERARCHY.md) — Core → Infrastructure → Industry → Growth.

---

## Commercial model lock (public)

| Layer | What it is |
|-------|------------|
| **Platform** | The operating system (Starter / Growth / Scale / Enterprise) |
| **Apps** | Add-ons — Core included; Infrastructure / Industry / Growth priced as ready |
| **Professional Services** | People — optional; never required |
| **Customer Success** | Ongoing support plans — Standard included; Priority / Success Partner optional |
| **AI · Twin · Automation · Intelligence** | Intelligence / action layer **across** the platform — not sold as separate Apps |

---

## Revenue streams

| Stream | Model | Phase |
|--------|-------|-------|
| **Platform subscription** | Monthly/annual tier (**Starter $99 · Growth $249 · Scale $499 · Enterprise Custom** — GTM lock; older drafts may say Pro/Business/Agency) | 1.5 |
| **Industry Apps** | Add-on e.g. Real Estate / Accommodation / Services +$99/mo | 1.5 |
| **Growth Apps** | AI Visibility $99, SEO $99, Analytics $49, Social $79, AI Comms $99 | 1.5 |
| **Infrastructure** | Connect/manage digital infra — priced progressively as commercially ready | 1.5–2.0 |
| **AI usage tiers** | Included tokens + overage | 1.5 |
| **Managed / Professional Services** | Implementation, migration, training, custom — optional | Now |
| **Customer Success plans** | Priority $199 · Success Partner $499 (Standard included) | 1.5 |
| **Marketplace revenue** | % of third-party App sales | 3.0 / Phase 5 |
| **Platform Refer & Earn** | Cost of acquisition — 20% of referred sub × 12 mo (credits default); Partner 25–30%; Reseller custom — [REVIEWS-AND-REFERRALS.md](./REVIEWS-AND-REFERRALS.md) §A | With Billing / Core |
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
| Starter | Platform Core essentials, AI Assistant, Standard support |
| Growth | + Automation, website integration, advanced AI, reporting, 1 Industry App, Growth capabilities, email/comms |
| Scale | + Unlimited users, multiple pipelines, unlimited Industry Apps, advanced automation/AI, API, advanced reporting/permissions/BI |
| Enterprise | Custom feature set + integrations + SLA + dedicated support |

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
4. **Grandfathering** — org keeps features at signup price until they change plan  

---

## Related

- [APP-HIERARCHY.md](./APP-HIERARCHY.md) — canonical Core → Infrastructure → Industry → Growth  
- [DIGITALGATE-ROLLOUT.md](../strategy/DIGITALGATE-ROLLOUT.md) — GTM packaging  
- [APP-MARKETPLACE.md](./APP-MARKETPLACE.md) — App install licensing  
- [ADR 0007](../adr/0007-feature-registry-permissions.md) — Feature Registry  
- [PLATFORM-RELEASES.md](./PLATFORM-RELEASES.md) — when billing ships  
