# DigitalGate Partner Ecosystem

**Positioning:** DigitalGate owns the platform, methodology, standards and customer relationship. Certified partners extend DigitalGate's ability to deliver that platform.

Do **not** make Founding Resellers responsible for onboarding unless they separately become a Certified Implementation Partner.

## Partner types

| Type | Primary role | Acquire | Onboard | Technical | Economics |
|------|----------------|---------|---------|-----------|-----------|
| Founding Reseller | Introduce & refer | Yes | Optional | No | Recurring commission |
| Implementation Partner | Setup & onboarding | Optional | Yes | Some | Project fees |
| Technology Partner | Integrations | Optional | Yes | Yes | Service revenue |
| Strategic Partner | Larger / industry | Yes | Optional | Optional | Negotiated |

## Delivery layers

DigitalGate = platform + architecture + support + product  
Implementation Partner = configuration + migration + training  
Customer = business decisions + information + adoption

## Build sequence

1. Founding Reseller Programme (now)
2. Founding Implementation Partners — 2–3 people (next)
3. Certification methodology
4. Partner operations dashboard
5. Partner Marketplace (later)

**Surfaces:** `/command/partners/ecosystem` · `/command/partners/delivery` · `/command/partners/implementation` · `/command/partners/onboarding`

Lock: `packages/platform-core/src/partners/ecosystem.ts` · `packages/platform-core/src/partners/delivery-model.ts`

---

## Partner Programme dashboard (operator)

**Surface:** `/command/partners`

### Hierarchy

1. Partner Programme — build and manage reseller, referral and delivery ecosystem  
2. Partner Pulse — active resellers · referrals · customers referred · commission  
3. What needs attention — intervention queue  
4. Founding Reseller Programme — seats + invite  
5. Partner Briefing · Ecosystem  
6. Resellers · Delivery Partners · Recent activity  

### Role lock

| Role | Job |
|------|-----|
| **Founding Resellers** | Introduce qualified businesses. Ben closes. |
| **Delivery Partners** | Implementation, specialist services, fulfilment. |

### Developer requirement

> Partner Dashboard must never become a prospecting or sales pipeline. DigitalGate’s customer acquisition remains owned by Sales / Growth Engine. Partner surfaces only manage the partner relationship, partner activity, referrals, reseller performance, onboarding and commissions.

```
SALES      DigitalGate finds customers
PARTNERS   Partners introduce customers
DELIVERY   Partners/teams implement customers
CUSTOMERS  DigitalGate operates their businesses
REVENUE    DigitalGate monetises the platform
```

Implementation: `buildPartnerDashboardWorkspace` · `PartnerProgrammeDashboard`
