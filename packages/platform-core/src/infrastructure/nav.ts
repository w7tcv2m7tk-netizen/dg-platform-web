export const INFRASTRUCTURE_NAV = [
  { href: "/apps/infrastructure/domains", id: "domains", label: "Domains" },
  { href: "/apps/infrastructure/dns", id: "dns", label: "DNS" },
  { href: "/apps/infrastructure/ssl", id: "ssl", label: "SSL" },
  { href: "/apps/infrastructure/hosting", id: "hosting", label: "Hosting" },
  { href: "/apps/infrastructure/email", id: "email", label: "Email" },
  { href: "/apps/infrastructure/backup", id: "backup", label: "Backup" },
  { href: "/apps/infrastructure/cloudflare", id: "cloudflare", label: "Cloudflare" },
] as const;

export type InfrastructureNavId = (typeof INFRASTRUCTURE_NAV)[number]["id"];
