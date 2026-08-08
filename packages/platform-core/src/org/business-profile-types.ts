/**
 * Business Profile — Digital Business Identity / foundation for Digital Twin™.
 * Every app and AI capability reads from this record via getBusinessContext().
 */

export type BusinessLocation = {
  label?: string;
  street?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  isPrimary?: boolean;
};

export type BusinessHours = {
  timezone?: string;
  /** Free-text or structured schedule, e.g. "Mon–Fri 9am–5pm" */
  schedule?: string;
};

export type SocialProfiles = {
  googleBusiness?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
  x?: string;
  pinterest?: string;
};

/** Editable fields that power zero-prompt AI generation */
export type BusinessBrandVoice = {
  tagline?: string;
  tone?: string;
  services?: string;
  targetAudience?: string;
  competitors?: string;
};

/** Remittance details for AU tax invoices / quotes */
export type BusinessBankDetails = {
  accountName?: string;
  bsb?: string;
  accountNumber?: string;
  bankName?: string;
  /** Shown on documents, e.g. "Please quote invoice number" */
  paymentReferenceHint?: string;
};

/**
 * Tax defaults for Commerce documents (AU Country Pack first).
 * Stored on Business Profile — not a separate GL tax engine.
 */
export type BusinessTaxSettings = {
  /** ISO country for tax conventions (AU default) */
  country?: string;
  /** Registered for GST — drives Tax Invoice wording */
  gstRegistered?: boolean;
  /** Default rate in basis points (AU GST = 1000 = 10%) */
  defaultTaxRateBps?: number;
  /** When true, line unit amounts are GST-inclusive */
  pricesIncludeTax?: boolean;
};

export type OrganisationBusinessProfile = {
  /** Legal / registered name */
  businessName?: string;
  tradingName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  businessPhone?: string;
  businessEmail?: string;
  supportEmail?: string;
  supportPhone?: string;
  abn?: string;
  acn?: string;
  gstNumber?: string;
  industryLicenseNumber?: string;
  position?: string;
  /** Full wordmark / horizontal logo */
  logoUrl?: string;
  /** Square mark for sidebar, favicon, and compact UI */
  iconUrl?: string;
  /** Comma-separated or JSON colour tokens — 1st = primary, 2nd = accent, 3rd = document background */
  brandColours?: string;
  websiteUrl?: string;
  industryVertical?: string;
  platformTier?: string;
  purchasedApps?: string[];
  purchasedPremium?: string[];
  purchasedAddons?: string[];
  /** Primary address (legacy onboarding) */
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  locations?: BusinessLocation[];
  businessHours?: BusinessHours;
  social?: SocialProfiles;
  brandVoice?: BusinessBrandVoice;
  /** Bank / EFT remittance for invoices & quotes */
  bankDetails?: BusinessBankDetails;
  /** GST / sales-tax defaults for Commerce */
  taxSettings?: BusinessTaxSettings;
  wpContactId?: number;
  wpOrganisationId?: number;
  purchaseLabel?: string;
  syncedAt?: string;
  updatedAt?: string;
};

export type BusinessProfilePatch = Partial<
  Omit<
    OrganisationBusinessProfile,
    "wpContactId" | "wpOrganisationId" | "syncedAt" | "purchaseLabel"
  >
>;
