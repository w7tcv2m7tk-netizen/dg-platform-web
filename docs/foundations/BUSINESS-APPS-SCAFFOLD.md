# Business Apps floors — Finance · Creator · Commercial · Automotive · PM · Services

**Audience:** Ben + agents shipping Industry Apps  
**Status:** Finance / Commercial / Property Management / Services = **closed-beta floors** (enrol via feature flags). Creator + Automotive remain scaffold.  
**Depends on:** Gen 2 shell; manifests in `platform-core`; beta flags `finance.beta`, `commercial.beta`, `pm.beta`, `services.beta`

---

## Honesty rules

- Beta-gated Apps install when the flag is on — **not** open to every org by default
- No fake KPIs or ServiceM8 / full PMS parity claims
- Accounting / Xero stays label-only until a connector exists

---

## Registry + flags (Aug 2026)

| App | Registry | Gate | Floor |
|-----|----------|------|-------|
| **Finance** | `enabled: true` | `finance.beta` | Broking pipeline + applications + clients |
| **Services** | `enabled: true` | `services.beta` | Jobs + scheduling + checklist/photos |
| **Commercial** | `enabled: true` | `commercial.beta` | Properties + leases + tenants (CRM) |
| **Property Management** | `enabled: true` | `pm.beta` | Properties + leases + owners/tenants + maintenance |
| **Creator** | `enabled: false` | — | Scaffold only |
| **Automotive** | `enabled: false` | — | Scaffold only |

---

## Smoke (beta floors)

1. Enable the relevant `*.beta` flag for a pilot org → install App
2. Open Overview — real KPI counts (not scaffold copy)
3. Create/list core records; link CRM Contacts where relevant
4. Finance: move application stage on Pipeline
5. Services: add checklist item + photo URL on a job

Staff doc library: `/command/docs/business-apps-scaffold`
