import type { AppSetupGuide } from "@dg/platform-core";

const NATIVE_SETUP_GUIDES: Record<string, AppSetupGuide> = {
  crm: {
    appId: "crm",
    headline: "Get your CRM running",
    summary:
      "Contacts are the foundation of every DigitalGate App. Create and manage them natively in Gen 2; legacy WordPress data is imported only during an explicit migration.",
    estimatedMinutes: 10,
    prerequisites: ["Organisation provisioned in Platform Core", "Clerk sign-in configured"],
    steps: [
      {
        id: "crm-1",
        title: "Confirm organisation is live",
        description:
          "Sign in and open Overview — you should see your organisation name and native Gen 2 workspace.",
        href: "/dashboard",
        hrefLabel: "Open overview",
      },
      {
        id: "crm-2",
        title: "Create your first contact",
        description:
          "Add a contact in CRM. Contacts power the unified timeline, Commerce, Real Estate and other apps.",
        href: "/apps/crm/contacts",
        hrefLabel: "Open contacts",
      },
      {
        id: "crm-3",
        title: "Review contact detail & timeline",
        description:
          "Open a contact to see the unified activity timeline — DigitalGate apps write activity into the same business context.",
        detail: "Add a note and confirm the activity appears on the native timeline.",
      },
      {
        id: "crm-4",
        title: "Invite team members",
        description: "Invite the people who need access to the organisation workspace.",
        href: "/dashboard/settings/team",
        hrefLabel: "Team settings",
      },
    ],
  },
  "real-estate": {
    appId: "real-estate",
    headline: "Real Estate beta — native agency setup",
    summary:
      "Enrol with re.beta, then run vendor → appraisal → listing → offer → settlement natively in Gen 2. WordPress is only an optional one-way migration source for legacy agencies.",
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
        description: "Add ABN, logo and agency details so the workspace and documents are correctly branded.",
        href: "/dashboard/business",
        hrefLabel: "Business Profile",
      },
      {
        id: "re-1",
        title: "Invite the team",
        description: "Invite agents and support staff who will work the native pipeline.",
        href: "/dashboard/settings/team",
        hrefLabel: "Team",
      },
      {
        id: "re-2",
        title: "Add your first vendor lead",
        description:
          "Create a vendor lead directly in DigitalGate and progress it through appraisal, listing, sale and settlement.",
        href: "/apps/re/vendor-leads",
        hrefLabel: "Vendor leads",
      },
      {
        id: "re-3",
        title: "Add buyer enquiries",
        description:
          "Capture buyer enquiries natively and progress them through qualification, viewing, offer and purchase.",
        href: "/apps/re/buyer-leads",
        hrefLabel: "Buyer leads",
      },
      {
        id: "re-4",
        title: "Optional — migrate a legacy WordPress agency",
        description:
          "Only during onboarding of a legacy customer, configure the WordPress migration connector and import existing leads, properties or bookings into Gen 2. After validation and cutover, disconnect WordPress.",
        href: "/dashboard/settings/connectors",
        hrefLabel: "Migration connector",
      },
      {
        id: "re-5",
        title: "Optional — commerce chain",
        description: "Create quotes, invoices and payment requests from the same customer context.",
        href: "/apps/re/vendor-leads",
        hrefLabel: "Lead commerce panel",
      },
    ],
  },
  websites: {
    appId: "websites",
    headline: "Design Studio — native website setup",
    summary:
      "Generate a Gen 2 site from Business Profile, edit it in Studio, publish it and attach a domain. WordPress content import is available only for migrating a legacy site into a Gen 2 draft.",
    estimatedMinutes: 20,
    prerequisites: ["websites.builder enabled", "Business Profile started"],
    steps: [
      {
        id: "web-0",
        title: "Complete Business Profile",
        description: "Trading name, services and brand details improve generated site content.",
        href: "/dashboard/business",
        hrefLabel: "Business Profile",
      },
      {
        id: "web-1",
        title: "Create the Gen 2 site",
        description: "Create a structured website from Business Profile, then edit pages and components in Studio.",
        href: "/apps/websites",
        hrefLabel: "Design Studio",
      },
      {
        id: "web-2",
        title: "Preview and publish",
        description: "Review content and SEO, preview the site, then publish the native Gen 2 version.",
        href: "/apps/websites",
        hrefLabel: "Websites",
      },
      {
        id: "web-3",
        title: "Attach a domain",
        description: "Connect or register the domain, apply DNS and complete SSL go-live checks.",
        href: "/apps/infrastructure/domains",
        hrefLabel: "Domains",
      },
      {
        id: "web-4",
        title: "Optional — migrate WordPress content",
        description:
          "For a legacy WordPress customer only, use the migration import to copy pages/posts into a Gen 2 draft. Validate the new site, cut over the domain, then disconnect WordPress.",
        href: "/dashboard/settings/connectors",
        hrefLabel: "Migration connector",
      },
      {
        id: "web-5",
        title: "Check Health Centre",
        description: "Verify native publish, domain, DNS, SSL, forms and SEO health before go-live.",
        href: "/apps/websites/health",
        hrefLabel: "Health Centre",
      },
    ],
  },
  accommodation: {
    appId: "accommodation",
    headline: "Accommodation beta — native property setup",
    summary:
      "Run units, availability, stays, guests, housekeeping and OTA iCal sync natively in Gen 2. CVH is already fully native; WordPress is not part of normal Accommodation operation.",
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
        description: "Add property identity, branding and business details.",
        href: "/dashboard/business",
        hrefLabel: "Business Profile",
      },
      {
        id: "acc-1",
        title: "Create accommodation units",
        description:
          "Add each unit natively in DigitalGate with rates, capacity, housekeeping details and OTA calendar URLs.",
        href: "/apps/accommodation/units",
        hrefLabel: "Units",
      },
      {
        id: "acc-2",
        title: "Configure OTA iCal",
        description:
          "Add Airbnb and Booking.com export calendar URLs to each unit, then use DigitalGate OTA sync. Normal availability is calculated from Neon.",
        href: "/apps/accommodation/calendar",
        hrefLabel: "Availability",
      },
      {
        id: "acc-3",
        title: "Work stays and housekeeping",
        description:
          "Create and manage StayBooking records in Gen 2 and mark units clean or dirty after turnovers.",
        href: "/apps/accommodation/bookings",
        hrefLabel: "Bookings",
      },
      {
        id: "acc-4",
        title: "Review guests",
        description: "Guests are universal CRM Contacts enriched with Accommodation stay and preference context.",
        href: "/apps/accommodation/guests",
        hrefLabel: "Guests",
      },
      {
        id: "acc-5",
        title: "Optional — migrate a legacy WordPress property",
        description:
          "For a legacy customer only, run the dedicated one-way WordPress → Gen 2 migration, validate units/bookings, cut over, then disconnect WordPress. CVH does not require this step.",
        href: "/dashboard/settings/connectors",
        hrefLabel: "Migration connector",
      },
      {
        id: "acc-6",
        title: "Connect Commerce checkout",
        description: "Use the native DigitalGate checkout/payment path for direct bookings and payment workflows.",
        href: "/dashboard/apps/commerce/setup",
        hrefLabel: "Commerce setup",
      },
    ],
  },
};

export function getNativeAppSetupGuide(appId: string): AppSetupGuide | undefined {
  return NATIVE_SETUP_GUIDES[appId];
}
