/** Stripe purchase metadata from WordPress portal/me */
export type PortalPurchaseProfile = {
  dg_category?: string;
  dg_plan?: string;
  dg_platform_tier?: string;
  purchase_label?: string;
  stripe_session_id?: string;
};

/** Onboarding profile payload from WordPress portal/me */
export type PortalOnboardingProfile = {
  business_name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  phone?: string;
  business_email?: string;
  abn?: string;
  gst_number?: string;
  industry_license_number?: string;
  position?: string;
  street_address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  website_url?: string;
  industry_vertical?: string;
  platform_tier?: string;
  purchased_apps?: string[];
  purchased_premium?: string[];
  purchased_addons?: string[];
  logo_url?: string;
  brand_colours?: string;
};
