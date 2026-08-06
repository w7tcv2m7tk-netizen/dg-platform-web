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
  /** Comma-separated or JSON colour tokens — first = primary, second = accent */
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
