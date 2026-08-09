# Website Builder closed beta — launch guide

**Audience:** Ben (DigitalGate) + pilot organisations (RE / Acc / general AU SMB)  
**Status:** Ready for closed beta testing (Aug 2026)  
**Depends on:** Gen 2 with `DATABASE_URL`; optional DG Platform plugin **10.70.0+** for authenticated WP content export

---

## Who it’s for

Australian businesses that want a **native Gen 2 website** (structured pages → Studio → publish) without staying on WordPress forever — including:

- New sites from Business Profile + industry templates (RE / Acc)
- Lead / appraisal / booking funnel landings → CRM forms
- WordPress **content** import into Studio (pages → blocks)

Not for: pixel-perfect Elementor/Divi clones, Visual Studio, or full WooCommerce storefronts.

---

## What’s IN beta

| Area | What’s included |
|------|-----------------|
| Flag | `websites.builder` — Enable Websites beta sets this true (soft-on when unset) |
| Sites | Create / list Website assets |
| Generate | AI structured site from Business Profile + templates |
| Studio | Edit pages/blocks, SEO, reorder/duplicate, NL assist (as shipped) |
| Funnels | v0 landing templates → form → CRM |
| Content / Health | Gen 2 content map + publish/domain/DNS/SSL checklist |
| WP import | Pages (+ optional posts) → Studio blocks via Connector `/site/content` or public REST |
| Publish | `/sites/[slug]` renderer + draft preview |
| Go-live | Link domain via Infrastructure Domains → Make it live |

**Beta core path:** Profile → create site → Studio → preview/publish → Domains.

---

## What’s OUT of beta (do not promise)

- **Theme / Elementor / Divi layout recreation** — content + structure only
- **Menus, widgets, WooCommerce, plugin behaviour**
- **Media re-host to DG CDN** — image URLs are hotlinked in v0
- **Visual Studio / full design canvas**
- **Multi-step email marketing funnels**
- **Hosting product UI** — use Domains + platform hosting path only as shipped

---

## Staff: provision a pilot

### Option A — Command Centre

1. `/command/clients` → **Enable Websites beta**
2. Sets `websites.builder`, installs **Websites** + **Infrastructure**
3. Switch into the org → `/apps/websites` → complete checklist

### Option B — Flags

- `/command/flags` → toggle `websites.builder`  
- Prefer Option A so AppInstallation exists

### Option C — Soft-on (dogfood)

- Unset flag still allows Studio (MVP soft-on). For named pilots, still run Enable so enrolment is tracked.

---

## Pilot checklist (Day-0)

- [ ] Enable Websites beta (or confirm soft-on dogfood)
- [ ] Business Profile has trading name / ABN
- [ ] Create site from profile (or WP import)
- [ ] Studio opens; pages editable
- [ ] Preview works; Publish when ready
- [ ] Domains: connect/register → Apply DNS / Make it live
- [ ] (Optional) WP: plugin 10.70.0 + Connectors → Studio **WordPress** tab → Import
- [ ] Know OUT list (no Elementor clone)

In-app checklist: `/apps/websites` (`WebsitesBetaChecklist`).

---

## Demo path (15 min)

1. `/apps/websites` → checklist + **Create** from profile (RE or Acc template if industry fits)
2. Open **Studio** → edit a heading / SEO
3. **Preview** → **Publish**
4. Optional: **WordPress** tab → Import pages → review draft
5. `/apps/infrastructure/domains` → connect domain → Make it live
6. Open live `/sites/[slug]` or custom host when DNS settles

---

## Support playbook

| Symptom | Check |
|---------|--------|
| “Enable Website Builder” gate | Flag explicitly `false`, or `DG_WEBSITES_BUILDER=0` |
| Empty AI generate | Business Profile sparse — add name/services |
| WP import thin/empty | Plugin 10.70+ or public REST; builders may flatten to HTML blocks |
| No custom domain | Domains beta + Dreamscape SOAP env (see INFRASTRUCTURE-BETA-LAUNCH) |

**Escalation:** org id, website id/slug, WP base URL, timestamp, Vercel deployment id.

---

## Related

- [WEBSITE-BUILDER.md](./foundations/WEBSITE-BUILDER.md)
- [INFRASTRUCTURE-BETA-LAUNCH.md](./INFRASTRUCTURE-BETA-LAUNCH.md)
- [COMMAND-CENTRE-BETA.md](./COMMAND-CENTRE-BETA.md)
