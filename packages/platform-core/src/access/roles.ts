/**
 * DigitalGate access model — locked August 2026.
 * @see docs/foundations/ROLES-PERMISSIONS-SIDEBAR.md
 *
 * Organisation → Subscription → Apps → Role → Permissions
 * Nav hide ≠ security. Enforce at API / data layer.
 */

/** Platform-level (DigitalGate internal) — not customer org roles. */
export type PlatformUserType =
  | "digitalgate_owner"
  | "digitalgate_admin"
  | "digitalgate_member";

/** Customer organisation roles — independent per tenant. */
export type OrganisationRole =
  | "organisation_owner"
  | "organisation_admin"
  | "organisation_member";

/** Partner capabilities — independently permissioned. */
export type PartnerCapability =
  | "reseller"
  | "delivery_partner"
  | "success_partner";

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "export"
  | "manage"
  | "approve"
  | "assign";

export type PermissionScope =
  | "own"
  | "assigned"
  | "team"
  | "organisation";

export type PermissionModule =
  | "crm"
  | "commerce"
  | "documents"
  | "communications"
  | "websites"
  | "infrastructure"
  | "industry"
  | "growth"
  | "intelligence"
  | "team"
  | "billing"
  | "settings"
  | "partners"
  | "delivery"
  | "platform_admin";

export type PermissionGrant = {
  module: PermissionModule;
  /** Optional sub-module e.g. opportunities */
  subModule?: string;
  action: PermissionAction;
  scope: PermissionScope;
};

export const PLATFORM_USER_TYPE_LABELS: Record<PlatformUserType, string> = {
  digitalgate_owner: "DigitalGate Owner",
  digitalgate_admin: "DigitalGate Admin",
  digitalgate_member: "DigitalGate Member",
};

export const ORGANISATION_ROLE_LABELS: Record<OrganisationRole, string> = {
  organisation_owner: "Organisation Owner",
  organisation_admin: "Organisation Admin",
  organisation_member: "Organisation Member",
};

export const PARTNER_CAPABILITY_LABELS: Record<PartnerCapability, string> = {
  reseller: "Reseller",
  delivery_partner: "Delivery Partner",
  success_partner: "Success / Support Partner",
};

/** Defaults — overrides via PermissionGrant[]. */
export const ORGANISATION_ROLE_DEFAULTS: Record<
  OrganisationRole,
  {
    summary: string;
    denyByDefault: string[];
  }
> = {
  organisation_owner: {
    summary:
      "Primary account holder — full organisation, billing, users, Apps, Twin, Goals, security.",
    denyByDefault: ["platform_admin"],
  },
  organisation_admin: {
    summary:
      "Operational administrator — runs the organisation; not ultimate ownership controls.",
    denyByDefault: [
      "transfer_ownership",
      "delete_organisation",
      "platform_admin",
    ],
  },
  organisation_member: {
    summary:
      "Operational user — assigned records and enabled Apps; no billing or user admin by default.",
    denyByDefault: [
      "billing",
      "user_admin",
      "subscription_manage",
      "platform_admin",
      "org_wide_financials",
    ],
  },
};

export const PLATFORM_USER_DEFAULTS: Record<
  PlatformUserType,
  {
    summary: string;
    denyByDefault: string[];
  }
> = {
  digitalgate_owner: {
    summary:
      "Platform-level owner — DigitalGate org plus authorised customer/partner/platform admin surfaces.",
    denyByDefault: [],
  },
  digitalgate_admin: {
    summary:
      "Elevated DigitalGate staff — Command Centre, Founding, partners, delivery, assigned customers.",
    denyByDefault: [
      "unrestricted_financial",
      "platform_security",
      "global_feature_flags",
      "organisation_deletion",
    ],
  },
  digitalgate_member: {
    summary:
      "Operational DigitalGate staff — assigned work only; no global billing or security.",
    denyByDefault: [
      "global_billing",
      "commission_configuration",
      "platform_security",
      "api_management",
      "organisation_deletion",
      "global_system_settings",
    ],
  },
};

/**
 * Access evaluation input — wire into API guards as the permission system ships.
 */
export type AccessContext = {
  platformUserType?: PlatformUserType | null;
  organisationRole?: OrganisationRole | null;
  partnerCapabilities?: PartnerCapability[];
  enabledAppIds: string[];
  grants?: PermissionGrant[];
  /** Active Industry App + Template when relevant */
  industryAppId?: string | null;
  templateId?: string | null;
};

export const ACCESS_CHAIN =
  "User → Organisation → Role → Permissions → Subscription → Activated Apps → Industry → Template" as const;

export const ACCESS_SECURITY_LOCK =
  "Permissions must be enforced at the API/data layer, not merely by hiding navigation." as const;
