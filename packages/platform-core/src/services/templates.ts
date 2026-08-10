import type { ServiceTemplate, ServiceTemplateKey } from "./types";

const GENERAL_WORKFLOW = [
  { id: "new_enquiry", label: "New enquiry" },
  { id: "qualified", label: "Qualified" },
  { id: "quote", label: "Quote" },
  { id: "approved", label: "Approved" },
  { id: "scheduled", label: "Scheduled" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "invoiced", label: "Invoiced" },
  { id: "paid", label: "Paid" },
  { id: "review", label: "Review" },
];

export const ELECTRICIAN_TEMPLATE: ServiceTemplate = {
  key: "electrician",
  label: "Electrician",
  description: "Residential & commercial electrical — compliance-aware field jobs",
  services: [
    "Electrical installations",
    "Fault finding",
    "Switchboard upgrades",
    "Lighting",
    "Emergency call-outs",
  ],
  jobTypes: [
    { id: "installation", label: "Installation" },
    { id: "fault_finding", label: "Fault finding" },
    { id: "switchboard", label: "Switchboard upgrade" },
    { id: "lighting", label: "Lighting" },
    { id: "emergency", label: "Emergency call-out" },
    { id: "inspection", label: "Inspection / certificate" },
  ],
  workflow: [
    { id: "new_enquiry", label: "New enquiry" },
    { id: "qualified", label: "Qualified" },
    { id: "site_visit", label: "Site visit" },
    { id: "quote", label: "Quote" },
    { id: "approved", label: "Approved" },
    { id: "scheduled", label: "Scheduled" },
    { id: "in_progress", label: "In progress" },
    { id: "completed", label: "Completed" },
    { id: "invoiced", label: "Invoiced" },
    { id: "paid", label: "Paid" },
    { id: "review", label: "Review request" },
  ],
  jobFields: [
    { id: "access_requirements", label: "Access requirements", type: "textarea" },
    { id: "electrical_requirements", label: "Electrical requirements", type: "textarea" },
    { id: "compliance_docs", label: "Compliance documents notes", type: "textarea" },
  ],
  terminology: { job: "Job", customer: "Customer", quote: "Quote" },
};

export const PLUMBER_TEMPLATE: ServiceTemplate = {
  key: "plumber",
  label: "Plumber",
  description: "Plumbing jobs and emergency call-outs",
  services: ["Blocked drains", "Hot water", "Gas fitting", "Emergency call-outs", "Renovations"],
  jobTypes: [
    { id: "blocked_drain", label: "Blocked drain" },
    { id: "hot_water", label: "Hot water" },
    { id: "gas", label: "Gas fitting" },
    { id: "emergency", label: "Emergency call-out" },
    { id: "renovation", label: "Renovation" },
  ],
  workflow: [
    { id: "new_enquiry", label: "New enquiry" },
    { id: "qualified", label: "Qualified" },
    { id: "quote", label: "Quote" },
    { id: "approved", label: "Approved" },
    { id: "scheduled", label: "Scheduled" },
    { id: "in_progress", label: "In progress" },
    { id: "completed", label: "Completed" },
    { id: "invoiced", label: "Invoiced" },
    { id: "paid", label: "Paid" },
    { id: "review", label: "Review" },
  ],
  jobFields: [
    { id: "urgency", label: "Urgency", type: "text" },
    { id: "access_requirements", label: "Access requirements", type: "textarea" },
  ],
  terminology: { job: "Job", customer: "Customer", quote: "Quote" },
};

export const CLEANER_TEMPLATE: ServiceTemplate = {
  key: "cleaner",
  label: "Cleaner",
  description: "Recurring cleans, teams, and checklists",
  services: ["Regular clean", "End of lease", "Deep clean", "Office clean"],
  jobTypes: [
    { id: "regular", label: "Regular clean" },
    { id: "bond", label: "End of lease" },
    { id: "deep", label: "Deep clean" },
    { id: "office", label: "Office" },
  ],
  workflow: [
    { id: "new_enquiry", label: "Enquiry" },
    { id: "quote", label: "Quote" },
    { id: "booked", label: "Booked" },
    { id: "scheduled", label: "Scheduled" },
    { id: "assigned", label: "Cleaner assigned" },
    { id: "completed", label: "Completed" },
    { id: "recurring", label: "Recurring?" },
    { id: "review", label: "Review" },
  ],
  jobFields: [
    { id: "checklist", label: "Checklist notes", type: "textarea" },
    { id: "recurring", label: "Recurring", type: "boolean" },
  ],
  terminology: { job: "Clean", customer: "Client", quote: "Quote" },
};

