# AI Brand Studio

**Status:** Roadmap · Design locked · August 2026  
**Classification:** **Core capability** (not a Website Builder–only feature; not a Logo Maker App)  
**Related:** [BUSINESS-PROFILE.md](./BUSINESS-PROFILE.md) · [WEBSITE-BUILDER.md](./WEBSITE-BUILDER.md) · [PRODUCT-VISION.md](../PRODUCT-VISION.md)

---

## Positioning

Not “generate a logo.”

> **Build my business identity** — then flow it into everything DigitalGate creates.

```
Business Profile
       ↓
AI Brand Studio
       ↓
Logo + Colours + Typography + Brand Voice
       ↓
Website Builder · Email · Social · Documents · Proposals · Reports ·
Digital Business Card · Ads / Campaigns
```

Strategic chain:

```
Business Profile → Digital Twin™ → Brand Identity → Digital Presence
```

Fits **Gateway to Your Digital World**. Website Builder is a primary *surface* for Brand Studio; Core owns the capability so brand assets live on the Organisation and every App can consume them.

---

## Source of truth

AI pulls from / asks to complete **Business Profile**:

* Business name  
* Industry  
* Location  
* Description  
* Target customer  
* Brand personality / voice  
* Preferred colours  
* Existing branding (if any)

Do **not** re-prompt for fields already on the profile (`getBusinessContext()`).

---

## Optional onboarding (keep friction low)

When creating a website (or opening Brand Studio):

| Path | Behaviour |
|------|-----------|
| **I already have a brand** | Upload logo / colours / fonts → write Business Profile |
| **Create my brand with AI** | Enter Brand Studio |
| **I’ll do it later** | Clean temporary identity — do **not** block Website Builder |

Never require a logo before building a website.

---

## V1 scope (keep simple)

Ship first:

* Logo concepts → pick primary  
* Icon / mark + wordmark (light/dark where practical)  
* Colour palette  
* Typography pairing  
* Favicon  
* Short brand guidelines (voice + usage notes)  
* **AI iteration** (“more premium”, “less corporate”, “earthier”, “simpler at small sizes”)

Defer (V2+):

* Full social profile pack, email signature, business card, header packs as first-class generators  
* Ads / campaign kits  
* Dedicated Brand Studio **App** in the registry (unless Core surfaces prove insufficient)

V1 still *writes* palette, logo URLs, and voice back to Business Profile so Email, Commerce letterheads, Websites, etc. pick them up.

---

## Full identity vision (later)

Brand Identity pack may grow to:

* Primary logo, icon/mark, wordmark, light/dark  
* Colour palette, typography, favicon  
* Social profile image, email signature, business card assets  
* Website header assets  
* Brand guidelines document  

---

## Architecture rules

1. **Core capability** — brand assets on Organisation / Business Profile, not trapped in Website Builder.  
2. **No dedicated Logo Maker App** for V1.  
3. Consume via `getBusinessContext()` / profile APIs.  
4. Website Builder, Infrastructure go-live, Commerce docs, AI Assist all read the same identity.  
5. Validate marketplace / presence value before heavy asset pipelines.

---

## Roadmap IDs

| ID | Item |
|----|------|
| `core.brand_studio` | AI Brand Studio (Core capability) |
| `core.brand_studio.v1` | V1: logo + palette + type + favicon + guidelines + iterate |
| `websites.brand_studio_entry` | Optional Brand Studio entry from Website Builder create flow |

In-app: Settings → Roadmap (`packages/platform-core/src/roadmap/index.ts`).
