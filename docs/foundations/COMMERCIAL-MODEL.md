# Commercial Model

**Flexible licensing now — avoid rework when revenue streams multiply**

DigitalGate revenue is not subscriptions alone. Architecture must support multiple streams via Feature Registry + App licensing.

---

## Revenue streams

| Stream | Model | Phase |
|--------|-------|-------|
| **Platform subscription** | Monthly/annual tier (**Starter, Pro, Business** — GTM lock; older drafts may say Agency) | 1.5 |
| **Industry Apps** | Add-on e.g. Real Estate App +$X/mo | 1.5 |
| **Premium Growth Apps** | AI Visibility Pro, SEO Pro | 1.5 |
| **AI usage tiers** | Included tokens + overage | 1.5 |
| **Managed services** | DigitalGate agency work (existing business) | Now |
| **Marketplace revenue** | % of third-party App sales | 3.0 / Phase 5 |
| **Platform Refer & Earn** | Cost of acquisition — 20% of referred sub × 12 mo (credits default); Partner 25–30%; Reseller custom — [REVIEWS-AND-REFERRALS.md](./REVIEWS-AND-REFERRALS.md) §A | With Billing / Core |
| **Customer Commerce (quotes/invoices)** | Core capability — customer-facing AR, not platform SaaS billing; AU tax documents + reports adjacent to Core | Core / Commerce |
| **Business referral / transaction fees** | Disclosed Free / Reciprocal / Paid / Commission between DG businesses — [REVIEWS-AND-REFERRALS.md](./REVIEWS-AND-REFERRALS.md) §B | Phase 5+ |
| **Implementation** | One-time onboarding fee | 2.0 |
| **Training** | Workshops, certification | 2.0 |
| **Enterprise licensing** | Custom features, SLA, white-label | 2.0 |

---

## Plan structure

```typescript
Plan {
  id                 // starter | pro | business | enterprise  (GTM: Business; legacy drafts may say agency)
  name
  basePriceCents
  currency
  interval           // month | year
  includedFeatures[] // Feature Registry IDs
  includedApps[]     // App IDs
  aiTokenAllowance
  seatLimit?
  trialDays
}
```

Organisation links to Plan via Stripe subscription. `AppInstallation.licenseId` for add-ons.

**GTM packaging narrative:** Starter / Pro / Business + Industry Apps — *Start with the platform, add as you grow* — [DIGITALGATE-ROLLOUT.md](../strategy/DIGITALGATE-ROLLOUT.md) Phase 9.

---

## Feature Registry as licensing unit

Billing grants **features**, not Apps directly:

| Plan | Features |
|------|----------|
| Starter | `crm.contacts.*`, basic dashboard |
| Pro | + `real-estate.pipeline`, `seo.basic` |
| Business | + `ai-visibility.basic`, 3 seats, automations |
| Enterprise | Custom feature set + white-label |

Apps declare which features they need — install blocked if plan lacks features.

---

## AI metering

| Tier | Included | Overage |
|------|----------|---------|
| Starter | 10k tokens/mo | Block or upsell |
| Pro | 100k tokens/mo | $X per 1k |
| Business | 500k tokens/mo | $X per 1k |
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

- [DIGITALGATE-ROLLOUT.md](../strategy/DIGITALGATE-ROLLOUT.md) — GTM pricing simplicity (Starter / Pro / Business)  
- [APP-MARKETPLACE.md](./APP-MARKETPLACE.md) — App install licensing  
- [ADR 0007](../adr/0007-feature-registry-permissions.md) — Feature Registry  
- [PLATFORM-RELEASES.md](./PLATFORM-RELEASES.md) — when billing ships  
