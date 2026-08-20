-- DigitalGate Delivery workspace
-- Migration: add_delivery_workspace
-- Adds delivery_role on partners + delivery project tables

ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "delivery_role" TEXT;

CREATE TABLE IF NOT EXISTS "delivery_projects" (
    "id" TEXT NOT NULL,
    "reference_code" TEXT NOT NULL,
    "customer_organisation_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'accepted',
    "health" TEXT NOT NULL DEFAULT 'on_track',
    "plan" TEXT NOT NULL DEFAULT 'launch',
    "owner_partner_id" TEXT,
    "delivery_lead_partner_id" TEXT,
    "target_go_live_at" TIMESTAMP(3),
    "apps" JSONB,
    "next_action" TEXT,
    "next_action_due_at" TIMESTAMP(3),
    "opportunity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_projects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "delivery_projects_reference_code_key" ON "delivery_projects"("reference_code");
CREATE INDEX IF NOT EXISTS "delivery_projects_customer_organisation_id_idx" ON "delivery_projects"("customer_organisation_id");
CREATE INDEX IF NOT EXISTS "delivery_projects_status_idx" ON "delivery_projects"("status");
CREATE INDEX IF NOT EXISTS "delivery_projects_health_idx" ON "delivery_projects"("health");
CREATE INDEX IF NOT EXISTS "delivery_projects_owner_partner_id_idx" ON "delivery_projects"("owner_partner_id");
CREATE INDEX IF NOT EXISTS "delivery_projects_delivery_lead_partner_id_idx" ON "delivery_projects"("delivery_lead_partner_id");

CREATE TABLE IF NOT EXISTS "delivery_milestones" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_milestones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "delivery_milestones_project_id_sort_order_idx" ON "delivery_milestones"("project_id", "sort_order");

CREATE TABLE IF NOT EXISTS "delivery_tasks" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "due_at" TIMESTAMP(3),
    "assignee_partner_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "delivery_tasks_project_id_status_idx" ON "delivery_tasks"("project_id", "status");
CREATE INDEX IF NOT EXISTS "delivery_tasks_assignee_partner_id_due_at_idx" ON "delivery_tasks"("assignee_partner_id", "due_at");

CREATE TABLE IF NOT EXISTS "delivery_blockers" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_blockers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "delivery_blockers_project_id_status_idx" ON "delivery_blockers"("project_id", "status");
