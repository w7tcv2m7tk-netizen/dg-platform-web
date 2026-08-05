# Data Governance

**Customers own their data — DigitalGate is the steward**

Trust, compliance, and portability are product features, not afterthoughts.

---

## Data ownership

| Principle | Detail |
|-----------|--------|
| **Customer owns business data** | Contacts, leads, properties, documents — tenant's |
| **DigitalGate owns platform metadata** | Usage analytics, anonymised benchmarks (with consent) |
| **Processor role** | DigitalGate processes data on customer's behalf — DPA available Enterprise |
| **No selling PII** | Customer data never sold to third parties |

---

## Portability (export)

Every Organisation can export:

| Export | Format | Scope |
|--------|--------|-------|
| **Full export** | JSON + CSV zip | All Universal Objects |
| **CRM export** | CSV | Contacts, companies, activities |
| **Document export** | Zip | Files + metadata |
| **Audit log export** | CSV | Compliance requests |

**Platform 1.0:** CRM CSV export minimum.  
**Platform 1.5:** Full JSON export via self-serve + API.

Export requests are logged and rate-limited. Large exports async with email link.

---

## Backups

| Layer | Policy |
|-------|--------|
| **Postgres** | Neon/Supabase automated daily backups; PITR |
| **Object storage** | S3/R2 versioning enabled |
| **Retention** | 30 days standard; Enterprise custom |
| **Restore test** | Quarterly restore drill |

---

## Audit history

Every write produces an audit record:

```
AuditLog {
  organisationId
  actorId          // user or connector
  actorType        // user | system | connector
  action           // create | update | delete | export
  entityType
  entityId
  changes          // JSON diff (where practical)
  ipAddress?
  occurredAt
}
```

**Retention:** 7 years default (AU business records guidance).  
Staff cross-tenant access logged separately — see [COMMAND-CENTRE.md](../COMMAND-CENTRE.md).

---

## Retention & deletion

| Scenario | Policy |
|----------|--------|
| **Soft delete** | Contact, Company, Document — `deletedAt`; recoverable 30 days |
| **Hard delete** | On request or after retention; cascade per object spec |
| **Org offboarding** | Export offered → 90-day grace → hard delete |
| **Churned trial** | Data retained 30 days; then delete |

**Right to erasure:** GDPR-style delete contact + anonymise activities where legal.

---

## Compliance

| Standard | Platform 1.0 | Later |
|----------|--------------|-------|
| AU Privacy Act / APPs | Privacy policy, minimal collection | DPA template |
| Consent for benchmarks | Opt-in for [DIGITALGATE-INTELLIGENCE.md](./DIGITALGATE-INTELLIGENCE.md) | |
| SOC 2 | — | Platform 3.0 target |
| GDPR | Export + delete | EU data region |

---

## Security (summary)

Full detail: [standards/SECURITY-STANDARDS.md](../standards/SECURITY-STANDARDS.md)

- Tenant isolation on every query  
- Encryption in transit (TLS)  
- Connector credentials encrypted at rest (1.5)  
- PII minimisation in logs and AI prompts  

---

## Customer-facing commitments

Market these explicitly:

- ✅ Export your data anytime  
- ✅ Your data is never sold  
- ✅ Audit trail of who changed what  
- ✅ Australian-hosted option (when multi-region)  

---

## Related

- [CORE-OBJECT-SPECIFICATION.md](./CORE-OBJECT-SPECIFICATION.md) — soft delete fields  
- [AI-GOVERNANCE.md](./AI-GOVERNANCE.md) — AI data use  
