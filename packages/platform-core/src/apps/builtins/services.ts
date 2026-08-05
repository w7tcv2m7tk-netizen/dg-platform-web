import type { AppManifest } from "../manifest";

export const servicesApp: AppManifest = {
  id: "services",
  name: "Services",
  description: "Jobs, scheduling, quotes, and field service workflow",
  tier: "business",
  version: "0.1.0",
  icon: "⚙",
  routes: [
    { path: "/apps/services", label: "Overview" },
    { path: "/apps/services/jobs", label: "Jobs" },
    { path: "/apps/services/scheduling", label: "Scheduling" },
    { path: "/apps/services/quotes", label: "Quotes" },
  ],
  navigation: [{ href: "/apps/services", label: "Services", icon: "⚙" }],
  permissions: [
    { id: "services.view", label: "View jobs and schedule" },
    { id: "services.manage", label: "Manage jobs and quotes" },
  ],
  features: ["services.jobs.read", "services.jobs.write", "services.scheduling.read"],
  entities: ["Contact", "Task", "Activity", "CommerceQuote"],
  automationTriggers: [
    { id: "services.job.completed", label: "Job completed" },
    { id: "services.job.scheduled", label: "Job scheduled" },
  ],
  automationActions: [
    { id: "services.send_quote", label: "Send quote to client" },
    { id: "services.schedule_followup", label: "Schedule follow-up visit" },
  ],
  aiTools: [
    {
      id: "services.job_brief",
      label: "Job brief",
      description: "Generate job brief from client notes and history",
    },
  ],
  reports: [{ id: "services.jobs_report", label: "Jobs report" }],
};
