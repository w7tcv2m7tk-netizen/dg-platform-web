import type { AppManifest } from "../manifest";

export const infrastructureApp: AppManifest = {
  id: "infrastructure",
  name: "Infrastructure",
  description:
    "DigitalGate Domains, DNS, SSL, hosting, and email — Core Platform Service (provider adapters; Dreamscape V1)",
  tier: "growth",
  version: "0.2.0",
  icon: "⚙",
  routes: [
    { path: "/apps/infrastructure/domains", label: "Domains" },
    { path: "/apps/infrastructure/dns", label: "DNS" },
    // Hosting / Deployments / Monitoring: routes exist as “coming later”
    // pages but are hidden from nav so the AU pilot doesn’t show empty Apps.
  ],
  navigation: [
    { href: "/apps/infrastructure/domains", label: "Infrastructure", icon: "⚙" },
  ],
  permissions: [
    { id: "infra.view", label: "View infrastructure" },
    { id: "infra.domains.manage", label: "Manage domains" },
    { id: "infra.dns.manage", label: "Manage DNS" },
    { id: "infra.hosting.manage", label: "Manage hosting" },
    { id: "infra.deploy", label: "Deploy sites" },
  ],
  features: [
    "infra.domains.read",
    "infra.domains.register",
    "infra.dns.read",
    "infra.dns.write",
    "infra.ssl.read",
    "infra.hosting.read",
    "infra.hosting.provision",
    "infra.deploy.staging",
    "infra.deploy.production",
    "infra.monitoring.read",
    "infra.backups.read",
  ],
  entities: ["Document", "Activity"],
  automationTriggers: [
    { id: "domain.expiring_soon", label: "Domain expiring soon" },
    { id: "ssl.expiring_soon", label: "SSL certificate expiring" },
    { id: "deploy.succeeded", label: "Deployment succeeded" },
    { id: "deploy.failed", label: "Deployment failed" },
    { id: "uptime.incident", label: "Uptime incident detected" },
  ],
  automationActions: [
    { id: "infra.renew_domain", label: "Renew domain" },
    { id: "infra.renew_ssl", label: "Renew SSL certificate" },
    { id: "infra.deploy_staging", label: "Deploy to staging" },
    { id: "infra.promote_production", label: "Promote to production" },
  ],
  aiTools: [
    {
      id: "infra.dns_recommend",
      label: "DNS setup assistant",
      description: "Recommend DNS records for email and hosting",
    },
    {
      id: "infra.deploy_diagnose",
      label: "Diagnose deployment failure",
      description: "Analyse deploy logs and suggest fixes",
    },
  ],
  reports: [
    { id: "infra.uptime_report", label: "Uptime report" },
    { id: "infra.domain_expiry_report", label: "Domain & SSL expiry report" },
  ],
};
