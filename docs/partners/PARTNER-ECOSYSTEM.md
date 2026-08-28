# DigitalGate Partner Ecosystem

**Status:** Canonical architecture lock — August 2026  
**Surface:** `/command/partners/ecosystem`

**Positioning:**

> DigitalGate owns the platform, product roadmap, methodology, standards and customer relationship. Partners extend DigitalGate's ability to acquire, implement and optimise the platform.

Do **not** make Founding Acquisition Partners responsible for onboarding unless they separately become a Certified Delivery Partner. DigitalGate (or a Delivery Partner) delivers the customer experience.

---

## Delivery Partner terminology (locked)

| Term | Meaning |
|------|---------|
| **Delivery Partner** | Partner authorised to perform implementation |
| **Certified Delivery Partner** | Delivery Partner that completed DigitalGate certification |
| **Active Delivery Partner** | Certified partner currently authorised/operating |

**Lifecycle:** Applicant → Approved → Certified → Active

Do **not** alternate casually between Delivery Partner, Certified Delivery Partner, Implementation Partner, Partner, or Certified Partner unless the distinction above is intentional.

---

## Ecosystem hierarchy (centrepiece)

| Actor | Role |
|-------|------|
| **DigitalGate** | Platform owner |
| **Reseller** | Acquisition |
| **Delivery Partner** | Implementation |
| **Specialist** | Expertise (capability / certification) |
| **Customer Success** | Optimisation (capability / role) |

---

## Partner types (commercial — four only)

| Type | Commercial label | Primary role | Acquire | Onboard | Technical | Economics |
|------|------------------|--------------|---------|---------|-----------|-----------|
| Reseller | Founding Acquisition Partner | Introduce & refer | Yes | Optional | No | Recurring commission |
| Delivery | Delivery Partner | Setup & onboarding | Optional | Yes | Limited | Project fees |
| Technology | Technology Partner | Integrations | Optional | Yes | Yes | Service revenue |
| Strategic | Strategic Partner | Larger / industry | Yes | Optional | Partial | Negotiated |

Do **not** add Certified Specialists or Customer Success Partners as fifth/sixth commercial partner types.

---

## Partner capabilities (roles a partner may hold)

1. Acquisition  
2. Implementation  
3. Technical  
4. Specialist  
5. Customer Success  

A partner can hold more than one capability. The underlying partner record remains a **single entity**.

Specialist tracks (CRM, AI, Automation, Website, Industry) are **certifications** under the Specialist capability.

---

## Delivery layers

DigitalGate = platform + architecture + support + product  
Delivery Partner = configuration + migration + training  
Customer = business decisions + information + adoption

---

## Build sequence

```
Founding Acquisition Partners → Delivery Partners → Certification → Partner Operations → Marketplace
```

1. Founding Acquisition Partner Programme — first two operating; invitation only; 3–5 highly qualified introducers  
2. Founding Delivery Partners — recruit 2–3 excellent people, not 20  
3. Certification — document methodology  
4. Partner operations dashboard  
5. Partner Marketplace — only after the operating model is proven  

---

## Separation locks (developer requirements)

> Treat the current Partner Ecosystem model as the canonical architecture for DigitalGate’s partner system. Do not collapse Resellers, Delivery Partners, Technology Partners, Strategic Partners, Specialists or Customer Success into a generic partner type. Keep DigitalGate’s own Sales/Growth Engine completely separate from the Partner ecosystem.

```
Partner → Type → Capabilities → Certification → Referrals → Customers → Implementation → Success → Revenue/Commission
```

| Surface | Job |
|---------|-----|
| **Sales / Growth Engine** | DigitalGate’s own acquisition |
| **Founding 10** | Customer acquisition / cohort |
| **Founding Acquisition Partner** | Partner acquisition / cohort |
| **Delivery Partner** | Implementation capacity |
| **Partners** | External channel *relationships* (people & organisations) |
| **Platform → Network** | Network *transactions* (Referrals · Commissions · Payouts) |

DigitalGate remains the platform owner, methodology owner and customer relationship owner.

Build the data model and UI so this can scale to a future Partner Marketplace without an architectural rewrite.

**Surfaces:** `/command/partners` · `/command/partners/ecosystem` · `/command/partners/delivery` · `/command/partners/onboarding` · Network transactions via `/command/referrals` · `/command/commissions` · `/command/partners/payouts`

**Lock:** `packages/platform-core/src/partners/ecosystem.ts` · `packages/platform-core/src/partners/delivery-model.ts`
