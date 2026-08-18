export const CONTACT_SOURCES = [
  { id: "crm", label: "Existing CRM" },
  { id: "spreadsheet", label: "Excel / spreadsheets" },
  { id: "google_contacts", label: "Google Contacts" },
  { id: "outlook", label: "Outlook" },
  { id: "website", label: "Website" },
  { id: "accounting", label: "Accounting software" },
  { id: "industry", label: "Industry software" },
  { id: "multiple", label: "Multiple systems" },
  { id: "none", label: "Nowhere centralised" },
] as const;

export const CONTACT_VOLUMES = [
  { id: "lt100", label: "<100" },
  { id: "100_500", label: "100–500" },
  { id: "500_2000", label: "500–2,000" },
  { id: "2000_10000", label: "2,000–10,000" },
  { id: "10000_plus", label: "10,000+" },
] as const;

export const WEBSITE_PLATFORMS = [
  "WordPress",
  "Shopify",
  "Wix",
  "Squarespace",
  "DigitalGate Websites",
  "Other",
] as const;

export const CRM_SYSTEMS = [
  "HubSpot",
  "Salesforce",
  "GoHighLevel",
  "Zoho",
  "Industry CRM",
  "Spreadsheet",
  "None",
  "Other",
] as const;

export const ACCOUNTING_SYSTEMS = ["Xero", "MYOB", "QuickBooks", "Other", "None"] as const;

export const COMMUNICATION_SYSTEMS = [
  "Gmail",
  "Microsoft 365",
  "Outlook",
  "WhatsApp",
  "SMS",
] as const;

export const MARKETING_SYSTEMS = [
  "Google Ads",
  "Meta",
  "Mailchimp",
  "Klaviyo",
  "Other",
] as const;

export const BOOKING_SYSTEMS = [
  "Calendly",
  "Acuity",
  "Industry platform",
  "Other",
  "None",
] as const;

export const ANALYTICS_SYSTEMS = ["GA4", "Search Console", "Meta", "Other"] as const;

export const CORE_APP_OPTIONS = [
  "CRM",
  "Contacts",
  "Opportunities",
  "Tasks",
  "Calendar",
  "Documents",
  "Communications",
] as const;

export const INFRA_APP_OPTIONS = [
  "Website Connection",
  "Website Management",
  "Website Builder",
  "Domains",
  "Email",
  "Hosting",
] as const;

export const INDUSTRY_APP_OPTIONS = [
  "Real Estate",
  "Accommodation",
  "Services",
  "Finance",
  "Other",
] as const;

export const GROWTH_APP_OPTIONS = [
  "AI Visibility",
  "SEO",
  "Automation",
  "Prospecting",
  "Analytics",
  "Reputation",
  "Social",
  "AI Communications",
] as const;

export const OUTCOME_OPTIONS = [
  "Generate more leads",
  "Generate more appraisals",
  "Increase listing conversion",
  "Reduce administration",
  "Improve customer follow-up",
  "Increase website enquiries",
  "Improve AI visibility",
  "Reduce software costs",
  "Centralise data",
  "Automate repetitive work",
  "Improve reporting",
  "Improve customer experience",
] as const;

export const PROCESS_OPTIONS = [
  "Lead management",
  "Sales",
  "Customer onboarding",
  "Follow-up",
  "Marketing",
  "Booking",
  "Quoting",
  "Invoicing",
  "Support",
  "Reviews",
  "Reporting",
  "Staff management",
  "Other",
] as const;

export const AI_HELP_OPTIONS = [
  "Customer communication",
  "Lead qualification",
  "Content creation",
  "Marketing",
  "Reporting",
  "Business intelligence",
  "Sales follow-up",
  "Administration",
  "Customer support",
  "Research",
  "Decision support",
  "Other",
] as const;

export const MIGRATE_ENTITY_OPTIONS = [
  "Contacts",
  "Companies",
  "Opportunities",
  "Customers",
  "Properties",
  "Products",
  "Documents",
  "Historical data",
  "Other",
] as const;
