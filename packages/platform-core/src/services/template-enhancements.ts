import type { ServiceTemplate, ServiceTemplateKey } from "./types";

type Field = ServiceTemplate["jobFields"][number];
type JobType = ServiceTemplate["jobTypes"][number];
type Stage = ServiceTemplate["workflow"][number];

type Enhancement = {
  label?: string;
  description?: string;
  services?: string[];
  jobTypes?: JobType[];
  workflow?: Stage[];
  jobFields?: Field[];
  terminology?: ServiceTemplate["terminology"];
};

const F = (id: string, label: string, type: Field["type"] = "text"): Field => ({ id, label, type });
const T = (id: string, label: string): JobType => ({ id, label });
const S = (id: string, label: string): Stage => ({ id, label });

const TRADE_ENHANCEMENTS: Partial<Record<ServiceTemplateKey, Enhancement>> = {
  electrician: {
    description: "Electrical quoting, dispatch, field work, testing, certificates, assets and recurring compliance services",
    services: ["Electrical installations", "Fault finding", "Switchboard upgrades", "Lighting", "Emergency call-outs", "Test & tag", "Safety switch testing", "Smoke alarms", "EV chargers", "Preventative maintenance"],
    jobTypes: [T("installation", "Installation"), T("fault_finding", "Fault finding"), T("switchboard", "Switchboard / meter work"), T("lighting", "Lighting"), T("emergency", "Emergency call-out"), T("inspection", "Inspection / certificate"), T("test_tag", "Test & tag"), T("safety_switch", "Safety switch test"), T("smoke_alarm", "Smoke alarm service"), T("ev_charger", "EV charger"), T("preventative", "Preventative maintenance")],
    workflow: [S("new_enquiry", "New enquiry"), S("qualified", "Qualified"), S("site_visit", "Site assessment"), S("quote", "Quote"), S("approved", "Approved"), S("scheduled", "Scheduled"), S("assigned", "Electrician assigned"), S("in_progress", "On site"), S("testing", "Testing & verification"), S("certificate", "Certificate / compliance"), S("completed", "Completed"), S("invoiced", "Invoiced"), S("paid", "Paid")],
    jobFields: [F("site_contact", "Site contact"), F("access_requirements", "Access / induction requirements", "textarea"), F("switchboard_notes", "Switchboard / meter details", "textarea"), F("circuit_details", "Circuit / equipment details", "textarea"), F("isolation_requirements", "Isolation / shutdown requirements", "textarea"), F("materials", "Materials / parts required", "textarea"), F("test_results", "Test results", "textarea"), F("certificate_required", "Certificate / COC required", "boolean"), F("certificate_number", "Certificate / COC number"), F("compliance_docs", "Compliance documentation", "textarea"), F("photos_required", "Before / after photos required", "boolean"), F("recurring_service", "Recurring compliance/service", "boolean")],
  },
  plumber: {
    description: "Plumbing dispatch, emergency response, diagnostics, assets, materials, compliance and recurring maintenance",
    services: ["Blocked drains", "Hot water", "Gas fitting", "Leak detection", "Emergency call-outs", "Fixtures", "Backflow", "Roof plumbing", "Renovations", "Preventative maintenance"],
    jobTypes: [T("blocked_drain", "Blocked drain"), T("hot_water", "Hot water"), T("gas", "Gas fitting"), T("leak", "Leak detection / repair"), T("emergency", "Emergency call-out"), T("fixture", "Fixture / tap / toilet"), T("backflow", "Backflow testing"), T("roof_plumbing", "Roof / stormwater"), T("renovation", "Renovation"), T("preventative", "Preventative maintenance")],
    workflow: [S("new_enquiry", "Request received"), S("triage", "Triage / urgency"), S("site_visit", "Site assessment"), S("quote", "Quote / approval"), S("scheduled", "Scheduled"), S("assigned", "Plumber assigned"), S("in_progress", "On site"), S("waiting_parts", "Waiting parts / access"), S("testing", "Testing / commissioning"), S("completed", "Completed"), S("certificate", "Compliance / certificate"), S("invoiced", "Invoiced"), S("paid", "Paid")],
    jobFields: [F("urgency", "Urgency / SLA"), F("site_contact", "Site contact"), F("access_requirements", "Access requirements", "textarea"), F("water_meter_notes", "Water / gas meter details", "textarea"), F("asset_details", "Hot water / pump / fixture asset details", "textarea"), F("fault_diagnosis", "Fault diagnosis", "textarea"), F("parts_needed", "Parts / materials needed", "textarea"), F("isolation_shutdown", "Water / gas isolation requirements", "textarea"), F("test_results", "Pressure / flow / commissioning results", "textarea"), F("compliance_required", "Compliance certificate required", "boolean"), F("compliance_number", "Certificate / report number"), F("photos_required", "Before / after photos required", "boolean"), F("recurring_service", "Recurring maintenance", "boolean")],
  },
  builder: {
    label: "Building & Construction",
    description: "Estimates, projects, stages, trades, variations, milestones, site records and client approvals",
    services: ["New builds", "Renovations", "Extensions", "Fit-outs", "Repairs", "Minor works", "Defects", "Insurance works", "Make-good works"],
    jobTypes: [T("new_build", "New build"), T("renovation", "Renovation"), T("extension", "Extension"), T("fitout", "Fit-out"), T("minor_works", "Minor works"), T("repair", "Repair"), T("defect", "Defect rectification"), T("variation", "Variation"), T("insurance", "Insurance works")],
    workflow: [S("new_enquiry", "New enquiry"), S("qualified", "Qualified"), S("site_visit", "Site visit"), S("estimate", "Estimate"), S("quote", "Quote / proposal"), S("contract", "Contract / approval"), S("prestart", "Pre-start"), S("scheduled", "Scheduled"), S("in_progress", "In progress"), S("variation", "Variation / approval"), S("practical_completion", "Practical completion"), S("defects", "Defects / rectification"), S("completed", "Completed"), S("invoiced", "Final invoicing")],
    jobFields: [F("site_contact", "Site contact"), F("project_manager", "Project manager / supervisor"), F("project_stage", "Project stage"), F("scope_of_works", "Scope of works", "textarea"), F("plans_specs", "Plans / specifications notes", "textarea"), F("permits", "Approvals / permits", "textarea"), F("subcontractors", "Subcontractors / trades", "textarea"), F("materials", "Materials / procurement", "textarea"), F("variation_notes", "Variations / client approvals", "textarea"), F("site_safety", "Site safety / SWMS notes", "textarea"), F("inspection_notes", "Inspection / QA notes", "textarea"), F("defects", "Defects / rectification", "textarea"), F("client_signoff", "Client sign-off requirements", "textarea")],
  },
  landscaper: {
    label: "Landscaping & Grounds",
    description: "Quoting, site visits, crews, materials, recurring grounds maintenance and horticultural service history",
    services: ["Landscape construction", "Garden maintenance", "Lawn care", "Hedging & pruning", "Irrigation", "Turf", "Planting", "Mulching", "Clean-ups", "Commercial grounds maintenance"],
    jobTypes: [T("landscape_project", "Landscape project"), T("grounds_visit", "Recurring grounds visit"), T("lawn", "Lawn service"), T("pruning", "Pruning / hedging"), T("irrigation", "Irrigation"), T("turf", "Turf"), T("planting", "Planting"), T("cleanup", "Garden clean-up")],
    workflow: [S("enquiry", "Enquiry"), S("site_visit", "Site visit"), S("quote", "Quote"), S("approved", "Approved"), S("scheduled", "Scheduled"), S("crew_assigned", "Crew assigned"), S("in_progress", "In progress"), S("qa", "Site QA"), S("completed", "Completed"), S("recurring", "Recurring service"), S("invoiced", "Invoiced")],
    jobFields: [F("site_contact", "Site contact"), F("site_access", "Site access / gate instructions", "textarea"), F("areas_zones", "Areas / zones", "textarea"), F("scope_of_works", "Scope of works", "textarea"), F("plant_materials", "Plants / materials", "textarea"), F("irrigation_notes", "Irrigation notes", "textarea"), F("green_waste", "Green waste / disposal", "textarea"), F("equipment_required", "Equipment required", "textarea"), F("chemical_use", "Chemical / herbicide notes", "textarea"), F("recurring_service", "Recurring grounds service", "boolean"), F("service_frequency", "Service frequency"), F("photos_required", "Before / after photos required", "boolean")],
  },
  hvac: {
    label: "HVAC & Refrigeration",
    description: "Installations, breakdowns, asset registers, service schedules, refrigerant/compliance and field operations",
    services: ["HVAC installation", "Breakdown service", "Preventative maintenance", "Refrigeration", "Air conditioning service", "Filter service", "Commissioning", "Asset inspections"],
    jobTypes: [T("install", "Installation"), T("breakdown", "Breakdown / fault"), T("preventative", "Preventative maintenance"), T("refrigeration", "Refrigeration service"), T("commissioning", "Commissioning"), T("inspection", "Asset inspection")],
    workflow: [S("request", "Request received"), S("triage", "Triage"), S("site_assessment", "Site assessment"), S("quote", "Quote / approval"), S("scheduled", "Scheduled"), S("technician_assigned", "Technician assigned"), S("in_progress", "On site"), S("waiting_parts", "Waiting parts"), S("commissioning", "Testing / commissioning"), S("compliance", "Compliance record"), S("completed", "Completed"), S("next_service", "Next service scheduled"), S("invoiced", "Invoiced")],
    jobFields: [F("asset_id", "Asset / unit ID"), F("make_model", "Make / model"), F("serial_number", "Serial number"), F("asset_location", "Asset location"), F("fault_code", "Fault code / symptoms", "textarea"), F("diagnosis", "Diagnosis", "textarea"), F("parts_materials", "Parts / materials", "textarea"), F("refrigerant", "Refrigerant type / quantity"), F("pressure_readings", "Pressure / temperature readings", "textarea"), F("commissioning_results", "Commissioning results", "textarea"), F("compliance_notes", "Compliance / refrigerant handling notes", "textarea"), F("recurring_service", "Preventative maintenance contract", "boolean"), F("next_service_due", "Next service due")],
  },
  pest_control: {
    label: "Pest Control",
    description: "Bookings, routes, treatments, chemicals, compliance, recurring visits and site history",
    services: ["General pest", "Termite inspection", "Termite treatment", "Rodent control", "Cockroach treatment", "Ant treatment", "Commercial pest management", "Pre-construction", "Recurring pest plans"],
    jobTypes: [T("general_pest", "General pest"), T("termite_inspection", "Termite inspection"), T("termite_treatment", "Termite treatment"), T("rodent", "Rodent control"), T("commercial", "Commercial service"), T("preconstruction", "Pre-construction treatment"), T("followup", "Follow-up / monitoring")],
    workflow: [S("booking", "Booking"), S("site_assessment", "Site assessment"), S("quote", "Quote / approval"), S("scheduled", "Scheduled"), S("technician_assigned", "Technician assigned"), S("treatment", "Treatment in progress"), S("report", "Treatment / inspection report"), S("completed", "Completed"), S("followup", "Follow-up / monitoring"), S("recurring", "Recurring service"), S("invoiced", "Invoiced")],
    jobFields: [F("site_contact", "Site contact"), F("target_pests", "Target pests"), F("inspection_findings", "Inspection findings", "textarea"), F("treatment_areas", "Treatment areas", "textarea"), F("products_used", "Products / chemicals used", "textarea"), F("chemical_batch", "Product batch / concentration notes", "textarea"), F("sds_notes", "SDS / safety notes", "textarea"), F("risk_controls", "Risk controls / exclusions", "textarea"), F("report_number", "Treatment / inspection report number"), F("photos_required", "Photos / evidence required", "boolean"), F("recurring_service", "Recurring pest plan", "boolean"), F("next_visit_due", "Next visit due")],
  },
  painter: {
    label: "Painting",
    description: "Estimating, surfaces, colours, materials, crews, progress stages, variations and QA",
    services: ["Interior painting", "Exterior painting", "Commercial painting", "Repaints", "New construction", "Feature finishes", "Repairs & preparation"],
    jobTypes: [T("interior", "Interior"), T("exterior", "Exterior"), T("commercial", "Commercial"), T("repaint", "Repaint"), T("new_build", "New construction"), T("repair_prep", "Repair / preparation")],
    workflow: [S("enquiry", "Enquiry"), S("site_measure", "Site measure"), S("quote", "Quote"), S("approved", "Approved"), S("colour_selection", "Colours / finishes confirmed"), S("scheduled", "Scheduled"), S("prep", "Preparation"), S("painting", "Painting"), S("qa", "QA / touch-ups"), S("completed", "Completed"), S("invoiced", "Invoiced")],
    jobFields: [F("site_contact", "Site contact"), F("areas_surfaces", "Areas / surfaces", "textarea"), F("surface_condition", "Surface condition / preparation", "textarea"), F("colour_schedule", "Colours / paint schedule", "textarea"), F("paint_system", "Paint system / products", "textarea"), F("access_equipment", "Access / scaffold / EWP requirements", "textarea"), F("materials", "Materials required", "textarea"), F("crew_notes", "Crew / staging notes", "textarea"), F("variation_notes", "Variations", "textarea"), F("qa_touchups", "QA / touch-up notes", "textarea"), F("photos_required", "Before / after photos required", "boolean")],
  },
  handyman: {
    label: "Handyman & General Maintenance",
    description: "Multi-trade repairs, small works, property maintenance, materials and client approvals",
    services: ["General repairs", "Property maintenance", "Minor carpentry", "Patch & paint", "Fixtures & fittings", "Door / lock repairs", "Furniture assembly", "Make-good works", "Odd jobs"],
    jobTypes: [T("repair", "General repair"), T("maintenance", "Maintenance"), T("carpentry", "Minor carpentry"), T("patch_paint", "Patch & paint"), T("fixture", "Fixture / fitting"), T("make_good", "Make-good"), T("assembly", "Assembly / installation")],
    workflow: [S("request", "Request received"), S("triage", "Triage"), S("quote", "Quote / approval"), S("scheduled", "Scheduled"), S("assigned", "Assigned"), S("in_progress", "In progress"), S("waiting_parts", "Waiting materials"), S("completed", "Completed"), S("client_signoff", "Client sign-off"), S("invoiced", "Invoiced")],
    jobFields: [F("site_contact", "Site contact"), F("issue_description", "Issue / task description", "textarea"), F("access_requirements", "Access requirements", "textarea"), F("materials", "Materials / hardware", "textarea"), F("tools_equipment", "Tools / equipment required", "textarea"), F("trade_boundary", "Licensed trade / specialist referral notes", "textarea"), F("before_after", "Before / after evidence", "textarea"), F("client_signoff", "Client sign-off requirements", "textarea")],
  },
  solar: {
    label: "Solar & Energy",
    description: "Site assessments, system design, installs, commissioning, monitoring, warranties and maintenance",
    services: ["Solar PV", "Battery storage", "EV charging", "System upgrades", "Fault diagnosis", "Monitoring", "Preventative maintenance", "Warranty service"],
    jobTypes: [T("site_assessment", "Site assessment"), T("solar_install", "Solar installation"), T("battery_install", "Battery installation"), T("ev_charger", "EV charger"), T("upgrade", "System upgrade"), T("fault", "Fault / service"), T("maintenance", "Maintenance"), T("warranty", "Warranty service")],
    workflow: [S("lead", "Lead / enquiry"), S("site_assessment", "Site assessment"), S("design", "Design / proposal"), S("approved", "Approved"), S("scheduled", "Scheduled"), S("install", "Installation"), S("commissioning", "Commissioning"), S("compliance", "Compliance / grid paperwork"), S("monitoring", "Monitoring activated"), S("completed", "Completed"), S("warranty", "Warranty / service history"), S("invoiced", "Invoiced")],
    jobFields: [F("site_contact", "Site contact"), F("nmi_meter", "NMI / meter details"), F("roof_site_notes", "Roof / site assessment notes", "textarea"), F("system_design", "System design / capacity", "textarea"), F("panels_inverter", "Panels / inverter details", "textarea"), F("battery_details", "Battery details", "textarea"), F("network_approval", "Network / grid approval notes", "textarea"), F("commissioning_results", "Commissioning / test results", "textarea"), F("monitoring_setup", "Monitoring setup", "textarea"), F("serial_numbers", "Equipment serial numbers", "textarea"), F("warranty_notes", "Warranty notes", "textarea"), F("compliance_docs", "Compliance documents", "textarea")],
  },
  pool_service: {
    label: "Pool Service",
    description: "Recurring routes, water chemistry, equipment, chemicals, repairs and service history",
    services: ["Routine pool service", "Water testing", "Chemical balancing", "Equipment repair", "Pump & filter service", "Green pool recovery", "Pool handover", "Commercial pool maintenance"],
    jobTypes: [T("routine", "Routine service"), T("water_test", "Water test / balance"), T("equipment_repair", "Equipment repair"), T("pump_filter", "Pump / filter service"), T("green_pool", "Green pool recovery"), T("handover", "Pool handover"), T("commercial", "Commercial pool service")],
    workflow: [S("booking", "Booking / route"), S("scheduled", "Scheduled"), S("assigned", "Technician assigned"), S("inspection", "Inspect / test"), S("treatment", "Service / treatment"), S("repair", "Repair / parts"), S("completed", "Completed"), S("report", "Service report"), S("next_service", "Next service scheduled"), S("invoiced", "Invoiced")],
    jobFields: [F("pool_volume", "Pool volume / type"), F("equipment", "Pump / filter / chlorinator details", "textarea"), F("ph", "pH reading"), F("chlorine", "Chlorine reading"), F("alkalinity", "Alkalinity reading"), F("stabiliser", "Stabiliser / CYA reading"), F("salt", "Salt reading"), F("chemicals_added", "Chemicals added", "textarea"), F("equipment_condition", "Equipment condition / faults", "textarea"), F("parts_required", "Parts required", "textarea"), F("recurring_service", "Recurring service", "boolean"), F("next_service_due", "Next service due"), F("service_report", "Service report / client notes", "textarea")],
  },
};

export function enhanceServiceTemplate(template: ServiceTemplate): ServiceTemplate {
  const enhancement = TRADE_ENHANCEMENTS[template.key];
  if (!enhancement) return template;
  return {
    ...template,
    ...enhancement,
    services: enhancement.services ?? template.services,
    jobTypes: enhancement.jobTypes ?? template.jobTypes,
    workflow: enhancement.workflow ?? template.workflow,
    jobFields: enhancement.jobFields ?? template.jobFields,
    terminology: enhancement.terminology ?? template.terminology,
  };
}
