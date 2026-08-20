-- Granular permission grants on memberships (PermissionGrant JSON array).
ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "permissions" JSONB;
