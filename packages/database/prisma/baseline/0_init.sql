-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "organisations" (
    "id" TEXT NOT NULL,
    "clerk_org_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en-AU',
    "timezone" TEXT NOT NULL DEFAULT 'Australia/Brisbane',
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "status" TEXT NOT NULL DEFAULT 'trial',
    "settings" JSONB,
    "billing_customer_id" TEXT,
    "industry" TEXT,
    "referral_code" TEXT,
    "referred_by_organisation_id" TEXT,
    "stripe_connect_account_id" TEXT,
    "stripe_connect_status" TEXT,
    "stripe_connect_payouts_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'active',
    "email" TEXT,
    "public_email" TEXT,
    "display_name" TEXT,
    "bio" TEXT,
    "job_title" TEXT,
    "phone" TEXT,
    "avatar_url" TEXT,
    "external_refs" JSONB,
    "permissions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "source" TEXT,
    "tags" TEXT,
    "company_id" TEXT,
    "assigned_user_id" TEXT,
    "legacy_wp_id" INTEGER,
    "metadata" JSONB,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "industry" TEXT,
    "metadata" JSONB,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "activity_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "metadata" JSONB,
    "source_app" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "assigned_user_id" TEXT,
    "due_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "entity_type" TEXT,
    "entity_id" TEXT,
    "priority" TEXT,
    "source_app" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_jobs" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'new_enquiry',
    "status" TEXT NOT NULL DEFAULT 'open',
    "job_type" TEXT,
    "description" TEXT,
    "contact_id" TEXT,
    "lead_id" TEXT,
    "quote_id" TEXT,
    "assigned_user_id" TEXT,
    "site_address" TEXT,
    "scheduled_start_at" TIMESTAMP(3),
    "scheduled_end_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "template_key" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "recipient_user_id" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "read_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "source" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "contact_id" TEXT,
    "assigned_user_id" TEXT,
    "channel" TEXT,
    "campaign_id" TEXT,
    "response_due_at" TIMESTAMP(3),
    "first_response_at" TIMESTAMP(3),
    "metadata" JSONB,
    "external_refs" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "contact_id" TEXT,
    "company_id" TEXT,
    "lead_id" TEXT,
    "property_id" TEXT,
    "assigned_user_id" TEXT,
    "value_cents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "probability" INTEGER,
    "expected_close_date" TIMESTAMP(3),
    "lost_reason" TEXT,
    "pipeline_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "suburb" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'AU',
    "status" TEXT NOT NULL DEFAULT 'prospect',
    "property_type" TEXT,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "owner_contact_id" TEXT,
    "lead_id" TEXT,
    "listing_price_cents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "metadata" JSONB,
    "external_refs" JSONB,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_documents" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL DEFAULT 0,
    "storage_key" TEXT NOT NULL,
    "url" TEXT,
    "storage" TEXT NOT NULL DEFAULT 'blob',
    "version" INTEGER NOT NULL DEFAULT 1,
    "document_status" TEXT NOT NULL DEFAULT 'active',
    "signing_status" TEXT NOT NULL DEFAULT 'not_required',
    "signing_provider" TEXT NOT NULL DEFAULT 'none',
    "source_app" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "template_id" TEXT,
    "metadata" JSONB,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_communications" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "subject" TEXT,
    "body_preview" TEXT,
    "body_html" TEXT,
    "from_address" TEXT,
    "to_addresses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cc_addresses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contact_id" TEXT,
    "company_id" TEXT,
    "opportunity_id" TEXT,
    "task_id" TEXT,
    "thread_key" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'resend',
    "external_id" TEXT,
    "why_sent" TEXT,
    "trigger_rule" TEXT,
    "approved_by" TEXT,
    "sent_by" TEXT,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "sent_at" TIMESTAMP(3),
    "scheduled_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accommodation_units" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "external_wp_id" INTEGER,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "post_status" TEXT,
    "listing_status" TEXT NOT NULL DEFAULT 'bookable',
    "description" TEXT,
    "accommodation_type" TEXT,
    "address" TEXT,
    "weekday_rate_cents" INTEGER,
    "weekend_rate_cents" INTEGER,
    "cleaning_fee_cents" INTEGER,
    "sleeps" INTEGER,
    "bedrooms" INTEGER,
    "bathrooms" DOUBLE PRECISION,
    "max_guests" INTEGER,
    "min_nights" INTEGER,
    "checkin_time" TEXT,
    "checkout_time" TEXT,
    "features" JSONB,
    "featured_image_url" TEXT,
    "gallery_urls" JSONB,
    "airbnb_ical_url" TEXT,
    "bookingcom_ical_url" TEXT,
    "ical_export_url" TEXT,
    "airbnb_last_sync_at" TIMESTAMP(3),
    "airbnb_last_error" TEXT,
    "bookingcom_last_sync_at" TIMESTAMP(3),
    "bookingcom_last_error" TEXT,
    "airbnb_id" TEXT,
    "bookingcom_id" TEXT,
    "housekeeping_status" TEXT NOT NULL DEFAULT 'unknown',
    "housekeeping_notes" TEXT,
    "last_cleaned" TIMESTAMP(3),
    "manual_blocked_dates" JSONB,
    "checkin_url" TEXT,
    "cleaning_form_url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accommodation_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stay_bookings" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "external_wp_id" INTEGER,
    "ref" TEXT,
    "contact_id" TEXT,
    "guest_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "accommodation_name" TEXT,
    "accommodation_wp_id" INTEGER,
    "accommodation_unit_id" TEXT,
    "checkin" TIMESTAMP(3),
    "checkout" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_cents" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stay_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accommodation_guest_profiles" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "legacy_wp_guest_id" INTEGER,
    "vip" BOOLEAN NOT NULL DEFAULT false,
    "marketing_consent" BOOLEAN,
    "favourite_unit" TEXT,
    "preferences" TEXT,
    "special_requests" TEXT,
    "guest_notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accommodation_guest_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_installations" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "installed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "installed_by" TEXT,

    CONSTRAINT "app_installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_type" TEXT NOT NULL DEFAULT 'user',
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "changes" JSONB,
    "ip_address" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_prospects" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT,
    "business_name" TEXT NOT NULL,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "industry" TEXT,
    "location" TEXT,
    "website_url" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'prospect',
    "owner_clerk_user_id" TEXT,
    "converted_organisation_id" TEXT,
    "metadata" JSONB,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_prospects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_prospect_audits" (
    "id" TEXT NOT NULL,
    "prospect_id" TEXT NOT NULL,
    "business_health" INTEGER,
    "ai_visibility" INTEGER,
    "seo_score" INTEGER,
    "website_health" INTEGER,
    "findings" JSONB,
    "audit_version" TEXT NOT NULL DEFAULT '1.0',
    "audited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "growth_prospect_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_prospect_reports" (
    "id" TEXT NOT NULL,
    "prospect_id" TEXT NOT NULL,
    "audit_id" TEXT,
    "share_token" TEXT NOT NULL,
    "executive_summary" TEXT,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMP(3),
    "first_viewed_at" TIMESTAMP(3),
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "growth_prospect_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_prospect_engagements" (
    "id" TEXT NOT NULL,
    "prospect_id" TEXT NOT NULL,
    "report_id" TEXT,
    "type" TEXT NOT NULL,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "growth_prospect_engagements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce_products" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "unit_amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "tax_code" TEXT,
    "tax_rate_bps" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commerce_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce_quotes" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "quote_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "source_app" TEXT,
    "source_entity_type" TEXT,
    "source_entity_id" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "subtotal_cents" INTEGER NOT NULL,
    "tax_cents" INTEGER NOT NULL DEFAULT 0,
    "total_cents" INTEGER NOT NULL,
    "valid_until" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "notes" TEXT,
    "line_items" JSONB NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commerce_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce_invoices" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "quote_id" TEXT,
    "invoice_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "source_app" TEXT,
    "source_entity_type" TEXT,
    "source_entity_id" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "subtotal_cents" INTEGER NOT NULL,
    "tax_cents" INTEGER NOT NULL DEFAULT 0,
    "total_cents" INTEGER NOT NULL,
    "due_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "line_items" JSONB NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commerce_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce_payment_requests" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "quote_id" TEXT,
    "invoice_id" TEXT,
    "source_app" TEXT NOT NULL,
    "source_entity_type" TEXT,
    "source_entity_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "subtotal_cents" INTEGER NOT NULL,
    "total_cents" INTEGER NOT NULL,
    "allowed_methods" JSONB,
    "provider_id" TEXT,
    "provider_session_id" TEXT,
    "checkout_url" TEXT,
    "payment_link_url" TEXT,
    "description" TEXT,
    "due_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commerce_payment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce_payments" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "payment_request_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "provider_id" TEXT NOT NULL,
    "provider_payment_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "payment_method" TEXT,
    "paid_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commerce_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce_subscriptions" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "provider_id" TEXT NOT NULL,
    "provider_subscription_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "amount_cents" INTEGER NOT NULL,
    "interval" TEXT NOT NULL DEFAULT 'month',
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commerce_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_subscriptions" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TRIALING',
    "entitlement" TEXT NOT NULL DEFAULT 'FULL',
    "plan_tier" TEXT,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_status" TEXT,
    "trial_start" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "payment_failed_at" TIMESTAMP(3),
    "grace_period_ends_at" TIMESTAMP(3),
    "restricted_at" TIMESTAMP(3),
    "suspended_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "retention_ends_at" TIMESTAMP(3),
    "founding_customer" BOOLEAN NOT NULL DEFAULT false,
    "platform_exempt" BOOLEAN NOT NULL DEFAULT false,
    "day3_reminder_at" TIMESTAMP(3),
    "day7_reminder_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_subscription_events" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'system',
    "stripe_event_id" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_subscription_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_webhook_receipts" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "organisation_id" TEXT,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "claimed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "last_error" TEXT,

    CONSTRAINT "stripe_webhook_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce_refunds" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "provider_refund_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commerce_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_connector_installations" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "account_id" TEXT,
    "credential_ref" TEXT,
    "enabled_methods" JSONB,
    "settings" JSONB,
    "connected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_connector_installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_api_keys" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "scopes" JSONB,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_referrals" (
    "id" TEXT NOT NULL,
    "referrer_organisation_id" TEXT NOT NULL,
    "referred_organisation_id" TEXT,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "invite_email" TEXT,
    "invite_name" TEXT,
    "reward_months_remaining" INTEGER NOT NULL DEFAULT 12,
    "commission_bps" INTEGER NOT NULL DEFAULT 2000,
    "first_paid_at" TIMESTAMP(3),
    "rewarded_until" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_referral_ledger" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "referral_id" TEXT NOT NULL,
    "entry_type" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "description" TEXT,
    "stripe_ref" TEXT,
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_referral_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "websites" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "brief" TEXT,
    "theme" JSONB,
    "seo" JSONB,
    "metadata" JSONB,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "websites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "infrastructure_domains" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "source" TEXT NOT NULL DEFAULT 'connected',
    "provider_id" TEXT NOT NULL DEFAULT 'dreamscape',
    "provider_domain_id" TEXT,
    "provider_customer_id" TEXT,
    "website_id" TEXT,
    "managed" BOOLEAN NOT NULL DEFAULT true,
    "auto_renew" BOOLEAN,
    "expires_at" TIMESTAMP(3),
    "nameservers" JSONB,
    "dns_records" JSONB,
    "dns_configured_at" TIMESTAMP(3),
    "ssl_state" TEXT NOT NULL DEFAULT 'unknown',
    "eligibility" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "infrastructure_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dreamscape_customer_links" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "dreamscape_customer_id" TEXT,
    "contact_identifier" TEXT,
    "customer_name" TEXT,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dreamscape_customer_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dreamscape_webhook_events" (
    "id" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL,
    "domain_name" TEXT,
    "status_id" INTEGER,
    "status_label" TEXT,
    "mapped_status" TEXT,
    "provider_event_id" TEXT,
    "summary" JSONB,
    "raw_keys" JSONB,
    "inventory_updated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dreamscape_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_pages" (
    "id" TEXT NOT NULL,
    "website_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "intent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "seo" JSONB,
    "components" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_applications" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'enquiry',
    "status" TEXT NOT NULL DEFAULT 'open',
    "contact_id" TEXT,
    "loan_amount_cents" INTEGER,
    "lender_name" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commercial_properties" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address_line1" TEXT NOT NULL,
    "suburb" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'AU',
    "status" TEXT NOT NULL DEFAULT 'active',
    "property_type" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commercial_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commercial_leases" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "commercial_property_id" TEXT,
    "title" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'prospect',
    "status" TEXT NOT NULL DEFAULT 'active',
    "landlord_contact_id" TEXT,
    "tenant_contact_id" TEXT,
    "rent_cents" INTEGER,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commercial_leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "organisation_id" TEXT,
    "partner_type" TEXT NOT NULL,
    "cohort" TEXT,
    "commission_bps" INTEGER NOT NULL DEFAULT 2500,
    "commission_duration_months" INTEGER NOT NULL DEFAULT 12,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "referral_code" TEXT NOT NULL,
    "display_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "business_name" TEXT,
    "delivery_role" TEXT,
    "managed_by_partner_id" TEXT,
    "service_commission_bps" INTEGER,
    "override_commission_bps" INTEGER,
    "notes" TEXT,
    "terms_accepted_at" TIMESTAMP(3),
    "terms_version" TEXT,
    "joined_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_referrals" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "referral_code" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "contact_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'link',
    "acquisition_source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REFERRED',
    "referred_contact_id" TEXT,
    "referred_organisation_id" TEXT,
    "referred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contacted_at" TIMESTAMP(3),
    "consultation_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "converted_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_commissions" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "referral_id" TEXT NOT NULL,
    "customer_organisation_id" TEXT,
    "subscription_id" TEXT,
    "commission_bps" INTEGER NOT NULL,
    "commission_kind" TEXT NOT NULL DEFAULT 'direct',
    "revenue_type" TEXT,
    "source_partner_id" TEXT,
    "qualifying_revenue_cents" INTEGER NOT NULL,
    "commission_amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'CALCULATED',
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_commission_events" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "referral_id" TEXT NOT NULL,
    "commission_id" TEXT,
    "subscription_id" TEXT,
    "invoice_id" TEXT,
    "event_type" TEXT NOT NULL,
    "qualifying_amount_cents" INTEGER NOT NULL,
    "commission_bps" INTEGER NOT NULL,
    "commission_amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "period" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_commission_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_partner_attributions" (
    "id" TEXT NOT NULL,
    "customer_organisation_id" TEXT NOT NULL,
    "acquisition_source" TEXT,
    "reseller_partner_id" TEXT,
    "channel_manager_partner_id" TEXT,
    "delivery_partner_id" TEXT,
    "delivery_channel_manager_id" TEXT,
    "reseller_commission_bps" INTEGER,
    "channel_override_bps" INTEGER,
    "delivery_share_bps" INTEGER,
    "delivery_override_bps" INTEGER,
    "commission_period_start" TIMESTAMP(3),
    "commission_period_end" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_partner_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_projects" (
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

-- CreateTable
CREATE TABLE "delivery_milestones" (
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

-- CreateTable
CREATE TABLE "delivery_tasks" (
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

-- CreateTable
CREATE TABLE "delivery_blockers" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_blockers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_properties" (
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

-- CreateTable
CREATE TABLE "pm_leases" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "property_id" TEXT,
    "title" TEXT NOT NULL,
    "address_line1" TEXT,
    "suburb" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'application',
    "status" TEXT NOT NULL DEFAULT 'active',
    "owner_contact_id" TEXT,
    "tenant_contact_id" TEXT,
    "rent_cents" INTEGER,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pm_leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_maintenance_requests" (
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

-- CreateTable
CREATE TABLE "communication_agents" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "provider" TEXT NOT NULL DEFAULT 'elevenlabs',
    "provider_agent_id" TEXT,
    "voice_id" TEXT,
    "model" TEXT,
    "system_prompt" TEXT,
    "greeting" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en-AU',
    "timezone" TEXT NOT NULL DEFAULT 'Australia/Brisbane',
    "business_hours" JSONB,
    "enabled_channels" JSONB,
    "knowledge_base_id" TEXT,
    "routing_rules" JSONB,
    "transfer_rules" JSONB,
    "escalation_rules" JSONB,
    "config" JSONB,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_sessions" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "agent_id" TEXT,
    "contact_id" TEXT,
    "company_id" TEXT,
    "opportunity_id" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'voice',
    "direction" TEXT NOT NULL DEFAULT 'inbound',
    "provider" TEXT NOT NULL DEFAULT 'elevenlabs',
    "provider_session_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "transcript" TEXT,
    "summary" TEXT,
    "sentiment" TEXT,
    "outcome" TEXT,
    "recording_url" TEXT,
    "cost_cents" INTEGER,
    "usage_units" DECIMAL(12,4),
    "caller_phone" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_messages" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "recipient" TEXT,
    "direction" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'voice',
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider_message_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'delivered',
    "metadata" JSONB,

    CONSTRAINT "communication_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_actions" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "session_id" TEXT,
    "agent_id" TEXT,
    "tool" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "input" JSONB,
    "output" JSONB,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "error" TEXT,
    "actor_type" TEXT NOT NULL DEFAULT 'agent',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_usages" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "agent_id" TEXT,
    "session_id" TEXT,
    "provider" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "units" DECIMAL(12,4) NOT NULL,
    "provider_cost_cents" INTEGER,
    "platform_fee_cents" INTEGER,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "communication_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_conversations" (
    "id" TEXT NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "ai_paused" BOOLEAN NOT NULL DEFAULT false,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" SERIAL NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_role" TEXT NOT NULL,
    "sender_clerk_user_id" TEXT,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisations_clerk_org_id_key" ON "organisations"("clerk_org_id");

-- CreateIndex
CREATE UNIQUE INDEX "organisations_slug_key" ON "organisations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organisations_referral_code_key" ON "organisations"("referral_code");

-- CreateIndex
CREATE INDEX "organisations_stripe_connect_account_id_idx" ON "organisations"("stripe_connect_account_id");

-- CreateIndex
CREATE INDEX "memberships_clerk_user_id_idx" ON "memberships"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_organisation_id_clerk_user_id_key" ON "memberships"("organisation_id", "clerk_user_id");

-- CreateIndex
CREATE INDEX "contacts_organisation_id_email_idx" ON "contacts"("organisation_id", "email");

-- CreateIndex
CREATE INDEX "contacts_organisation_id_status_idx" ON "contacts"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "companies_organisation_id_idx" ON "companies"("organisation_id");

-- CreateIndex
CREATE INDEX "activities_organisation_id_entity_type_entity_id_idx" ON "activities"("organisation_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "tasks_organisation_id_status_idx" ON "tasks"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "service_jobs_organisation_id_status_idx" ON "service_jobs"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "service_jobs_organisation_id_stage_idx" ON "service_jobs"("organisation_id", "stage");

-- CreateIndex
CREATE INDEX "service_jobs_organisation_id_scheduled_start_at_idx" ON "service_jobs"("organisation_id", "scheduled_start_at");

-- CreateIndex
CREATE INDEX "service_jobs_organisation_id_contact_id_idx" ON "service_jobs"("organisation_id", "contact_id");

-- CreateIndex
CREATE INDEX "notifications_organisation_id_created_at_idx" ON "notifications"("organisation_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_organisation_id_read_at_idx" ON "notifications"("organisation_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_read_at_idx" ON "notifications"("recipient_user_id", "read_at");

-- CreateIndex
CREATE INDEX "leads_organisation_id_status_idx" ON "leads"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "leads_organisation_id_contact_id_idx" ON "leads"("organisation_id", "contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "opportunities_lead_id_key" ON "opportunities"("lead_id");

-- CreateIndex
CREATE INDEX "opportunities_organisation_id_status_idx" ON "opportunities"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "opportunities_organisation_id_stage_idx" ON "opportunities"("organisation_id", "stage");

-- CreateIndex
CREATE INDEX "properties_organisation_id_status_idx" ON "properties"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "properties_organisation_id_lead_id_idx" ON "properties"("organisation_id", "lead_id");

-- CreateIndex
CREATE INDEX "org_documents_organisation_id_deleted_at_idx" ON "org_documents"("organisation_id", "deleted_at");

-- CreateIndex
CREATE INDEX "org_documents_organisation_id_entity_type_entity_id_idx" ON "org_documents"("organisation_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "org_documents_organisation_id_kind_idx" ON "org_documents"("organisation_id", "kind");

-- CreateIndex
CREATE INDEX "org_documents_organisation_id_document_status_idx" ON "org_documents"("organisation_id", "document_status");

-- CreateIndex
CREATE INDEX "org_documents_organisation_id_signing_status_idx" ON "org_documents"("organisation_id", "signing_status");

-- CreateIndex
CREATE INDEX "org_communications_organisation_id_deleted_at_sent_at_idx" ON "org_communications"("organisation_id", "deleted_at", "sent_at");

-- CreateIndex
CREATE INDEX "org_communications_organisation_id_deleted_at_scheduled_at_idx" ON "org_communications"("organisation_id", "deleted_at", "scheduled_at");

-- CreateIndex
CREATE INDEX "org_communications_organisation_id_channel_idx" ON "org_communications"("organisation_id", "channel");

-- CreateIndex
CREATE INDEX "org_communications_organisation_id_contact_id_idx" ON "org_communications"("organisation_id", "contact_id");

-- CreateIndex
CREATE INDEX "org_communications_organisation_id_status_idx" ON "org_communications"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "org_communications_organisation_id_source_idx" ON "org_communications"("organisation_id", "source");

-- CreateIndex
CREATE INDEX "org_communications_organisation_id_provider_external_id_idx" ON "org_communications"("organisation_id", "provider", "external_id");

-- CreateIndex
CREATE INDEX "accommodation_units_organisation_id_listing_status_idx" ON "accommodation_units"("organisation_id", "listing_status");

-- CreateIndex
CREATE INDEX "accommodation_units_organisation_id_housekeeping_status_idx" ON "accommodation_units"("organisation_id", "housekeeping_status");

-- CreateIndex
CREATE UNIQUE INDEX "accommodation_units_organisation_id_external_wp_id_key" ON "accommodation_units"("organisation_id", "external_wp_id");

-- CreateIndex
CREATE INDEX "stay_bookings_organisation_id_status_idx" ON "stay_bookings"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "stay_bookings_organisation_id_checkin_idx" ON "stay_bookings"("organisation_id", "checkin");

-- CreateIndex
CREATE INDEX "stay_bookings_organisation_id_contact_id_idx" ON "stay_bookings"("organisation_id", "contact_id");

-- CreateIndex
CREATE INDEX "stay_bookings_organisation_id_accommodation_unit_id_idx" ON "stay_bookings"("organisation_id", "accommodation_unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "stay_bookings_organisation_id_external_wp_id_key" ON "stay_bookings"("organisation_id", "external_wp_id");

-- CreateIndex
CREATE UNIQUE INDEX "accommodation_guest_profiles_contact_id_key" ON "accommodation_guest_profiles"("contact_id");

-- CreateIndex
CREATE INDEX "accommodation_guest_profiles_organisation_id_idx" ON "accommodation_guest_profiles"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "accommodation_guest_profiles_organisation_id_legacy_wp_gues_key" ON "accommodation_guest_profiles"("organisation_id", "legacy_wp_guest_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_installations_organisation_id_app_id_key" ON "app_installations"("organisation_id", "app_id");

-- CreateIndex
CREATE INDEX "audit_logs_organisation_id_occurred_at_idx" ON "audit_logs"("organisation_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_organisation_id_entity_type_entity_id_idx" ON "audit_logs"("organisation_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "growth_prospects_organisation_id_stage_idx" ON "growth_prospects"("organisation_id", "stage");

-- CreateIndex
CREATE INDEX "growth_prospects_organisation_id_archived_at_idx" ON "growth_prospects"("organisation_id", "archived_at");

-- CreateIndex
CREATE INDEX "growth_prospects_stage_idx" ON "growth_prospects"("stage");

-- CreateIndex
CREATE INDEX "growth_prospects_owner_clerk_user_id_idx" ON "growth_prospects"("owner_clerk_user_id");

-- CreateIndex
CREATE INDEX "growth_prospects_archived_at_idx" ON "growth_prospects"("archived_at");

-- CreateIndex
CREATE INDEX "growth_prospect_audits_prospect_id_idx" ON "growth_prospect_audits"("prospect_id");

-- CreateIndex
CREATE UNIQUE INDEX "growth_prospect_reports_share_token_key" ON "growth_prospect_reports"("share_token");

-- CreateIndex
CREATE INDEX "growth_prospect_reports_prospect_id_idx" ON "growth_prospect_reports"("prospect_id");

-- CreateIndex
CREATE INDEX "growth_prospect_engagements_prospect_id_type_idx" ON "growth_prospect_engagements"("prospect_id", "type");

-- CreateIndex
CREATE INDEX "commerce_products_organisation_id_active_idx" ON "commerce_products"("organisation_id", "active");

-- CreateIndex
CREATE INDEX "commerce_quotes_organisation_id_status_idx" ON "commerce_quotes"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "commerce_invoices_organisation_id_status_idx" ON "commerce_invoices"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "commerce_invoices_organisation_id_due_at_idx" ON "commerce_invoices"("organisation_id", "due_at");

-- CreateIndex
CREATE INDEX "commerce_payment_requests_organisation_id_status_idx" ON "commerce_payment_requests"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "commerce_payment_requests_organisation_id_source_app_idx" ON "commerce_payment_requests"("organisation_id", "source_app");

-- CreateIndex
CREATE INDEX "commerce_payments_organisation_id_paid_at_idx" ON "commerce_payments"("organisation_id", "paid_at");

-- CreateIndex
CREATE UNIQUE INDEX "commerce_payments_organisation_id_provider_payment_id_key" ON "commerce_payments"("organisation_id", "provider_payment_id");

-- CreateIndex
CREATE INDEX "commerce_subscriptions_organisation_id_status_idx" ON "commerce_subscriptions"("organisation_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "commerce_subscriptions_organisation_id_provider_subscriptio_key" ON "commerce_subscriptions"("organisation_id", "provider_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_subscriptions_organisation_id_key" ON "platform_subscriptions"("organisation_id");

-- CreateIndex
CREATE INDEX "platform_subscriptions_status_idx" ON "platform_subscriptions"("status");

-- CreateIndex
CREATE INDEX "platform_subscriptions_stripe_customer_id_idx" ON "platform_subscriptions"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "platform_subscriptions_stripe_subscription_id_idx" ON "platform_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_subscription_events_stripe_event_id_key" ON "platform_subscription_events"("stripe_event_id");

-- CreateIndex
CREATE INDEX "platform_subscription_events_organisation_id_created_at_idx" ON "platform_subscription_events"("organisation_id", "created_at");

-- CreateIndex
CREATE INDEX "platform_subscription_events_subscription_id_created_at_idx" ON "platform_subscription_events"("subscription_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_webhook_receipts_event_id_key" ON "stripe_webhook_receipts"("event_id");

-- CreateIndex
CREATE INDEX "stripe_webhook_receipts_processed_at_idx" ON "stripe_webhook_receipts"("processed_at");

-- CreateIndex
CREATE INDEX "stripe_webhook_receipts_status_claimed_at_idx" ON "stripe_webhook_receipts"("status", "claimed_at");

-- CreateIndex
CREATE UNIQUE INDEX "commerce_refunds_organisation_id_provider_refund_id_key" ON "commerce_refunds"("organisation_id", "provider_refund_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_connector_installations_organisation_id_provider_id_key" ON "payment_connector_installations"("organisation_id", "provider_id");

-- CreateIndex
CREATE INDEX "platform_api_keys_organisation_id_idx" ON "platform_api_keys"("organisation_id");

-- CreateIndex
CREATE INDEX "platform_api_keys_key_hash_idx" ON "platform_api_keys"("key_hash");

-- CreateIndex
CREATE UNIQUE INDEX "platform_referrals_referred_organisation_id_key" ON "platform_referrals"("referred_organisation_id");

-- CreateIndex
CREATE INDEX "platform_referrals_referrer_organisation_id_status_idx" ON "platform_referrals"("referrer_organisation_id", "status");

-- CreateIndex
CREATE INDEX "platform_referrals_code_idx" ON "platform_referrals"("code");

-- CreateIndex
CREATE INDEX "platform_referrals_invite_email_idx" ON "platform_referrals"("invite_email");

-- CreateIndex
CREATE INDEX "platform_referral_ledger_organisation_id_created_at_idx" ON "platform_referral_ledger"("organisation_id", "created_at");

-- CreateIndex
CREATE INDEX "platform_referral_ledger_referral_id_idx" ON "platform_referral_ledger"("referral_id");

-- CreateIndex
CREATE UNIQUE INDEX "websites_slug_key" ON "websites"("slug");

-- CreateIndex
CREATE INDEX "websites_organisation_id_status_idx" ON "websites"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "infrastructure_domains_name_idx" ON "infrastructure_domains"("name");

-- CreateIndex
CREATE INDEX "infrastructure_domains_organisation_id_status_idx" ON "infrastructure_domains"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "infrastructure_domains_website_id_idx" ON "infrastructure_domains"("website_id");

-- CreateIndex
CREATE UNIQUE INDEX "infrastructure_domains_organisation_id_name_key" ON "infrastructure_domains"("organisation_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "dreamscape_customer_links_organisation_id_key" ON "dreamscape_customer_links"("organisation_id");

-- CreateIndex
CREATE INDEX "dreamscape_customer_links_dreamscape_customer_id_idx" ON "dreamscape_customer_links"("dreamscape_customer_id");

-- CreateIndex
CREATE INDEX "dreamscape_customer_links_contact_identifier_idx" ON "dreamscape_customer_links"("contact_identifier");

-- CreateIndex
CREATE INDEX "dreamscape_webhook_events_received_at_idx" ON "dreamscape_webhook_events"("received_at");

-- CreateIndex
CREATE INDEX "dreamscape_webhook_events_domain_name_idx" ON "dreamscape_webhook_events"("domain_name");

-- CreateIndex
CREATE INDEX "dreamscape_webhook_events_kind_idx" ON "dreamscape_webhook_events"("kind");

-- CreateIndex
CREATE INDEX "website_pages_website_id_sort_order_idx" ON "website_pages"("website_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "website_pages_website_id_slug_key" ON "website_pages"("website_id", "slug");

-- CreateIndex
CREATE INDEX "finance_applications_organisation_id_status_idx" ON "finance_applications"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "finance_applications_organisation_id_stage_idx" ON "finance_applications"("organisation_id", "stage");

-- CreateIndex
CREATE INDEX "finance_applications_organisation_id_contact_id_idx" ON "finance_applications"("organisation_id", "contact_id");

-- CreateIndex
CREATE INDEX "commercial_properties_organisation_id_status_idx" ON "commercial_properties"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "commercial_leases_organisation_id_status_idx" ON "commercial_leases"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "commercial_leases_organisation_id_stage_idx" ON "commercial_leases"("organisation_id", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "partners_referral_code_key" ON "partners"("referral_code");

-- CreateIndex
CREATE INDEX "partners_clerk_user_id_idx" ON "partners"("clerk_user_id");

-- CreateIndex
CREATE INDEX "partners_status_idx" ON "partners"("status");

-- CreateIndex
CREATE INDEX "partners_referral_code_idx" ON "partners"("referral_code");

-- CreateIndex
CREATE INDEX "partners_managed_by_partner_id_idx" ON "partners"("managed_by_partner_id");

-- CreateIndex
CREATE INDEX "partner_referrals_partner_id_status_idx" ON "partner_referrals"("partner_id", "status");

-- CreateIndex
CREATE INDEX "partner_referrals_referral_code_idx" ON "partner_referrals"("referral_code");

-- CreateIndex
CREATE INDEX "partner_referrals_email_idx" ON "partner_referrals"("email");

-- CreateIndex
CREATE INDEX "partner_referrals_referred_organisation_id_idx" ON "partner_referrals"("referred_organisation_id");

-- CreateIndex
CREATE INDEX "partner_commissions_partner_id_status_idx" ON "partner_commissions"("partner_id", "status");

-- CreateIndex
CREATE INDEX "partner_commissions_referral_id_idx" ON "partner_commissions"("referral_id");

-- CreateIndex
CREATE INDEX "partner_commissions_customer_organisation_id_idx" ON "partner_commissions"("customer_organisation_id");

-- CreateIndex
CREATE INDEX "partner_commission_events_partner_id_idx" ON "partner_commission_events"("partner_id");

-- CreateIndex
CREATE INDEX "partner_commission_events_referral_id_idx" ON "partner_commission_events"("referral_id");

-- CreateIndex
CREATE INDEX "partner_commission_events_commission_id_idx" ON "partner_commission_events"("commission_id");

-- CreateIndex
CREATE INDEX "partner_commission_events_invoice_id_idx" ON "partner_commission_events"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_partner_attributions_customer_organisation_id_key" ON "customer_partner_attributions"("customer_organisation_id");

-- CreateIndex
CREATE INDEX "customer_partner_attributions_reseller_partner_id_idx" ON "customer_partner_attributions"("reseller_partner_id");

-- CreateIndex
CREATE INDEX "customer_partner_attributions_channel_manager_partner_id_idx" ON "customer_partner_attributions"("channel_manager_partner_id");

-- CreateIndex
CREATE INDEX "customer_partner_attributions_delivery_partner_id_idx" ON "customer_partner_attributions"("delivery_partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_projects_reference_code_key" ON "delivery_projects"("reference_code");

-- CreateIndex
CREATE INDEX "delivery_projects_customer_organisation_id_idx" ON "delivery_projects"("customer_organisation_id");

-- CreateIndex
CREATE INDEX "delivery_projects_status_idx" ON "delivery_projects"("status");

-- CreateIndex
CREATE INDEX "delivery_projects_health_idx" ON "delivery_projects"("health");

-- CreateIndex
CREATE INDEX "delivery_projects_owner_partner_id_idx" ON "delivery_projects"("owner_partner_id");

-- CreateIndex
CREATE INDEX "delivery_projects_delivery_lead_partner_id_idx" ON "delivery_projects"("delivery_lead_partner_id");

-- CreateIndex
CREATE INDEX "delivery_milestones_project_id_sort_order_idx" ON "delivery_milestones"("project_id", "sort_order");

-- CreateIndex
CREATE INDEX "delivery_tasks_project_id_status_idx" ON "delivery_tasks"("project_id", "status");

-- CreateIndex
CREATE INDEX "delivery_tasks_assignee_partner_id_due_at_idx" ON "delivery_tasks"("assignee_partner_id", "due_at");

-- CreateIndex
CREATE INDEX "delivery_blockers_project_id_status_idx" ON "delivery_blockers"("project_id", "status");

-- CreateIndex
CREATE INDEX "pm_properties_organisation_id_status_idx" ON "pm_properties"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "pm_leases_organisation_id_status_idx" ON "pm_leases"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "pm_leases_organisation_id_stage_idx" ON "pm_leases"("organisation_id", "stage");

-- CreateIndex
CREATE INDEX "pm_leases_organisation_id_property_id_idx" ON "pm_leases"("organisation_id", "property_id");

-- CreateIndex
CREATE INDEX "pm_maintenance_requests_organisation_id_status_idx" ON "pm_maintenance_requests"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "pm_maintenance_requests_organisation_id_property_id_idx" ON "pm_maintenance_requests"("organisation_id", "property_id");

-- CreateIndex
CREATE INDEX "communication_agents_organisation_id_status_idx" ON "communication_agents"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "communication_agents_organisation_id_provider_idx" ON "communication_agents"("organisation_id", "provider");

-- CreateIndex
CREATE INDEX "communication_agents_provider_agent_id_idx" ON "communication_agents"("provider_agent_id");

-- CreateIndex
CREATE INDEX "communication_sessions_organisation_id_started_at_idx" ON "communication_sessions"("organisation_id", "started_at");

-- CreateIndex
CREATE INDEX "communication_sessions_organisation_id_status_idx" ON "communication_sessions"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "communication_sessions_organisation_id_contact_id_idx" ON "communication_sessions"("organisation_id", "contact_id");

-- CreateIndex
CREATE INDEX "communication_sessions_agent_id_idx" ON "communication_sessions"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "communication_sessions_organisation_id_provider_provider_se_key" ON "communication_sessions"("organisation_id", "provider", "provider_session_id");

-- CreateIndex
CREATE INDEX "communication_messages_session_id_timestamp_idx" ON "communication_messages"("session_id", "timestamp");

-- CreateIndex
CREATE INDEX "communication_messages_organisation_id_idx" ON "communication_messages"("organisation_id");

-- CreateIndex
CREATE INDEX "agent_actions_organisation_id_created_at_idx" ON "agent_actions"("organisation_id", "created_at");

-- CreateIndex
CREATE INDEX "agent_actions_session_id_idx" ON "agent_actions"("session_id");

-- CreateIndex
CREATE INDEX "communication_usages_organisation_id_occurred_at_idx" ON "communication_usages"("organisation_id", "occurred_at");

-- CreateIndex
CREATE INDEX "communication_usages_organisation_id_provider_idx" ON "communication_usages"("organisation_id", "provider");

-- CreateIndex
CREATE INDEX "support_conversations_organisation_id_last_message_at_idx" ON "support_conversations"("organisation_id", "last_message_at");

-- CreateIndex
CREATE INDEX "support_conversations_last_message_at_idx" ON "support_conversations"("last_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "support_conversations_clerk_user_id_organisation_id_key" ON "support_conversations"("clerk_user_id", "organisation_id");

-- CreateIndex
CREATE INDEX "support_messages_conversation_id_id_idx" ON "support_messages"("conversation_id", "id");

-- AddForeignKey
ALTER TABLE "organisations" ADD CONSTRAINT "organisations_referred_by_organisation_id_fkey" FOREIGN KEY ("referred_by_organisation_id") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_jobs" ADD CONSTRAINT "service_jobs_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_jobs" ADD CONSTRAINT "service_jobs_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_documents" ADD CONSTRAINT "org_documents_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_communications" ADD CONSTRAINT "org_communications_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_units" ADD CONSTRAINT "accommodation_units_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stay_bookings" ADD CONSTRAINT "stay_bookings_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stay_bookings" ADD CONSTRAINT "stay_bookings_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stay_bookings" ADD CONSTRAINT "stay_bookings_accommodation_unit_id_fkey" FOREIGN KEY ("accommodation_unit_id") REFERENCES "accommodation_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_guest_profiles" ADD CONSTRAINT "accommodation_guest_profiles_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_guest_profiles" ADD CONSTRAINT "accommodation_guest_profiles_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_installations" ADD CONSTRAINT "app_installations_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_prospects" ADD CONSTRAINT "growth_prospects_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_prospects" ADD CONSTRAINT "growth_prospects_converted_organisation_id_fkey" FOREIGN KEY ("converted_organisation_id") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_prospect_audits" ADD CONSTRAINT "growth_prospect_audits_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "growth_prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_prospect_reports" ADD CONSTRAINT "growth_prospect_reports_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "growth_prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_prospect_engagements" ADD CONSTRAINT "growth_prospect_engagements_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "growth_prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_products" ADD CONSTRAINT "commerce_products_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_quotes" ADD CONSTRAINT "commerce_quotes_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_invoices" ADD CONSTRAINT "commerce_invoices_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_invoices" ADD CONSTRAINT "commerce_invoices_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "commerce_quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_payment_requests" ADD CONSTRAINT "commerce_payment_requests_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_payment_requests" ADD CONSTRAINT "commerce_payment_requests_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "commerce_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_payments" ADD CONSTRAINT "commerce_payments_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_payments" ADD CONSTRAINT "commerce_payments_payment_request_id_fkey" FOREIGN KEY ("payment_request_id") REFERENCES "commerce_payment_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_subscriptions" ADD CONSTRAINT "commerce_subscriptions_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_subscriptions" ADD CONSTRAINT "platform_subscriptions_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_subscription_events" ADD CONSTRAINT "platform_subscription_events_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_subscription_events" ADD CONSTRAINT "platform_subscription_events_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "platform_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_webhook_receipts" ADD CONSTRAINT "stripe_webhook_receipts_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_refunds" ADD CONSTRAINT "commerce_refunds_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_refunds" ADD CONSTRAINT "commerce_refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "commerce_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_connector_installations" ADD CONSTRAINT "payment_connector_installations_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_api_keys" ADD CONSTRAINT "platform_api_keys_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_referrals" ADD CONSTRAINT "platform_referrals_referrer_organisation_id_fkey" FOREIGN KEY ("referrer_organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_referrals" ADD CONSTRAINT "platform_referrals_referred_organisation_id_fkey" FOREIGN KEY ("referred_organisation_id") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_referral_ledger" ADD CONSTRAINT "platform_referral_ledger_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_referral_ledger" ADD CONSTRAINT "platform_referral_ledger_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "platform_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "infrastructure_domains" ADD CONSTRAINT "infrastructure_domains_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "infrastructure_domains" ADD CONSTRAINT "infrastructure_domains_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dreamscape_customer_links" ADD CONSTRAINT "dreamscape_customer_links_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_pages" ADD CONSTRAINT "website_pages_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_applications" ADD CONSTRAINT "finance_applications_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_applications" ADD CONSTRAINT "finance_applications_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_properties" ADD CONSTRAINT "commercial_properties_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_leases" ADD CONSTRAINT "commercial_leases_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_leases" ADD CONSTRAINT "commercial_leases_commercial_property_id_fkey" FOREIGN KEY ("commercial_property_id") REFERENCES "commercial_properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_leases" ADD CONSTRAINT "commercial_leases_landlord_contact_id_fkey" FOREIGN KEY ("landlord_contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_leases" ADD CONSTRAINT "commercial_leases_tenant_contact_id_fkey" FOREIGN KEY ("tenant_contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_managed_by_partner_id_fkey" FOREIGN KEY ("managed_by_partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_referrals" ADD CONSTRAINT "partner_referrals_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "partner_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_commission_events" ADD CONSTRAINT "partner_commission_events_commission_id_fkey" FOREIGN KEY ("commission_id") REFERENCES "partner_commissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_projects" ADD CONSTRAINT "delivery_projects_customer_organisation_id_fkey" FOREIGN KEY ("customer_organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_projects" ADD CONSTRAINT "delivery_projects_owner_partner_id_fkey" FOREIGN KEY ("owner_partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_projects" ADD CONSTRAINT "delivery_projects_delivery_lead_partner_id_fkey" FOREIGN KEY ("delivery_lead_partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_milestones" ADD CONSTRAINT "delivery_milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "delivery_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_tasks" ADD CONSTRAINT "delivery_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "delivery_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_tasks" ADD CONSTRAINT "delivery_tasks_assignee_partner_id_fkey" FOREIGN KEY ("assignee_partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_blockers" ADD CONSTRAINT "delivery_blockers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "delivery_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_properties" ADD CONSTRAINT "pm_properties_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_leases" ADD CONSTRAINT "pm_leases_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_leases" ADD CONSTRAINT "pm_leases_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "pm_properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_leases" ADD CONSTRAINT "pm_leases_owner_contact_id_fkey" FOREIGN KEY ("owner_contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_leases" ADD CONSTRAINT "pm_leases_tenant_contact_id_fkey" FOREIGN KEY ("tenant_contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_maintenance_requests" ADD CONSTRAINT "pm_maintenance_requests_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_maintenance_requests" ADD CONSTRAINT "pm_maintenance_requests_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "pm_properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_maintenance_requests" ADD CONSTRAINT "pm_maintenance_requests_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_agents" ADD CONSTRAINT "communication_agents_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_sessions" ADD CONSTRAINT "communication_sessions_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_sessions" ADD CONSTRAINT "communication_sessions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "communication_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "communication_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "communication_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_usages" ADD CONSTRAINT "communication_usages_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "support_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

