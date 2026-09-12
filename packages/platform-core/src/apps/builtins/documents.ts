import type { AppManifest } from "../manifest";
import { getSidebarIcon } from "../sidebar-icons";

/**
 * Documents — Core App (capability: Documents & Signing).
 * Document Engine + signing lifecycle. Industry Apps can attach documents to
 * the business records and workflows they belong to.
 * @see docs/foundations/DOCUMENTS-AND-SIGNING.md
 */
export const documentsApp: AppManifest = {
  id: "documents",
  name: "Documents",
  description:
    "Documents & Signing — upload, store, version, send for signature and track business documents across CRM and Industry Apps",
  tier: "core",
  version: "0.1.0",
  icon: getSidebarIcon("documents"),
  routes: [
    { path: "/apps/documents", label: "Overview" },
    { path: "/apps/documents/library", label: "Library" },
    { path: "/apps/documents/signing", label: "Signing" },
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
  ],
  entities: ["Document", "Opportunity", "Property", "Contact"],
  automationTriggers: [],
  automationActions: [],
  aiTools: [],
  reports: [{ id: "documents.library_summary", label: "Document library summary" }],
};
