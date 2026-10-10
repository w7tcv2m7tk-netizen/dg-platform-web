-- Independently deployable compatibility barrier. No coordinator dependency.
CREATE TABLE "platform_checkout_creation_gate" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "blocked" BOOLEAN NOT NULL DEFAULT true,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_admission_expires_at" TIMESTAMPTZ(6),
  CONSTRAINT "platform_checkout_creation_gate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "platform_checkout_creation_gate_singleton" CHECK ("id" = 1),
  CONSTRAINT "platform_checkout_creation_gate_revision" CHECK ("revision" >= 0)
);

-- Safe on first activation. Ungated legacy binaries still require isolation.
INSERT INTO "platform_checkout_creation_gate" ("id", "blocked") VALUES (1, true);
