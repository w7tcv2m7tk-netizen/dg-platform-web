import { getAppSetupGuide, type AppSetupGuide } from "@dg/platform-core";

const NATIVE_GUIDE_OVERRIDES: Record<string, AppSetupGuide> = {
  crm: {
    appId: "crm",
    headline: "Get your CRM running",
    summary:
      "Contacts are the foundation of every DigitalGate App. Platform Core is the system of record for CRM data.",
    estimatedMinutes: 10,
    prerequisites: ["Organisation provisioned in Platform Core", "Clerk sign-in configured"],
    steps: [
      {
        id: "crm-1",
        title: "Confirm organisation is live",
        description: "Sign in and open Overview to confirm the correct organisation and workspace are active.",
        href: "/dashboard",
        hrefLabel: "Open overview",
      },
      {
        id: "crm-2",
        title: "Create your first contact",
        description: "Add a contact in DigitalGate. Contacts power timelines, Commerce and industry apps from Platform Core.",
        href: "/apps/crm/contacts",
        hrefLabel: "Open contacts",
      },
      {
        id: "crm-3",
        title: "Review contact detail and timeline",
        description: "Open a contact to see its unified activity timeline. DigitalGate Apps write activity into the shared Platform Core context.",
      },
      {
        id: "crm-4",
        title: "Invite team members",
        description: "Invite staff and configure access for the organisation.",
        href: "/dashboard/settings/team",
        hrefLabel: "Team settings",
      },
    ],
  },
  "real-estate": {
    appId: "real-estate",
    headline: "Real Estate beta — agency setup",
    summary:
      "Run vendor leads, appraisals, properties, listings, buyers, bookings, offers and settlements natively on Gen 2. Platform Core is the system of record.",
    estimatedMinutes: 20,
    prerequisites: [
      "re.beta enabled",
      "CRM contacts available",
      "Commerce optional for payments",
    ],
    steps: [
      {
        id: "re-0",
        title: "Complete Business Profile",
        description: "Add agency identity, ABN, branding and business details used across the workspace.",
        href: "/dashboard/business",
        hrefLabel: "Business Profile",
      },
      {
        id: "re-1",
        title: "Invite the team",
        description: "Invite agents and staff who will work the native DigitalGate pipeline.",
        href: "/dashboard/settings/team",
        hrefLabel: "Team",
      },
      {
        id: "re-2",
        title: "Open Real Estate",
        description: "Review the native Gen 2 overview and create your first vendor lead directly in DigitalGate.",
        href: "/apps/re",
        hrefLabel: "Real Estate overview",
      },
      {
        id: "re-3",
        title: "Run the agency workflow",
        description: "Move from vendor lead to appraisal, property/listing, offer and settlement using Platform Core records.",
        href: "/apps/re/properties",
        hrefLabel: "Open properties",
      },
      {
        id: "re-4",
        title: "Add buyer leads and bookings",
        description: "Capture and manage buyers and bookings natively in Gen 2 without a WordPress runtime dependency.",
        href: "/apps/re/buyer-leads",
        hrefLabel: "Buyer leads",
      },
      {
        id: "re-5",
        title: "Legacy migration only",
        description: "For a legacy WordPress client, an authorised operator can temporarily configure the WordPress migration connector and import supported data WordPress → Gen 2. Disconnect WordPress after migration validation and cutover.",
        href: "/dashboard/settings/connectors",
        hrefLabel: "Legacy migration connector",
      },
    ],
    envVars: [
      {
        name: "GOOGLE_GEOCODING_API_KEY",
        description: "Optional — property address geocoding",
      },
    ],
  },
  accommodation: {
    appId: "accommodation",
    headline: "Accommodation beta — property setup",
    summary:
      "Run units, native availability, stays, guests, payments, housekeeping and OTA iCal workflows on Gen 2. Platform Core is the system of record.",
    estimatedMinutes: 20,
    prerequisites: [
      "acc.beta enabled",
      "CRM contacts available for guests",
      "Commerce optional for payments",
    ],
    steps: [
      {
        id: "acc-0",
        title: "Complete Business Profile",
        description: "Add property identity, ABN, branding and business details used across the workspace.",
        href: "/dashboard/business",
        hrefLabel: "Business Profile",
      },
      {
        id: "acc-1",
        title: "Configure accommodation units",
        description: "Create and manage accommodation units in Platform Core. Native unit and booking data drives availability.",
        href: "/apps/accommodation/units",
        hrefLabel: "Units",
      },
      {
        id: "acc-2",
        title: "Connect OTA iCal feeds",
        description: "Configure Airbnb and Booking.com imports and use each DigitalGate unit export URL in the OTA. DigitalGate remains the native operating layer.",
        href: "/apps/accommodation/units",
        hrefLabel: "Units and iCal",
      },
      {
        id: "acc-3",
        title: "Work availability and housekeeping",
        description: "Use native calendar and housekeeping views backed by Platform Core bookings and units.",
        href: "/apps/accommodation/calendar",
        hrefLabel: "Availability",
      },
      {
        id: "acc-4",
        title: "Review guests and stays",
        description: "Guests are CRM Contacts with Accommodation context, including stays and relationship history.",
        href: "/apps/accommodation/guests",
        hrefLabel: "Guests",
      },
      {
        id: "acc-5",
        title: "Use native booking and payments",
        description: "Public stay availability and booking creation run through Gen 2. Stripe/Commerce handles supported payment flows without WordPress runtime dependency.",
        href: "/apps/accommodation/payments",
        hrefLabel: "Payments",
      },
      {
        id: "acc-6",
        title: "Legacy migration only",
        description: "For a legacy WordPress property, an authorised operator can temporarily use the WordPress migration connector to move supported data WordPress → Gen 2. Disconnect it after migration validation and cutover.",
        href: "/dashboard/settings/connectors",
        hrefLabel: "Legacy migration connector",
      },
    ],
  },
};

export function getNativeAppSetupGuide(appId: string): AppSetupGuide | undefined {
  return NATIVE_GUIDE_OVERRIDES[appId] ?? getAppSetupGuide(appId);
}
