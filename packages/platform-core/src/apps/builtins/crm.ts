import type { AppManifest } from "../manifest";

export const crmApp: AppManifest = {
  id: "crm",
  name: "CRM",
  description: "Contacts, companies, and customer relationships",
  tier: "core",
  version: "1.0.0",
  icon: "👤",
  routes: [
    { path: "/apps/crm/contacts", label: "Contacts" },
    { path: "/apps/crm/companies", label: "Companies" },
  ],
  navigation: [
    { href: "/apps/crm/contacts", label: "Contacts", icon: "☷" },
  ],
  permissions: [
    { id: "crm.view_contacts", label: "View contacts" },
    { id: "crm.edit_contacts", label: "Edit contacts" },
  ],
  features: [
    "crm.contacts.read",
    "crm.contacts.write",
    "crm.contacts.export",
    "crm.contacts.import",
    "crm.contacts.merge",
    "crm.timeline.read",
    "crm.tags.write",
  ],
  entities: ["Contact", "Company", "Activity", "Task", "Note"],
  automationTriggers: [
    { id: "contact.created", label: "Contact created", objectType: "Contact" },
    { id: "contact.updated", label: "Contact updated", objectType: "Contact" },
  ],
  automationActions: [
    { id: "contact.assign", label: "Assign contact" },
    { id: "contact.add_tag", label: "Add tag" },
  ],
  aiTools: [
    {
      id: "crm.summarise_contact",
      label: "Summarise contact",
      description: "AI summary of contact history and next actions",
    },
  ],
  reports: [{ id: "crm.pipeline_summary", label: "Pipeline summary" }],
};
