# Database baseline & migration reproducibility (C-4)

**Status:** artifact generated and reviewable. **Not yet applied.** Completing
this requires one operator step against the production database, described
below. Nothing in this document has been executed.

---

## The problem

`packages/database/prisma/schema.prisma` defines **63 models**. The checked-in
migration history creates **16 tables**. The remaining **47 have no
`CREATE TABLE` anywhere**, and the history opens with `ALTER TABLE` statements
against tables it never creates.

A clean-database `prisma migrate deploy` fails on the third migration:

```
packages/database/prisma/migrations/20260820_membership_permissions/migration.sql:2
ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "permissions" JSONB;
-- ERROR 42P01: relation "memberships" does not exist
```

There is also no `migration_lock.toml`, no `_prisma_migrations` reference, and
no `migrate` script — the only schema-apply path in `package.json` is
`db:push`. The production schema was therefore established by pushing
`schema.prisma` directly, and the 10 migration folders are hand-written deltas
layered on top of a database nobody can rebuild from source.

Consequences: no disaster recovery from version control, no reproducible
staging/preview databases, and no reviewable record of schema change. The
migrations that do exist have also drifted from the schema — `commission_bps`
defaults to 2000 in SQL and 2500 in Prisma, and several `@relation` foreign
keys (`delivery_projects` → `organisations`/`partners`, the delivery child
cascades, `partners.managed_by_partner_id`) exist only in the ORM, so the
database is not enforcing them.

## What has been generated

`packages/database/prisma/baseline/0_init.sql` — produced with:

```bash
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel packages/database/prisma/schema.prisma \
  --script
```

This command reads only the schema file. It does not connect to any database.

The artifact contains the full current schema: **63 `CREATE TABLE`, 164
indexes, 91 foreign keys**, including the SQL-level constraints the existing
migrations never expressed.

Regenerate it whenever `schema.prisma` changes, or the baseline silently drifts
and the step 1 verification below stops being meaningful. It has been
regenerated once already, for the H-7 receipt-state columns.

It is deliberately placed under `prisma/baseline/`, **not** under
`prisma/migrations/`, so that `migrate deploy` cannot pick it up and attempt to
recreate tables on a live database.

## Why it is not applied yet

Prisma's baselining procedure requires marking the baseline as already applied
on every existing database *before* it enters the migrations folder. Getting
that order wrong on production would attempt to create 63 existing tables. That
step is an operator action against production, and application security changes
should ship independently of it.

## Proposed procedure

Run against a scratch database first, then staging, then production.

**Step 1 — verify the baseline reproduces the schema (scratch DB, no production access).**

```bash
createdb dg_baseline_check
psql dg_baseline_check -f packages/database/prisma/baseline/0_init.sql
DATABASE_URL=postgres://…/dg_baseline_check \
  npx prisma migrate diff \
    --from-url "$DATABASE_URL" \
    --to-schema-datamodel packages/database/prisma/schema.prisma \
    --script
```

The second diff must be empty. A non-empty diff means the baseline is
incomplete — stop and reconcile before continuing.

**Step 2 — confirm production drift is understood.**

```bash
npx prisma migrate diff \
  --from-url "$PRODUCTION_DATABASE_URL" \
  --to-schema-datamodel packages/database/prisma/schema.prisma \
  --script
```

Read-only. Expect this to surface the missing foreign keys and the
`commission_bps` default. Any *unexpected* difference means production has
drifted from `schema.prisma` in a way nobody recorded — investigate before
baselining.

**Step 3 — promote the baseline into migration history.**

Move `prisma/baseline/0_init.sql` to
`prisma/migrations/00000000000000_init/migration.sql` and add
`prisma/migrations/migration_lock.toml` containing:

```
provider = "postgresql"
```

Order matters: the 10 existing dated folders sort *after* `00000000000000_init`,
so a clean database gets the full schema first and then the deltas. Several of
those deltas use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` and will no-op
against the baseline; any that do not must be checked in step 1.

**Step 4 — mark every existing database as already baselined.**

For production and each long-lived environment, before any deploy that runs
migrations:

```bash
npx prisma migrate resolve --applied 00000000000000_init
npx prisma migrate resolve --applied 20260819_add_partner_programme
# … each existing dated migration in order
```

This writes rows to `_prisma_migrations` only. It does not alter schema.

**Step 5 — reconcile the drift as a normal forward migration.**

The missing foreign keys and the `commission_bps` default should be a new dated
migration reviewed on its own, not folded into the baseline. Adding FKs
validates existing rows, so check for orphans first:

```sql
SELECT COUNT(*) FROM delivery_projects dp
LEFT JOIN organisations o ON o.id = dp.customer_organisation_id
WHERE dp.customer_organisation_id IS NOT NULL AND o.id IS NULL;
```

**Step 6 — switch the documented workflow.**

Replace `db:push` with `migrate dev` for local schema change and
`migrate deploy` for deployment, and remove `db:push` from the README quick
start so the two paths cannot diverge again.

## Rollback

Steps 1–2 are read-only. Step 3 is a file move, revertable in git. Step 4
writes only to `_prisma_migrations`; if it is applied incorrectly, delete the
affected rows and re-resolve — no application table is touched. Step 5 is a
normal migration with its own down path.

## Constraints observed

No destructive command was run. No database was contacted. The baseline was
generated from the schema file alone.

## Related artifacts

| Artifact | Purpose | State |
|---|---|---|
| `baseline/proposed/stay_booking_no_overlap.sql` | Database-enforced booking overlap invariant (H-9 defence in depth) | **Unapplied, not referenced by code.** Blocked: `btree_gist` availability on Neon is unverified, the write paths must translate SQLSTATE 23P01 first, and the operator force-override question is undecided. |
| `migrations/20260830_stripe_webhook_receipt_state/` | Receipt state machine for webhook crash recovery (H-7) | **Unapplied, but application code now depends on it.** Must be applied before that code is deployed — see `STRIPE-RECEIPT-STATE-DEPLOYMENT.md`. |

Re-verified after Phase 7: `schema.prisma` defines 63 models and
`baseline/0_init.sql` contains 63 `CREATE TABLE` statements. The H-7 receipt
columns were added to the schema in Phase 6, so the baseline has been
regenerated from the schema file to match; the only delta was those five columns
and their index.

Note that the H-7 migration is applied as **direct SQL, not
`prisma migrate deploy`**, precisely because the problem described above is
still open. Nothing here changes that: `migrate deploy` remains unusable until
steps 3–4 are done.
