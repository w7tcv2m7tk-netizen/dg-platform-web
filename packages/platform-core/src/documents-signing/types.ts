/**
 * Documents & Signing — Core platform contracts.
 *
 * Document Engine + Signing Engine live in Core.
 * Industry Apps supply templates; Automation owns post-sign workflow.
 * E-sign providers are modular adapters — DigitalGate owns the business record.
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

export type DocumentSigningStatus =
  | "draft"
  | "ready"
  | "sent"
  | "viewed"
  | "partially_signed"
  | "completed"
  | "declined"
  | "expired"
  | "void";

/** Modular e-sign provider — never hard-code a single vendor into Industry Apps. */
export type SigningProviderId =
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
 * Directional Core Document record (metadata). Binary storage remains via Asset/Blob service.
 * Existing property agency/disclosure uploads are early property-scoped views of this model.
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
  signingStatus: DocumentSigningStatus;
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

export type IndustryDocumentTemplate = {
  id: string;
  industryAppId: string;
  kind: DocumentKind;
  label: string;
  /** CRM / Property field keys used to populate the template. */
  populateFrom: string[];
  /** Suggested Automation triggers after signing completes. */
  onCompletedWorkflowHints: string[];
};

/** Real Estate templates that Industry App will own (direction). */
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
    onCompletedWorkflowHints: ["store_signed_document_on_property", "rea_soi_attachment_when_applicable"],
  },
  {
    id: "re.contract",
    industryAppId: "real-estate",
    kind: "contract",
    label: "Sale / purchase contract",
    populateFrom: ["property", "contact", "opportunity"],
    onCompletedWorkflowHints: ["opportunity.stage_update", "store_signed_document_on_property"],
  },
];

/**
 * Target RE operating path — Documents & Signing connected to CRM.
 * Not fully implemented; guides product and Automation design.
 */
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
