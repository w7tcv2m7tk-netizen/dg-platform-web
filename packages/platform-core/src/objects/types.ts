/**
 * Universal object type identifiers.
 * Apps extend these — they do not create parallel types for the same concept.
 */

export const UNIVERSAL_OBJECTS = {
  identity: ["Contact", "Company", "User", "Organisation"],
  commercial: ["Lead", "Opportunity", "Deal", "Quote", "Invoice", "Subscription"],
  operational: ["Task", "Activity", "Note", "Document", "Event"],
  assets: ["Property", "Accommodation", "Vehicle", "Product", "Service"],
} as const;

export type UniversalObjectCategory = keyof typeof UNIVERSAL_OBJECTS;

export type UniversalObjectType =
  (typeof UNIVERSAL_OBJECTS)[UniversalObjectCategory][number];

/** Base fields shared by all tenant-scoped objects */
export interface TenantScoped {
  id: string;
  organisationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactObject extends TenantScoped {
  type: "Contact";
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status: string;
  source?: string;
  tags?: string;
}

export interface CompanyObject extends TenantScoped {
  type: "Company";
  name: string;
  website?: string;
}

export interface ActivityObject extends TenantScoped {
  type: "Activity";
  entityType: string;
  entityId: string;
  activityType: string;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
}
