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
  key: "electrician", label: "Electrician", description: "Residential & commercial electrical — compliance-aware field jobs",
  services: ["Electrical installations", "Fault finding", "Switchboard upgrades", "Lighting", "Emergency call-outs"],
  jobTypes: [{ id: "installation", label: "Installation" }, { id: "fault_finding", label: "Fault finding" }, { id: "switchboard", label: "Switchboard upgrade" }, { id: "lighting", label: "Lighting" }, { id: "emergency", label: "Emergency call-out" }, { id: "inspection", label: "Inspection / certificate" }],
  workflow: [{ id: "new_enquiry", label: "New enquiry" }, { id: "qualified", label: "Qualified" }, { id: "site_visit", label: "Site visit" }, { id: "quote", label: "Quote" }, { id: "approved", label: "Approved" }, { id: "scheduled", label: "Scheduled" }, { id: "in_progress", label: "In progress" }, { id: "completed", label: "Completed" }, { id: "invoiced", label: "Invoiced" }, { id: "paid", label: "Paid" }, { id: "review", label: "Review request" }],
  jobFields: [{ id: "access_requirements", label: "Access requirements", type: "textarea" }, { id: "electrical_requirements", label: "Electrical requirements", type: "textarea" }, { id: "switchboard_notes", label: "Switchboard / meter notes", type: "textarea" }, { id: "certificate_required", label: "Certificate / COC required", type: "boolean" }, { id: "compliance_docs", label: "Compliance documents notes", type: "textarea" }],
  terminology: { job: "Job", customer: "Customer", quote: "Quote" },
};

export const PLUMBER_TEMPLATE: ServiceTemplate = {
  key: "plumber", label: "Plumber", description: "Plumbing jobs and emergency call-outs",
  services: ["Blocked drains", "Hot water", "Gas fitting", "Emergency call-outs", "Renovations"],
  jobTypes: [{ id: "blocked_drain", label: "Blocked drain" }, { id: "hot_water", label: "Hot water" }, { id: "gas", label: "Gas fitting" }, { id: "emergency", label: "Emergency call-out" }, { id: "renovation", label: "Renovation" }],
  workflow: [{ id: "new_enquiry", label: "New enquiry" }, { id: "qualified", label: "Qualified" }, { id: "quote", label: "Quote" }, { id: "approved", label: "Approved" }, { id: "scheduled", label: "Scheduled" }, { id: "in_progress", label: "In progress" }, { id: "completed", label: "Completed" }, { id: "invoiced", label: "Invoiced" }, { id: "paid", label: "Paid" }, { id: "review", label: "Review" }],
  jobFields: [{ id: "urgency", label: "Urgency", type: "text" }, { id: "access_requirements", label: "Access requirements", type: "textarea" }, { id: "water_meter_notes", label: "Water / gas meter notes", type: "textarea" }, { id: "parts_needed", label: "Parts / materials needed", type: "textarea" }],
  terminology: { job: "Job", customer: "Customer", quote: "Quote" },
};

