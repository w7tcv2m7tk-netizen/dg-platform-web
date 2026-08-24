/**
 * Documents & Signing — Core platform contracts.
 *
 * Documents is a Core business capability, not an Industry App.
 * Industry Apps (RE, PM, Legal, Finance, Services) create, associate and surface
 * documents in their workflows — they do not own the document system.
 *
 * Real Estate is the first consumer of Core Documents, not the owner.
 *
 * Manual upload is MVP implementation only — not the product definition.
 * Product surface: Upload · Create · Send for signature · Track · Complete
 *
 * @see docs/foundations/DOCUMENTS-AND-SIGNING.md
 */

/** Industry-facing document kinds that map onto Core Document + templates. */
export type DocumentKind =
  | "agency_agreement"
  | "disclosure_statement"
  | "contract"
  | "engagement"
  | "authority"
  | "loan_document"
  | "service_agreement"
  | "other";

/** Document lifecycle (record state) — separate from signing. */
export type DocumentStatus = "draft" | "active" | "archived";

/**
 * Signing lifecycle.
 * MVP often jumps Upload → Completed; statuses exist so providers plug in later.
 */
export type DocumentSigningStatus =
  | "not_required"
  | "ready"
  | "sent"
  | "viewed"
  | "completed"
  | "declined"
  | "expired";

/** Modular e-sign provider — never hard-code a single vendor into Industry Apps. */
export type SigningProviderId =
  | "none"
  | "manual_upload"
  | "dropbox_sign"
  | "docusign"
  | "adobe_sign"
  | "other";

export type DocumentEntityLink = {
  entityType: "opportunity" | "property" | "contact" | "company" | "lead" | "other";
  entityId: string;
};

/**
 * Core Document record (metadata). Binary storage via Asset/Blob service.
 * Property agency/disclosure panels are contextual views into this model.
 */
export type PlatformDocument = {
  id: string;
  organisationId: string;
  name: string;
  kind: DocumentKind;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  url?: string;
  version: number;
  documentStatus: DocumentStatus;
  signingStatus: DocumentSigningStatus;
  signingProvider: SigningProviderId;
  sourceApp?: string;
  links: DocumentEntityLink[];
  templateId?: string;
  createdAt: string;
  updatedAt: string;
};

export type SigningRecipient = {
  role: string;
  name?: string;
  email: string;
  status: DocumentSigningStatus;
  signedAt?: string;
};

export type SigningRequest = {
  id: string;
  organisationId: string;
  documentId: string;
  provider: SigningProviderId;
  externalId?: string;
  status: DocumentSigningStatus;
  recipients: SigningRecipient[];
  sentAt?: string;
  completedAt?: string;
  auditNote?: string;
};

/**
 * Document events for Automation → Advisor → Brain → Timeline → Notifications.
 * Emit as the platform event bus matures; catalogue is locked now.
 */
export const DOCUMENT_EVENT_IDS = [
  "document.created",
  "document.uploaded",
  "document.updated",
  "document.archived",
  "document.replaced",
  "document.signing_requested",
  "document.viewed",
  "document.signed",
  "document.completed",
] as const;

export type DocumentEventId = (typeof DOCUMENT_EVENT_IDS)[number];

export type IndustryDocumentTemplate = {
  id: string;
  industryAppId: string;
  kind: DocumentKind;
  label: string;
  populateFrom: string[];
  onCompletedWorkflowHints: string[];
};

/** Real Estate templates — Industry App owns templates; Core owns the document record. */
export const REAL_ESTATE_DOCUMENT_TEMPLATES: IndustryDocumentTemplate[] = [
  {
    id: "re.agency_agreement",
    industryAppId: "real-estate",
    kind: "agency_agreement",
    label: "Agency / listing authority",
    populateFrom: ["property", "contact", "opportunity", "organisation"],
    onCompletedWorkflowHints: [
      "opportunity.status → listing_won",
      "create_or_update_listing",
      "store_signed_document_on_property",
    ],
  },
  {
    id: "re.disclosure_statement",
    industryAppId: "real-estate",
    kind: "disclosure_statement",
    label: "Disclosure statement",
    populateFrom: ["property", "organisation"],
    onCompletedWorkflowHints: [
      "store_signed_document_on_property",
      "rea_soi_attachment_when_applicable",
    ],
  },
  {
    id: "re.contract",
    industryAppId: "real-estate",
    kind: "contract",
    label: "Sale / purchase contract",
    populateFrom: ["property", "contact", "opportunity"],
    onCompletedWorkflowHints: [
      "opportunity.stage_update",
      "store_signed_document_on_property",
    ],
  },
];

export const REAL_ESTATE_AGENCY_AGREEMENT_WORKFLOW = [
  "vendor_prospect",
  "appraisal",
  "opportunity",
  "agency_agreement",
  "send_for_signature",
  "vendor_signs",
  "document_stored",
  "opportunity_listing_won",
  "listing_created",
] as const;
