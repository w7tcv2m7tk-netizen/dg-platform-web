# Infrastructure Domains closed beta — launch guide

**Audience:** Ben (DigitalGate) + pilot organisations needing DigitalGate Domains  
**Status:** Code-complete for Domains + Email E1 IN surface (Aug 2026)  
**Depends on:** Gen 2 + Dreamscape **SOAP** production credentials; Neon schema for domains/webhooks; `RESEND_API_KEY` for Email auth DNS

---

## Who it’s for

AU pilots that need to:

- Search domain availability
- **Connect** an existing domain or **register** (paid, gated)
- Apply hosting DNS and Make it live for a Gen 2 website
- Keep SSL on the default auto path

Not for: Dreamscape-branded reseller console, mailbox product, full hosting marketplace, or monitoring dashboards (those nav items stay hidden).

**Customer UX never says “Dreamscape”** — only DigitalGate Domains / DNS / SSL.

---

## What’s IN beta

| Area | What’s included |
|------|-----------------|
| Enrolment | `infra.domains_beta` via **Enable Domains beta** (installs Infrastructure) |
| Search | SOAP DomainCheck — production path `/API-1.3` |
| Connect | Bring-your-own domain into inventory |
| Register | Paid — requires **separate** flag `infra.domain_register` + typed confirm (+ production checkbox) |
| DNS / go-live | Apply hosting DNS, link website, Make it live checklist |
| DNS page | Honest pointer into Domains (not a fake full console) |
| Email (E1) | Prepare sending domain → Apply auth DNS (SPF/DKIM/DMARC) → Verify (`RESEND_API_KEY`) |
| Webhooks | Durable `DreamscapeWebhookEvent` persistence (after `db:push`) |

**Beta core path:** Search → connect (or gated register) → Apply DNS → Make it live with a Website.  
**Email path:** Domains inventory → Email → Prepare → Apply auth DNS → Check verification.

---

## What’s OUT of beta (do not promise)

- **Hosting / Deployments / Monitoring Apps** — routes may exist as “coming later”; **hidden from nav**
- **Business mailbox** product
- **Multi-provider** DNS (Cloudflare etc.) beyond Dreamscape V1
- **Ungated production register** — never enable `infra.domain_register` casually on live SOAP

---

## Platform env (Vercel) — required before smoke

```text
DREAMSCAPE_RESELLER_ID=<reseller id>
DREAMSCAPE_API_KEY=<API Setup key>
DREAMSCAPE_API_MODE=soap
DREAMSCAPE_SOAP_ENV=production
```

- Do **not** set `DREAMSCAPE_SOAP_ENDPOINT=…/server.php?v=1.3` (empty body). Working path is `/API-1.3`.
- Redeploy after env changes.
- Run `npm run db:push` (or migrate) for domain + webhook tables.
- Optional: `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` for SSL attach helpers.
- Email E1: `RESEND_API_KEY` (+ optional `RESEND_FROM_EMAIL`).

Details: [INFRASTRUCTURE.md](./foundations/INFRASTRUCTURE.md).

---

## Staff: provision a pilot

1. Confirm platform SOAP production env (above).
2. `/command/clients` → **Enable Domains beta**  
   - Sets `infra.domains_beta`, installs Infrastructure (+ enables Websites in apps list)
3. Switch into org → `/apps/infrastructure/domains` → checklist
4. Only when charging is intended: Flags → `infra.domain_register` = true

---

## Pilot checklist (Day-0)

- [ ] Vercel SOAP production env + redeploy
- [ ] Domains console shows production SOAP host (not soap-test)
- [ ] Domain **search** returns availability (no empty-response error)
- [ ] Enable Domains beta on pilot org
- [ ] **Connect** a domain (preferred for first smoke) OR gated register
- [ ] Link a Website → Apply DNS / Make it live
- [ ] `infra.domain_register` left OFF until paid register intentional
- [ ] Hosting/Deployments/Monitoring **not** in sidebar

In-app checklist: Domains page (`InfraDomainsBetaChecklist`).

---

## Demo path (10–15 min)

1. `/apps/infrastructure/domains` — confirm API line (production · secureapi host)
2. Search `example-pilot.com.au` (or real candidate)
3. **Connect** an existing domain you control (safest first pass)
4. Link Website → Apply DNS → watch SSL pending → active
5. (Optional paid) Enable `infra.domain_register` → register with typed confirm + production checkbox

---

## Support playbook

| Symptom | Check |
|---------|--------|
| Empty SOAP response | Endpoint must be `/API-1.3`, not `server.php?v=1.3`; `DREAMSCAPE_SOAP_ENV=production` with live keys |
| Auth errors | Reseller ID + API Key from API Setup (SOAP), not REST signature pair |
| Register blocked | Org flag `infra.domain_register` + typed domain (+ confirmProduction) |
| SSL stuck | DNS propagation; optional Vercel project token |
| Fake Hosting UI | Should be off nav — use Domains only |

**Escalation:** org id, domain name, SOAP env/host from console, error code (`soap_empty_response` etc.), Vercel deployment id.

---

## Related

- [INFRASTRUCTURE.md](./foundations/INFRASTRUCTURE.md)
- [WEBSITES-BETA-LAUNCH.md](./WEBSITES-BETA-LAUNCH.md)
- [COMMERCE-BETA-LAUNCH.md](./COMMERCE-BETA-LAUNCH.md)
- [COMMAND-CENTRE-BETA.md](./COMMAND-CENTRE-BETA.md)
