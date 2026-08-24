import type { AppManifest } from "../manifest";
import { getSidebarIcon } from "../sidebar-icons";

/**
 * Documents — Core App (capability: Documents & Signing).
 * Document Engine + signing lifecycle. Real Estate is the first consumer, not the owner.
 * @see docs/foundations/DOCUMENTS-AND-SIGNING.md
 */
export const documentsApp: AppManifest = {
  id: "documents",
  name: "Documents",
  description:
    "Documents & Signing — store, version and track business documents across CRM and Industry Apps",
  tier: "core",
  version: "0.1.0",
  icon: getSidebarIcon("documents"),
  routes: [
    { path: "/apps/documents", label: "Overview" },
    { path: "/apps/documents/library", label: "Library" },
    { path: "/apps/documents/templates", label: "Templates" },
  ],
  navigation: [
    { href: "/apps/documents", label: "Documents", icon: getSidebarIcon("documents") },
  ],
  permissions: [
    { id: "documents.view", label: "View documents" },
    { id: "documents.upload", label: "Upload documents" },
    { id: "documents.manage", label: "Manage and archive documents" },
  ],
  features: [
    "documents.read",
    "documents.write",
    "documents.sign.manual",
  ],
  entities: ["Document", "Opportunity", "Property", "Contact"],
  automationTriggers: [
    { id: "document.created", label: "Document created", objectType: "Document" },
    { id: "document.uploaded", label: "Document uploaded", objectType: "Document" },
    { id: "document.updated", label: "Document updated", objectType: "Document" },
    { id: "document.archived", label: "Document archived", objectType: "Document" },
    { id: "document.replaced", label: "Document replaced", objectType: "Document" },
    { id: "document.signing_requested", label: "Signing requested", objectType: "Document" },
    { id: "document.viewed", label: "Document viewed", objectType: "Document" },
    { id: "document.signed", label: "Document signed", objectType: "Document" },
    { id: "document.completed", label: "Document completed", objectType: "Document" },
  ],
  automationActions: [],
  aiTools: [
    {
      id: "documents.prepare_from_template",
      label: "Prepare document from template",
      description: "Direction — after Act/Context Builder; populate template from CRM",
    },
  ],
  reports: [{ id: "documents.library_summary", label: "Document library summary" }],
};
