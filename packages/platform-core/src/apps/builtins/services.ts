import type { AppManifest } from "../manifest";

/**
 * Services — one Business App for field / trade operations.
 * Industry (electrician, plumber, cleaner, …) is Service Template configuration — not separate Apps.
 * @see docs/foundations/SERVICES-APP.md
 */
export const servicesApp: AppManifest = {
  id: "services",
  name: "Services",
  description:
    "Jobs & scheduling for field/trade ops — quotes live in Commerce, customers in CRM, team in Settings",
  tier: "business",
  version: "0.3.0",
  icon: "⚙",
  routes: [
    // Owned surfaces only — Quotes → Commerce, Customers → CRM, Teams → Settings (no duplicate nav).
    { path: "/apps/services", label: "Overview" },
    { path: "/apps/services/jobs", label: "Jobs" },
    { path: "/apps/services/scheduling", label: "Scheduling" },
  ],
  navigation: [{ href: "/apps/services", label: "Services", icon: "⚙" }],
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
  entities: ["Contact", "Task", "Activity", "CommerceQuote", "Lead"],
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
      label: "Job brief",
      description: "Generate job brief from client notes and history",
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
  ],
};
