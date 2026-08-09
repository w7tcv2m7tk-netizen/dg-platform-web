# Command Centre closed beta — launch guide

**Audience:** Ben (DigitalGate staff)  
**Status:** Ready for internal AU pilot (Aug 2026)  
**Depends on:** Gen 2 with `DATABASE_URL` + schema pushed; Clerk staff access (or org allowlist)

This is **staff-only**. Customers never see Command Centre. Client product betas (RE / Acc) are separate — see [RE-BETA-LAUNCH.md](./RE-BETA-LAUNCH.md) and [ACC-BETA-LAUNCH.md](./ACC-BETA-LAUNCH.md).

---

## Who it’s for

DigitalGate operators running acquisition and tenant ops from Gen 2:

- Morning **Ops home** (pulse, actions, connector attention)
- **Growth Engine™** loop: discover → audit → report → follow-up → propose → convert
- **Clients / Flags** for RE + Acc pilot enrolment
- Honest commerce MRR from Neon subscriptions (not invented Growth “MRR won”)

Not for: promising a full Support Centre / Audit Centre inside `/command`, Stripe-attributed Growth MRR, or deep AI Sales Assistant beyond the call-today ranking.

---

## What’s IN beta

| Area | What’s included |
|------|-----------------|
| Access | `/command/*` for `dg:staff`, DigitalGate org slug/name, or `DG_COMMAND_CENTRE_ORG_IDS` |
| Ops home | Platform pulse, today’s actions, deep links — live Neon aggregates |
| Clients | Org list, Success Score signals, **Enable RE / Acc / Websites / Domains beta** |
| Flags | Cross-tenant feature flags (`re.beta`, `acc.beta`, `websites.builder`, `infra.domains_beta`, `infra.domain_register`, …) |
| Growth hub | Summary + **Call today** ranking (idle days, views, health — no invented metrics) |
| Discovery | Create / filter / soft-archive prospects |
| Audits | Live website presence probes → Business Health from reachable HTML signals |
| Reports | Generate opportunity report + public `/opportunity/<token>` + mark sent / copy link |
| Pipeline | Kanban stages + stage changes + convert CTA |
| Follow-ups | Idle queue (≥5 days) with audit / report / propose / convert CTAs |
| Proposals | List-price package drafts → draft Commerce quote on operator org |
| Conversions | Real funnel counts (audits, reports, meetings, wins) — **MRR won stays $0** until Stripe attribution |
| Transition | Prospect → create/link client org + onboarding next-steps (billing remains operator-driven) |
| Health / Revenue | Connector checklist + commerce subscription MRR snapshot from Neon |
| Expansion / Benchmarks / Executive reports | Live pages from Neon aggregates; Expansion $ are **catalogue list prices**, not won MRR |
| AI Advisor | Staff NL questions against Twin / scores where data exists |

**Beta core path:** Growth Engine send → follow-ups → convert → invite (then org Billing / apps).

---

## What’s OUT of beta (do not promise)

- **`/command/support` and `/command/audit`** — vapor routes **redirect** to `/support` and `/dashboard/settings/audit` (no fake Command UI)
- **Growth MRR won / revenue forecast** — always $0 until Growth → Stripe subscription attribution ships
- **Full AI Sales Assistant depth** — call-today ranking only; no autonomous outreach
- **Contact merge / CRM experimental merge** — behind `crm.experimental_merge`; not a CC beta promise
- **Full Twin history / Success Score v1 completeness** — scores improve with data; don’t invent gaps
- **Customer-facing Command Centre** — never
- **Auto-send monthly Growth Reports without review** — staff review path only where shipped

---

## Enable path (staff)

No `command.beta` org flag — Command Centre is **internal-gated**, not a customer app.

### Option A — DigitalGate operator org (default)

1. Sign into Gen 2 as a member of the DigitalGate org (slug `digitalgate` / name match).
2. Open `/command`.

### Option B — Clerk staff role

1. Ensure Clerk user/org has role claim `dg:staff`.
2. Open `/command`.

### Option C — Org allowlist (Vercel)

1. Set production env `DG_COMMAND_CENTRE_ORG_IDS` to a comma-separated list of organisation UUIDs.
2. Redeploy.
3. Switch into an allowlisted org → `/command`.

Middleware returns non-staff users away from `/command` (no “access denied” leak).

---

## Demo path (15–20 min)

Run as staff with `DATABASE_URL` live.