export const CLEANER_TEMPLATE: ServiceTemplate = {
  key: "cleaner",
  label: "Commercial Cleaning",
  description: "Commercial cleaning contracts, recurring site services, teams, quality assurance and compliance",
  services: ["Commercial cleaning", "Venue cleaning", "Office cleaning", "Hospitality cleaning", "Deep cleaning", "Periodic cleaning", "Event cleaning", "End-of-lease cleaning", "Carpet cleaning", "Window cleaning", "Pressure cleaning", "Consumables & restocking"],
  jobTypes: [
    { id: "recurring_site_service", label: "Recurring site service" }, { id: "venue_clean", label: "Venue clean" }, { id: "office_clean", label: "Office clean" }, { id: "hospitality_clean", label: "Hospitality clean" }, { id: "deep_clean", label: "Deep clean" }, { id: "periodic_clean", label: "Periodic clean" }, { id: "event_clean", label: "Event / function clean" }, { id: "end_of_lease", label: "End-of-lease clean" }, { id: "carpet_clean", label: "Carpet clean" }, { id: "window_clean", label: "Window clean" }, { id: "pressure_clean", label: "Pressure clean" }, { id: "inspection", label: "Site inspection / QA" }, { id: "client_request", label: "Client service request" },
  ],
  workflow: [
    { id: "new_enquiry", label: "New enquiry" }, { id: "site_assessment", label: "Site assessment" }, { id: "scope", label: "Scope of works" }, { id: "quote", label: "Quote / proposal" }, { id: "contracted", label: "Contracted" }, { id: "scheduled", label: "Scheduled" }, { id: "assigned", label: "Team assigned" }, { id: "in_progress", label: "Service in progress" }, { id: "qa", label: "QA / inspection" }, { id: "completed", label: "Service completed" }, { id: "client_review", label: "Client review / issue" }, { id: "invoiced", label: "Invoiced" }, { id: "recurring", label: "Recurring service" },
  ],
  jobFields: [
    { id: "site_contact", label: "Site contact", type: "text" }, { id: "scope_of_works", label: "Scope of works / cleaning specification", type: "textarea" }, { id: "areas_zones", label: "Areas / zones", type: "textarea" }, { id: "service_frequency", label: "Service frequency", type: "text" }, { id: "recurring", label: "Recurring contract", type: "boolean" }, { id: "access_requirements", label: "Access, keys & alarm instructions", type: "textarea" }, { id: "site_hazards", label: "Site hazards / WHS notes", type: "textarea" }, { id: "checklist", label: "Site checklist / task notes", type: "textarea" }, { id: "chemicals_sds", label: "Chemicals / SDS requirements", type: "textarea" }, { id: "equipment_required", label: "Equipment required", type: "textarea" }, { id: "consumables", label: "Consumables / restocking requirements", type: "textarea" }, { id: "qa_requirements", label: "QA / inspection requirements", type: "textarea" }, { id: "proof_of_service", label: "Proof-of-service / photo requirements", type: "textarea" }, { id: "incident_notes", label: "Incident / damage notes", type: "textarea" },
  ],
  terminology: { job: "Service", customer: "Client", quote: "Proposal" },
};

export const MAINTENANCE_TEMPLATE: ServiceTemplate = {
  key: "maintenance",
  label: "Property & Facility Maintenance",
  description: "Reactive and planned maintenance, work orders, sites, assets, contractors and service history",
  services: ["Reactive maintenance", "Planned preventative maintenance", "General repairs", "Building maintenance", "Venue maintenance", "Property maintenance", "Asset servicing", "Emergency call-outs", "Minor works", "Make-good works", "Compliance inspections", "Contractor coordination"],
  jobTypes: [
    { id: "reactive", label: "Reactive maintenance" },
    { id: "planned", label: "Planned preventative maintenance" },
    { id: "repair", label: "Repair" },
    { id: "inspection", label: "Inspection" },
    { id: "asset_service", label: "Asset service" },
    { id: "emergency", label: "Emergency call-out" },
    { id: "minor_works", label: "Minor works" },
    { id: "make_good", label: "Make-good works" },
    { id: "compliance", label: "Compliance / safety action" },
    { id: "contractor_job", label: "Contractor work order" },
  ],
  workflow: [
    { id: "request_received", label: "Request received" },
    { id: "triage", label: "Triage & priority" },
    { id: "site_assessment", label: "Site assessment" },
    { id: "quote", label: "Quote / approval" },
    { id: "approved", label: "Approved" },
    { id: "scheduled", label: "Scheduled" },
    { id: "assigned", label: "Technician / contractor assigned" },
    { id: "in_progress", label: "In progress" },
    { id: "waiting_parts", label: "Waiting parts / access" },
    { id: "completed", label: "Work completed" },
    { id: "qa", label: "QA / client sign-off" },
    { id: "invoiced", label: "Invoiced" },
    { id: "closed", label: "Closed / service history" },
  ],
  jobFields: [
    { id: "site_contact", label: "Site contact", type: "text" },
    { id: "asset_reference", label: "Asset / equipment reference", type: "text" },
    { id: "priority", label: "Priority / SLA", type: "text" },
    { id: "fault_description", label: "Fault / issue description", type: "textarea" },
    { id: "access_requirements", label: "Access, keys & induction requirements", type: "textarea" },
    { id: "site_hazards", label: "Site hazards / WHS notes", type: "textarea" },
    { id: "diagnosis", label: "Diagnosis / assessment", type: "textarea" },
    { id: "scope_of_works", label: "Scope of works", type: "textarea" },
    { id: "parts_materials", label: "Parts / materials required", type: "textarea" },
    { id: "contractor_details", label: "Contractor / subcontractor details", type: "textarea" },
    { id: "permit_compliance", label: "Permits / compliance requirements", type: "textarea" },
    { id: "planned_maintenance", label: "Planned / recurring maintenance", type: "boolean" },
    { id: "service_interval", label: "Service interval / next due", type: "text" },
    { id: "before_after", label: "Before / after photo requirements", type: "textarea" },
    { id: "client_signoff", label: "Client sign-off requirements", type: "textarea" },
    { id: "warranty_notes", label: "Warranty / workmanship notes", type: "textarea" },
  ],
  terminology: { job: "Work order", customer: "Client", quote: "Quote" },
};

