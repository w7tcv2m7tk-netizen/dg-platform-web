# Final Security Certification

This gate runs against the exact pull-request head before merge and combines the canonical unit suite with the final authority, tenant-isolation and role regressions introduced during the Gen 2 remediation.

Certified boundaries include:

- feature-tail authority for organisation-wide send/import/configure operations
- residual relationship tenant isolation
- review-request Contact isolation
- notification recipient isolation
- canonical Member/Admin/Owner permission expectations

The workflow is intentionally read-only with respect to production data. It does not mutate Neon, change schema, alter permission defaults or re-open the completed WordPress runtime-detachment work.
