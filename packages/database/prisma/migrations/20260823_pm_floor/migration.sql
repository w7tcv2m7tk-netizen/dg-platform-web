-- Property Management floor: properties + maintenance + lease.property_id

CREATE TABLE IF NOT EXISTS "pm_properties" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address_line1" TEXT NOT NULL,
    "suburb" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'QLD',
    "postcode" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT 'AU',
    "status" TEXT NOT NULL DEFAULT 'active',
    "property_type" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pm_properties_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pm_properties_organisation_id_status_idx"
  ON "pm_properties"("organisation_id", "status");

DO $$ BEGIN
  ALTER TABLE "pm_properties"
    ADD CONSTRAINT "pm_properties_organisation_id_fkey"
    FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "pm_leases"
  ADD COLUMN IF NOT EXISTS "property_id" TEXT;

CREATE INDEX IF NOT EXISTS "pm_leases_organisation_id_property_id_idx"
  ON "pm_leases"("organisation_id", "property_id");

DO $$ BEGIN
  ALTER TABLE "pm_leases"
    ADD CONSTRAINT "pm_leases_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "pm_properties"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "pm_maintenance_requests" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "property_id" TEXT,
    "contact_id" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pm_maintenance_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pm_maintenance_requests_organisation_id_status_idx"
  ON "pm_maintenance_requests"("organisation_id", "status");

CREATE INDEX IF NOT EXISTS "pm_maintenance_requests_organisation_id_property_id_idx"
  ON "pm_maintenance_requests"("organisation_id", "property_id");

DO $$ BEGIN
  ALTER TABLE "pm_maintenance_requests"
    ADD CONSTRAINT "pm_maintenance_requests_organisation_id_fkey"
    FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "pm_maintenance_requests"
    ADD CONSTRAINT "pm_maintenance_requests_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "pm_properties"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "pm_maintenance_requests"
    ADD CONSTRAINT "pm_maintenance_requests_contact_id_fkey"
    FOREIGN KEY ("contact_id") REFERENCES "contacts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