export const GENERAL_TEMPLATE: ServiceTemplate = {
  key: "general", label: "General services", description: "Generic field service workflow — customise with AI later", services: ["General service"],
  jobTypes: [{ id: "service", label: "Service" }, { id: "install", label: "Install" }, { id: "maintenance", label: "Maintenance" }, { id: "call_out", label: "Call-out" }], workflow: GENERAL_WORKFLOW,
  jobFields: [{ id: "notes", label: "Job notes", type: "textarea" }], terminology: { job: "Job", customer: "Customer", quote: "Quote" },
};

export const BUILDER_TEMPLATE: ServiceTemplate = {
  key: "builder", label: "Builder", description: "Projects, stages, variations, subcontractors", services: ["New build", "Renovation", "Extension", "Variations"],
  jobTypes: [{ id: "new_build", label: "New build" }, { id: "renovation", label: "Renovation" }, { id: "extension", label: "Extension" }, { id: "variation", label: "Variation" }],
  workflow: [{ id: "new_enquiry", label: "New enquiry" }, { id: "qualified", label: "Qualified" }, { id: "site_visit", label: "Site visit" }, { id: "quote", label: "Quote" }, { id: "approved", label: "Approved" }, { id: "scheduled", label: "Scheduled" }, { id: "in_progress", label: "In progress" }, { id: "completed", label: "Completed" }, { id: "invoiced", label: "Invoiced" }, { id: "paid", label: "Paid" }, { id: "review", label: "Review" }],
  jobFields: [{ id: "project_stage", label: "Project stage", type: "text" }, { id: "subcontractors", label: "Subcontractors", type: "textarea" }], terminology: { job: "Project", customer: "Client", quote: "Quote" },
};

const TEMPLATES: Record<ServiceTemplateKey, ServiceTemplate> = {
  electrician: ELECTRICIAN_TEMPLATE,
  plumber: PLUMBER_TEMPLATE,
  builder: BUILDER_TEMPLATE,
  cleaner: CLEANER_TEMPLATE,
  maintenance: MAINTENANCE_TEMPLATE,
  landscaper: { ...GENERAL_TEMPLATE, key: "landscaper", label: "Landscaper", description: "Site visits, materials, recurring maintenance", services: ["Garden design", "Maintenance", "Hard landscaping"] },
  hvac: { ...GENERAL_TEMPLATE, key: "hvac", label: "HVAC", description: "Service calls, equipment, maintenance", services: ["Install", "Service call", "Maintenance"] },
  pest_control: { ...GENERAL_TEMPLATE, key: "pest_control", label: "Pest control", description: "Treatments and recurring services", services: ["General pest", "Termite", "Rodent"] },
  painter: { ...GENERAL_TEMPLATE, key: "painter", label: "Painter", description: "Quotes, rooms, materials, progress", services: ["Interior", "Exterior", "Commercial"] },
  handyman: { ...GENERAL_TEMPLATE, key: "handyman", label: "Handyman", description: "Multiple job categories", services: ["Repairs", "Maintenance", "Odd jobs"] },
  solar: { ...GENERAL_TEMPLATE, key: "solar", label: "Solar", description: "Site assessments, installations, maintenance", services: ["Site assessment", "Install", "Maintenance"] },
  pool_service: { ...CLEANER_TEMPLATE, key: "pool_service", label: "Pool service", description: "Recurring servicing, chemicals, equipment", services: ["Weekly service", "Equipment repair", "Chemical balance"] },
  general: GENERAL_TEMPLATE,
};

const SERVICE_TEMPLATE_KEYS_ORDERED: ServiceTemplateKey[] = ["electrician", "plumber", "builder", "cleaner", "maintenance", "landscaper", "hvac", "pest_control", "painter", "handyman", "solar", "pool_service", "general"];
export function listServiceTemplates(): ServiceTemplate[] { return SERVICE_TEMPLATE_KEYS_ORDERED.map((key) => TEMPLATES[key]); }
export function getServiceTemplate(key: string | null | undefined): ServiceTemplate { if (key && key in TEMPLATES) return TEMPLATES[key as ServiceTemplateKey]; return GENERAL_TEMPLATE; }
export function isServiceTemplateKey(value: string): value is ServiceTemplateKey { return value in TEMPLATES; }
