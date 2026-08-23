import type { AppManifest } from "../manifest";

/**
 * Services — DigitalGate OS for service / field businesses (one App).
 * Industry (electrician, plumber, cleaner, …) = Service Templates — not separate Apps.
 * Coverage benchmark: ServiceM8-class ops on Universal Objects + Core — not a FSM clone.
 * @see docs/foundations/SERVICES-APP.md
 */
export const servicesApp: AppManifest = {
  id: "services",
  name: "Services",
  description:
    "DigitalGate OS for service businesses — jobs & scheduling on Core CRM/Commerce/AI (not a standalone FSM)",
  tier: "business",
  version: "0.3.1",
  icon: "⚙",
  routes: [
    // Quotes → Commerce, Customers → CRM, Teams → Settings (Universal Objects) — still linked in nav.
    { path: "/apps/services", label: "Overview" },
    { path: "/apps/services/jobs", label: "Jobs" },
    { path: "/apps/services/scheduling", label: "Scheduling" },
    { path: "/apps/services/quotes", label: "Quotes" },
    { path: "/apps/services/customers", label: "Customers" },
    { path: "/apps/services/teams", label: "Teams" },
  ],
  navigation: [
    { href: "/apps/services", label: "Overview", icon: "⚙" },
    { href: "/apps/services/jobs", label: "Jobs", icon: "⚙" },
    { href: "/apps/services/scheduling", label: "Scheduling", icon: "⚙" },
  ],
  permissions: [
    { id: "services.view", label: "View jobs and schedule" },
    { id: "services.manage", label: "Manage jobs and quotes" },
    { id: "services.templates.manage", label: "Configure Service Templates" },
  ],
  features: [
    "services.jobs.read",
    "services.jobs.write",
    "services.scheduling.read",
    "services.templates.read",
  ],
  entities: [
    "Contact",
    "Company",
    "Lead",
    "Opportunity",
    "Task",
    "Activity",
    "Document",
    "CommerceQuote",
    "CommerceInvoice",
    "ServiceJob",
  ],
  automationTriggers: [
    { id: "services.job.completed", label: "Job completed" },
    { id: "services.job.scheduled", label: "Job scheduled" },
    { id: "services.quote.approved", label: "Quote approved" },
  ],
  automationActions: [
    { id: "services.send_quote", label: "Send quote to client" },
    { id: "services.schedule_followup", label: "Schedule follow-up visit" },
    { id: "services.request_review", label: "Request review after job" },
  ],
  aiTools: [
    {
      id: "services.job_brief",
      label: "AI Job Assistant",
      description:
        "From technician notes: update job, draft customer message, suggest follow-up / upsell (human review)",
    },
    {
      id: "services.quote_assist",
      label: "AI Quote Assistant",
      description: "Natural language → structured Commerce quote for review",
    },
    {
      id: "services.configure_template",
      label: "Configure from business description",
      description:
        "Suggest Service Template, job types, and workflow from a plain-language business description",
    },
  ],
  reports: [
    { id: "services.jobs_report", label: "Jobs report" },
    { id: "services.revenue_by_job_type", label: "Revenue by job type" },
    { id: "services.quote_conversion", label: "Quote conversion" },
    { id: "services.technician_performance", label: "Technician performance" },
  ],
};
