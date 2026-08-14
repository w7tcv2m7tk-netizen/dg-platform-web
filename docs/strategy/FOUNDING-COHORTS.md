# DigitalGate Founding Cohorts (commercial architecture lock)

**Status:** Strategy locked · Platform Architect (Ben) · August 2026  
**Active cohort now:** **DigitalGate Founding 10 only**  
**Does not change:** Gate 1 dogfood · P0/P1 · Stage 1 advisor evidence · [COMMERCIALLY-READY-V1.md](../foundations/COMMERCIALLY-READY-V1.md)

> **Do not build** Founding 100 / 1,000 systems, multi-cohort billing UI, or Reseller Programme yet.  
> **Do** keep entitlements / org settings headroom for cohort membership, cohort number, discount period, referral tier, and referral attribution.

---

## Core principle (locked)

**Earlier customers receive greater economic advantage, but DigitalGate does not permanently sacrifice future pricing.**

```
Founding 10  →  Founding 100  →  Founding 1,000  →  Standard DigitalGate
```

Activate each cohort **only after the previous cohort is proven**. This is not a parallel offer stack.

The first ten hold the strongest commercial position because they take the greatest early-adopter risk.

---

## Public pricing (unchanged)

| Layer | Model |
|-------|--------|
| **Platform** | Starter **$99/mo** · Growth **$249/mo** · Scale **$499/mo** · Enterprise Custom |
| **Apps** | **Additional** — Industry and Growth Apps are **not** included in platform tier pricing |

**GTM packaging:** *Start with the platform, add Apps as you grow.*

Remove / avoid conflicting public and in-product wording such as:

- “1 Industry App included”
- “Unlimited Industry Apps” (as a Scale plan inclusion)

Exact founding discount percentages (**30 / 25 / 20**) live in the **Founding Customer offer / agreement**, not as a public pricing grid. The website continues to communicate **preferred founding terms**, not the exact structure.

Canon: [COMMERCIAL-MODEL.md](../foundations/COMMERCIAL-MODEL.md).

---

## Cohort commercial table (internal)

| Cohort | Initial Platform + App discount | Discount period | Referral tier |
|--------|----------------------------------|-----------------|---------------|
| **Founding 10** | **30%** | **24 months** | **Founding Referral — 30%** |
| **Founding 100** | **25%** | **24 months** | **Partner Referral — 25%** |
| **Founding 1,000** | **20%** | **24 months** | **Customer Referral — 20%** |
| **Standard customers** | Public pricing | — | **Customer Referral — 10%** |

Public framing (unchanged):

| Cohort | Public framing |
|--------|----------------|
| Founding 10 | Founding Customer Programme · Founding Operators |
| Founding 100 | Early Operators (not “founders” in the Founding 10 sense) |
| Founding 1,000 | Early DigitalGate network |
| Standard | Standard DigitalGate commercial |

---

## Critical distinction — initial configuration only

The founding discount applies to the customer’s **initial DigitalGate Platform + App configuration only**.

**Example (Founding 10):** Growth + Real Estate + AI Visibility + SEO → **30% off those recurring DigitalGate subscription fees for 24 months**.

If they **later add** another App, Platform tier upgrade, or other qualifying subscription product:

- the **new addition** is charged at the **then-current published pricing**
- it **does not inherit** the founding discount

This avoids a permanent discount liability while still giving founding customers a substantial 24-month commercial advantage.

After the 24-month founding period, the subscription moves to **then-current standard pricing** unless a separate commercial agreement applies. The customer **keeps founding status / recognition** after the discounted period ends.

---

## Discount scope

Cohort discounts apply **only** to:

- DigitalGate **recurring Platform + App subscription fees**

They **do not** apply to:

- Professional Services  
- Setup / Implementation  
- Migration  
- Consulting  
- Custom Development  
- Customer Success plans  
- Third-party costs  
- Pass-through costs  
- Usage-based charges (where applicable)  
- Advertising / media spend  
- Other external services  

Discounts are **non-stackable** with other promotional discounts.

---

## Why 24 months

24 months is the founding commitment window:

- Meaningful economic advantage for early customers  
- Avoids permanent underpricing  

**Principle:** the earlier you join DigitalGate, the greater your **initial** commercial advantage.

---

## Referral model (architecture — separate from subscription discount)

Founding cohorts are the start of the DigitalGate referral / distribution network.

| Cohort | Referral tier | Rate |
|--------|---------------|------|
| Founding 10 | **Founding Referral** | 30% |
| Founding 100 | **Partner Referral** | 25% |
| Founding 1,000 | **Customer Referral** | 20% |
| Standard | **Customer Referral** | 10% |

**Important:**

- Referral percentages are a **separate commission / attribution system**, not an extra customer subscription discount.  
- **Do not** brand the Founding 10 referral tier as **“Reseller”**. A true **DigitalGate Reseller Programme** remains a **separate** commercial model for businesses that actually resell / manage DigitalGate.  
- Current shipped Refer & Earn tiers (Customer / Partner / Reseller labels in product) are transitional — eventual rename / remapping follows this table without forcing a rebuild now. See [REVIEWS-AND-REFERRALS.md](../foundations/REVIEWS-AND-REFERRALS.md).

---

## Immediate execution (non-negotiable)

| Do | Do not |
|----|--------|
| **Founding 10** is the **only** active commercial cohort | Build Founding 100 / 1,000 systems yet |
| Gate 1 → dogfood → P0/P1 → Founding 10 | Distract from Opportunity Engine / Decision Intelligence / Twin |
| Public site: preferred founding terms | Publish exact 30 / 25 / 20 discount grid on the website |
| Exact terms in Founding Customer offer / agreement | Open Founding 100 until Founding 10 is proven |

---

## Architecture headroom (document only — no schema/UI now)

Reserve future fields (e.g. on `Organisation.settings` or billing entitlements) so we can support without rebuild:

| Field | Purpose |
|-------|---------|
| `cohort` | `founding_10` \| `founding_100` \| `founding_1000` \| `standard` |
| `cohortNumber` | e.g. Founding Operator **#07** |
| `foundingDiscountPercent` | Locked at join (30 / 25 / 20) |
| `foundingDiscountEndsAt` | Join + 24 months |
| `foundingLockedLineItems[]` | Initial Platform + App SKUs that inherit discount |
| `referralTier` | `founding_referral` \| `partner_referral` \| `customer_referral` |
| `referredBy` / attribution | Existing Refer & Earn linkage |

**Today:** JSON settings + Feature Registry / plan linkage are enough headroom. Do **not** add schema or UI unless an in-flight Founding 10 offer implementation requires it.

---

## Related

| Doc | Role |
|-----|------|
| [COMMERCIAL-MODEL.md](../foundations/COMMERCIAL-MODEL.md) | Public pricing + revenue streams |
| [COMMERCIALLY-READY-V1.md](../foundations/COMMERCIALLY-READY-V1.md) | Gate 1 / Founding 10 operating target |
| [DIGITALGATE-ROLLOUT.md](./DIGITALGATE-ROLLOUT.md) | GTM phases |
| [REVIEWS-AND-REFERRALS.md](../foundations/REVIEWS-AND-REFERRALS.md) | Platform Refer & Earn (commission system) |
| Founding page | Live offer = Founding 10 framing only; preferred terms, not exact % grid |