1. **Ops home** — `/command` → confirm pulse numbers move with real orgs/leads (not zeros-only sandbox if production has data).
2. **Discovery** — `/command/growth-engine/discovery` → add a sandbox prospect (real website URL preferred).
3. **Audit** — Run presence audit → confirm scores cite reachable signals (not invented SEO/AI).
4. **Report** — Generate opportunity report → **Copy share link** → open `/opportunity/<token>` in a private window.
5. **Mark sent** — Reports list → Mark report sent → stage moves.
6. **Follow-up / Call today** — Hub or Follow-ups → confirm idle ranking + CTAs.
7. **Propose** — Create list-price quote (operator org Commerce draft).
8. **Convert** — Convert → create/link client org → follow next-steps (invite owner, Billing — **do not invent Stripe checkout here**).
9. **Flags / Clients** — Toggle a sandbox flag; confirm RE/Acc Enable buttons still enrol client betas.
10. **Vapor check** — Visit `/command/support` and `/command/audit` → confirm redirects (no fake modules).

---

## Pilot checklist (Day-0)

- [ ] Production `DATABASE_URL` set; `npm run db:push` (or migrate) applied for Growth + Command tables
- [ ] Staff can open `/command` (org / `dg:staff` / allowlist)
- [ ] Growth Engine hub loads; Call today does not show invented MRR
- [ ] One end-to-end sandbox: discover → audit → report link → mark sent → convert
- [ ] Soft-archive works for demo cleanup
- [ ] `/command/support` + `/command/audit` redirect away
- [ ] Client enrolment: Enable Acc / RE beta still works from Clients
- [ ] Know OUT list (Support/Audit vapor, Growth MRR, deep Sales Assistant, contact merge)

---

## Routes (quick map)

| Route | Beta role |
|-------|-----------|
| `/command` | Ops home |
| `/command/clients` | Client intelligence + RE/Acc enrol |
| `/command/flags` | Cross-tenant flags |
| `/command/growth-engine` | Hub + Call today |
| `/command/growth-engine/discovery` | Prospects |
| `/command/growth-engine/audits` | Presence audits |
| `/command/growth-engine/reports` | Opportunity reports + send |
| `/command/growth-engine/pipeline` | Kanban |
| `/command/growth-engine/follow-ups` | Idle queue |
| `/command/growth-engine/proposals` | List-price quotes |
| `/command/growth-engine/conversions` | Funnel counts (MRR $0) |
| `/command/platform-health` | Connectors / ops load |
| `/command/revenue` | Commerce subscription MRR (Neon) |
| `/opportunity/<token>` | Public prospect report |
| `/command/support` | → `/support` (vapor) |
| `/command/audit` | → `/dashboard/settings/audit` (vapor) |

---

## Support playbook

| Symptom | Check |
|---------|--------|
| `/command` → dashboard | Not staff / not DigitalGate org / not in `DG_COMMAND_CENTRE_ORG_IDS` |
| Amber “DATABASE_URL” banners | Neon not configured or schema not pushed |
| Empty Growth Engine | Create a prospect; run audit; don’t expect MRR |
| Report link 404 | Token from Reports page; public route is `/opportunity/<token>` |
| Convert succeeded but no billing | Expected — invite + Billing on client org; no invented Stripe |
| Fake Support/Audit UI | Should redirect — if not, hard-refresh; vapor map in `command/[[...segments]]/page.tsx` |

**Escalation:** org id, prospect id, report token, timestamp, Vercel deployment id.

---

## Honest beta constraints (locked in UI)

These are intentional — surfaces label them; do not promise the opposite to pilots.

| Constraint | Where it’s shown |
|------------|------------------|
| Growth **MRR won / forecast** = **$0** until Stripe attribution | Conversions dashboard ($0 cards) + Growth hub banner |
| Expansion $ = **catalogue list prices** for missing apps, not Stripe | Expansion page (“catalogue” labels + pricing note) |
| Sales Assistant = **ranked Call today** list, not autonomous AI SDR | Growth hub + module card |
| Support / Audit Command modules **deferred** (redirects only) | Ops home deferred note; `/command/support` → `/support`; `/command/audit` → tenant audit |
| Success Score™ / Twin **matures with tenant data** | Clients intelligence banner |

Commerce MRR on `/command/revenue` remains real Neon subscription totals — do not confuse with Growth MRR won.

---

## Related docs

- [COMMAND-CENTRE.md](./COMMAND-CENTRE.md) — product vision + architecture  
- [GROWTH-ENGINE.md](./GROWTH-ENGINE.md) — acquisition module spec  
- [ACC-BETA-LAUNCH.md](./ACC-BETA-LAUNCH.md) / [RE-BETA-LAUNCH.md](./RE-BETA-LAUNCH.md) / [WEBSITES-BETA-LAUNCH.md](./WEBSITES-BETA-LAUNCH.md) / [INFRASTRUCTURE-BETA-LAUNCH.md](./INFRASTRUCTURE-BETA-LAUNCH.md) — client product betas enrolled from Command  
- Manifest: `packages/platform-core/src/apps/builtins/command-centre.ts`  
- Access: `packages/platform-core/src/command-centre/access.ts`  