export const GENERAL_TEMPLATE: ServiceTemplate = {
  key: "general",
  label: "General services",
  description: "Generic field service workflow — customise with AI later",
  services: ["General service"],
  jobTypes: [
    { id: "service", label: "Service" },
    { id: "install", label: "Install" },
    { id: "maintenance", label: "Maintenance" },
    { id: "call_out", label: "Call-out" },
  ],
  workflow: GENERAL_WORKFLOW,
  jobFields: [{ id: "notes", label: "Job notes", type: "textarea" }],
  terminology: { job: "Job", customer: "Customer", quote: "Quote" },
};

export const BUILDER_TEMPLATE: ServiceTemplate = {
  key: "builder",
  label: "Builder",
  description: "Projects, stages, variations, subcontractors",
  services: ["New build", "Renovation", "Extension", "Variations"],
  jobTypes: [
    { id: "new_build", label: "New build" },
    { id: "renovation", label: "Renovation" },
    { id: "extension", label: "Extension" },
    { id: "variation", label: "Variation" },
  ],
  workflow: [
    { id: "new_enquiry", label: "New enquiry" },
    { id: "qualified", label: "Qualified" },
    { id: "site_visit", label: "Site visit" },
    { id: "quote", label: "Quote" },
    { id: "approved", label: "Approved" },
    { id: "scheduled", label: "Scheduled" },
    { id: "in_progress", label: "In progress" },
    { id: "completed", label: "Completed" },
    { id: "invoiced", label: "Invoiced" },
    { id: "paid", label: "Paid" },
    { id: "review", label: "Review" },
  ],
  jobFields: [
    { id: "project_stage", label: "Project stage", type: "text" },
    { id: "subcontractors", label: "Subcontractors", type: "textarea" },
  ],
  terminology: { job: "Project", customer: "Client", quote: "Quote" },
};

const TEMPLATES: Record<ServiceTemplateKey, ServiceTemplate> = {
  electrician: ELECTRICIAN_TEMPLATE,
  plumber: PLUMBER_TEMPLATE,
  builder: BUILDER_TEMPLATE,
  cleaner: CLEANER_TEMPLATE,
  landscaper: {
    ...GENERAL_TEMPLATE,
    key: "landscaper",
    label: "Landscaper",
    description: "Site visits, materials, recurring maintenance",
    services: ["Garden design", "Maintenance", "Hard landscaping"],
  },
  hvac: {
    ...GENERAL_TEMPLATE,
    key: "hvac",
    label: "HVAC",
    description: "Service calls, equipment, maintenance",
    services: ["Install", "Service call", "Maintenance"],
  },
  pest_control: {
    ...GENERAL_TEMPLATE,
    key: "pest_control",
    label: "Pest control",
    description: "Treatments and recurring services",
    services: ["General pest", "Termite", "Rodent"],
  },
  painter: {
    ...GENERAL_TEMPLATE,
    key: "painter",
    label: "Painter",
    description: "Quotes, rooms, materials, progress",
    services: ["Interior", "Exterior", "Commercial"],
  },
  handyman: {
    ...GENERAL_TEMPLATE,
    key: "handyman",
    label: "Handyman",
    description: "Multiple job categories",
    services: ["Repairs", "Maintenance", "Odd jobs"],
  },
  solar: {
    ...GENERAL_TEMPLATE,
    key: "solar",
    label: "Solar",
    description: "Site assessments, installations, maintenance",
    services: ["Site assessment", "Install", "Maintenance"],
  },
  pool_service: {
    ...CLEANER_TEMPLATE,
    key: "pool_service",
    label: "Pool service",
    description: "Recurring servicing, chemicals, equipment",
    services: ["Weekly service", "Equipment repair", "Chemical balance"],
  },
  general: GENERAL_TEMPLATE,
};

export function listServiceTemplates(): ServiceTemplate[] {
  return SERVICE_TEMPLATE_KEYS_ORDERED.map((key) => TEMPLATES[key]);
}

const SERVICE_TEMPLATE_KEYS_ORDERED: ServiceTemplateKey[] = [
  "electrician",
  "plumber",
  "builder",
  "cleaner",
  "landscaper",
  "hvac",
  "pest_control",
  "painter",
  "handyman",
  "solar",
  "pool_service",
  "general",
];

export function getServiceTemplate(key: string | null | undefined): ServiceTemplate {
  if (key && key in TEMPLATES) return TEMPLATES[key as ServiceTemplateKey];
  return GENERAL_TEMPLATE;
}

export function isServiceTemplateKey(value: string): value is ServiceTemplateKey {
  return value in TEMPLATES;
}
