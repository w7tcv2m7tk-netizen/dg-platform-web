import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export const SCHEMA_FILES = [
  "packages/database/prisma/schema.prisma",
  "packages/database/prisma/models/ai-visibility.prisma",
  "packages/database/prisma/models/business-brain.prisma",
];

export const MIGRATION_DIR = "packages/database/prisma/migrations";

const TABLE_PRIVILEGES = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER", "MAINTAIN"];
const SEQUENCE_PRIVILEGES = ["USAGE", "SELECT", "UPDATE"];
const REQUIRED_MODULES = [
  "CRM",
  "Prospecting & Acquisition",
  "Business Brain",
  "AI",
  "Websites & Content",
  "Tasks & Automation",
  "Billing & Entitlements",
  "Commerce & Payments",
  "Industry Applications",
  "Checkout",
  "Identity & Tenancy",
];

const MODULE_BY_TABLE = {
  organisations: "Identity & Tenancy",
  memberships: "Identity & Tenancy",
  contacts: "CRM",
  companies: "CRM",
  activities: "CRM",
  tasks: "Tasks & Automation",
  notifications: "Tasks & Automation",
  leads: "CRM",
  opportunities: "CRM",
  properties: "CRM",
  org_documents: "CRM",
  org_communications: "Communications",
  service_jobs: "Industry Applications",
  accommodation_units: "Industry Applications",
  stay_bookings: "Industry Applications",
  accommodation_guest_profiles: "Industry Applications",
  app_installations: "Apps",
  audit_logs: "Audit",
  growth_prospects: "Prospecting & Acquisition",
  growth_prospect_audits: "Prospecting & Acquisition",
  growth_prospect_reports: "Prospecting & Acquisition",
  growth_prospect_engagements: "Prospecting & Acquisition",
  commerce_products: "Commerce & Payments",
  commerce_quotes: "Commerce & Payments",
  commerce_invoices: "Commerce & Payments",
  commerce_payment_requests: "Commerce & Payments",
  commerce_payments: "Commerce & Payments",
  commerce_subscriptions: "Commerce & Payments",
  commerce_refunds: "Commerce & Payments",
  platform_checkout_attempts: "Checkout",
  platform_subscriptions: "Billing & Entitlements",
  platform_subscription_events: "Billing & Entitlements",
  stripe_webhook_receipts: "Billing & Entitlements",
  payment_connector_installations: "Commerce & Payments",
  platform_api_keys: "Platform",
  platform_referrals: "Platform",
  platform_referral_ledger: "Platform",
  websites: "Websites & Content",
  website_pages: "Websites & Content",
  infrastructure_domains: "Websites & Content",
  dreamscape_customer_links: "Websites & Content",
  dreamscape_webhook_events: "Websites & Content",
  finance_applications: "Industry Applications",
  commercial_properties: "Industry Applications",
  commercial_leases: "Industry Applications",
  partners: "Partners & Delivery",
  partner_referrals: "Partners & Delivery",
  partner_commissions: "Partners & Delivery",
  partner_commission_events: "Partners & Delivery",
  customer_partner_attributions: "Partners & Delivery",
  delivery_projects: "Partners & Delivery",
  delivery_milestones: "Partners & Delivery",
  delivery_tasks: "Partners & Delivery",
  delivery_blockers: "Partners & Delivery",
  pm_properties: "Industry Applications",
  pm_leases: "Industry Applications",
  pm_maintenance_requests: "Industry Applications",
  communication_agents: "Communications",
  communication_sessions: "Communications",
  communication_messages: "Communications",
  agent_actions: "Aida",
  communication_usages: "Communications",
  support_conversations: "Support",
  support_messages: "Support",
  aida_conversations: "Aida",
  ai_worker_principals: "AI",
  ai_local_deployments: "AI",
  ai_worker_claim_receipts: "AI",
  ai_local_recipient_approvals: "AI",
  ai_inference_jobs: "AI",
  ai_accounting_outbox: "AI",
  ai_worker_provisioning_receipts: "AI",
  platform_checkout_creation_gate: "Checkout",
  platform_checkout_admissions: "Checkout",
  platform_checkout_admission_audit: "Checkout",
  business_knowledge_sources: "Business Brain",
  business_knowledge_items: "Business Brain",
  business_knowledge_links: "Business Brain",
  ai_visibility_prompts: "AI Visibility",
  ai_visibility_competitors: "AI Visibility",
  ai_visibility_observations: "AI Visibility",
  ai_visibility_competitor_mentions: "AI Visibility",
  ai_visibility_citations: "AI Visibility",
};

const PRIVILEGE_OVERRIDES = {
  audit_logs: { privileges: ["SELECT", "INSERT"], rationale: "Append-only business audit history; the application creates and reads evidence but cannot rewrite or erase it." },
  growth_prospect_audits: { privileges: ["SELECT", "INSERT"], rationale: "Append-only prospect audit evidence; corrections use new evidence rather than mutation." },
  platform_subscription_events: { privileges: ["SELECT", "INSERT"], rationale: "Append-only billing event/audit history; webhook and reconciliation code only creates and reads events." },
  stripe_webhook_receipts: { privileges: ["SELECT", "INSERT", "UPDATE"], rationale: "Webhook claim/reclaim state requires create, read and conditional update; runtime never deletes receipts." },
  ai_worker_claim_receipts: { privileges: ["SELECT", "INSERT", "DELETE"], rationale: "Claim receipts require create/read and retention cleanup; no update path is used." },
  ai_inference_jobs: { privileges: ["SELECT", "INSERT", "UPDATE", "DELETE"], rationale: "AI job lifecycle requires create/read/update plus bounded retention cleanup." },
  ai_accounting_outbox: { privileges: ["SELECT", "INSERT", "UPDATE", "DELETE"], rationale: "Outbox delivery requires create/read/update plus delivered-row retention cleanup." },
  ai_worker_provisioning_receipts: { privileges: ["SELECT", "INSERT", "UPDATE"], rationale: "Provisioning receipts are created, read and completed by a constrained UPDATE; never deleted at runtime." },
  ai_worker_principals: { privileges: ["SELECT", "INSERT", "UPDATE"], rationale: "Worker principals require create/read/update; revocation is an update, not a delete." },
  ai_local_deployments: { privileges: ["SELECT", "INSERT", "UPDATE"], rationale: "Local deployments require create/read/update; no runtime delete path exists." },
  ai_local_recipient_approvals: { privileges: ["SELECT", "INSERT", "UPDATE"], rationale: "Recipient authority is approved/revoked by update; no runtime delete path exists." },
  platform_checkout_attempts: { privileges: ["SELECT", "INSERT", "UPDATE"], rationale: "Durable checkout attempt creation/read/update; attempts are retained for recovery and containment." },
  platform_api_keys: { privileges: ["SELECT", "INSERT", "UPDATE"], rationale: "API keys are created, read and revoked by update; runtime does not delete key history." },
  platform_referrals: { privileges: ["SELECT", "INSERT", "UPDATE"], rationale: "Referral lifecycle requires create/read/update; no runtime delete path exists." },
  platform_referral_ledger: { privileges: ["SELECT", "INSERT"], rationale: "Commercial ledger is append-only." },
  partner_commission_events: { privileges: ["SELECT", "INSERT"], rationale: "Commission event ledger is append-only." },
  growth_prospect_engagements: { privileges: ["SELECT", "INSERT"], rationale: "Engagement evidence is appended and read; no runtime mutation path exists." },
  agent_actions: { privileges: ["SELECT", "INSERT"], rationale: "Aida action history is append-only." },
  aida_conversations: { privileges: ["SELECT", "INSERT", "UPDATE"], rationale: "Conversation creation/read/update is required; no runtime delete path exists." },
  platform_checkout_creation_gate: {
    privileges: ["SELECT"],
    columnPrivileges: { UPDATE: ["last_admission_expires_at"] },
    rationale: "Runtime may read the singleton and advance only the admission horizon; blocked, hold and revision remain operator-controlled.",
  },
  platform_checkout_admissions: {
    privileges: ["SELECT"],
    columnPrivileges: { UPDATE: ["attempt_id"] },
    rationale: "Runtime may read authority and bind an unused permit to one attempt; it cannot create, approve, revoke or rewrite permit terms.",
  },
  platform_checkout_admission_audit: {
    privileges: ["SELECT"],
    rationale: "Audit evidence is append-only and written only by the fixed-search-path SECURITY DEFINER trigger.",
  },
  support_messages: { privileges: ["SELECT", "INSERT", "UPDATE", "DELETE"], rationale: "Support messages require create/read/update and cascade/merge cleanup." },
};

const SEQUENCE_OVERRIDES = {
  support_messages_id_seq: { privileges: ["USAGE", "SELECT"], module: "Support", rationale: "Required for the SERIAL support message identifier." },
};

const DENIED_SEQUENCES = {
  platform_checkout_admission_audit_id_seq: "Reserved for the admission audit trigger owner; runtime must not allocate audit identifiers.",
};

const FUNCTION_ENTRIES = {
  audit_platform_checkout_admission: { securityDefiner: true, runtimeExecute: false, module: "Checkout", rationale: "Trigger-only audit writer; runtime must not execute it directly." },
  preserve_checkout_admission_audit: { securityDefiner: false, runtimeExecute: false, module: "Checkout", rationale: "Trigger-only append-only guard; runtime must not execute it directly." },
  ai_accounting_outbox_job_scope_check: { securityDefiner: false, runtimeExecute: "trigger-only", module: "AI", rationale: "Trigger function validates outbox job scope; it is not a runtime-callable procedure." },
  ai_inference_jobs_terminal_immutable: { securityDefiner: false, runtimeExecute: "trigger-only", module: "AI", rationale: "Trigger function preserves terminal AI job state; it is not a runtime-callable procedure." },
  ai_inference_jobs_completion_deadline_check: { securityDefiner: false, runtimeExecute: "trigger-only", module: "AI", rationale: "Deferred constraint trigger validates completion deadlines; it is not a runtime-callable procedure." },
};

const OPERATOR_ONLY = [
  {
    path: "src/lib/remediate-991-physical.ts",
    reason: "One-time #991 schema remediation requires table locks, DDL and the migration ledger. It must run with separate owner/operator authority, never the runtime role.",
  },
  {
    path: "src/lib/remediate-991-sql.ts",
    reason: "Reviewed #991 remediation SQL parser is part of the owner-only schema operation.",
  },
  {
    path: "src/lib/remediate-991-sql-generated.ts",
    reason: "Generated #991 DDL is owner-only and excluded from runtime SQL analysis.",
  },
  {
    path: "packages/platform-core/src/billing/legacy-app-entitlement-reconciliation.ts",
    reason: "Signed legacy reconciliation is an operator-only billing repair path; runtime tables it touches remain granted for normal billing operations.",
  },
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === ".git") continue;
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (/\.(?:ts|tsx|mjs|js)$/.test(name)) out.push(full);
  }
  return out;
}

export function parsePrismaModels(root) {
  const models = [];
  for (const relative of SCHEMA_FILES) {
    const source = readFileSync(path.join(root, relative), "utf8");
    const pattern = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
    for (const match of source.matchAll(pattern)) {
      const model = match[1];
      const body = match[2];
      const mapped = body.match(/@@map\("([^"]+)"\)/);
      models.push({ model, table: mapped?.[1] ?? model, file: relative });
    }
  }
  return models.sort((a, b) => a.table.localeCompare(b.table));
}

export function parseMigrationFunctions(root) {
  const dir = path.join(root, MIGRATION_DIR);
  const functions = new Set();
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name, "migration.sql");
    let source;
    try {
      source = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const match of source.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:"([^"]+)"|([a-zA-Z_][a-zA-Z0-9_]*))/gi)) {
      functions.add(match[1] ?? match[2]);
    }
  }
  return [...functions].sort();
}

function moduleFor(table) {
  return MODULE_BY_TABLE[table] ?? "Platform";
}

function privilegesFor(table) {
  const override = PRIVILEGE_OVERRIDES[table];
  if (override) return { module: moduleFor(table), ...override, columnPrivileges: override.columnPrivileges ?? {} };
  return {
    module: moduleFor(table),
    privileges: ["SELECT", "INSERT", "UPDATE", "DELETE"],
    columnPrivileges: {},
    rationale: "General application CRUD required by Prisma relation traversal and the module's current operations.",
  };
}

export function buildManifest(root) {
  const models = parsePrismaModels(root);
  const tables = {};
  for (const { table } of models) {
    if (table === "_prisma_migrations") continue;
    const entry = privilegesFor(table);
    tables[table] = {
      module: entry.module,
      privileges: entry.privileges,
      columnPrivileges: entry.columnPrivileges,
      rationale: entry.rationale,
    };
  }
  const sequences = {};
  for (const [name, entry] of Object.entries(SEQUENCE_OVERRIDES)) {
    sequences[name] = { ...entry };
  }
  return {
    schemaVersion: 1,
    name: "DigitalGate restricted runtime database role",
    generatedFrom: SCHEMA_FILES,
    policy: {
      roleMustExist: true,
      loginManagedSeparately: true,
      roleAttributes: {
        rolsuper: false,
        rolcreaterole: false,
        rolcreatedb: false,
        rolreplication: false,
        rolbypassrls: false,
      },
      allowRoleMemberships: false,
      allowObjectOwnership: false,
      database: { connect: true, create: false, temp: "inherited-public-baseline" },
      schema: { public: { usage: true, create: false } },
      migrationLedgerAccess: false,
    },
    tables,
    sequences,
    deniedSequences: DENIED_SEQUENCES,
    functions: FUNCTION_ENTRIES,
    excludedRelations: {
      _prisma_migrations: "Prisma's migration ledger is written only by the migration operator; the runtime role must have no access.",
    },
    prohibitedTablePrivileges: ["TRUNCATE", "REFERENCES", "TRIGGER", "MAINTAIN"],
    prohibitedSchemaPrivileges: ["CREATE"],
    operatorOnly: OPERATOR_ONLY,
    requiredModules: REQUIRED_MODULES,
  };
}

function requiredPrivilegesForMethod(method) {
  if (method.startsWith("find") || method === "count" || method === "aggregate" || method === "groupBy") return ["SELECT"];
  if (method === "create" || method === "createMany" || method === "createManyAndReturn") return ["INSERT"];
  if (method === "update" || method === "updateMany") return ["UPDATE"];
  if (method === "upsert") return ["INSERT", "UPDATE"];
  if (method === "delete" || method === "deleteMany") return ["DELETE"];
  return [];
}

function tableUsage(root) {
  const models = parsePrismaModels(root);
  const byCamel = new Map(models.map(({ model, table }) => [model[0].toLowerCase() + model.slice(1), table]));
  const usage = new Map();
  const ddl = [];
  const operatorPaths = new Set(OPERATOR_ONLY.map((entry) => entry.path));
  const files = [
    ...walk(path.join(root, "src")),
    ...walk(path.join(root, "packages")),
    ...walk(path.join(root, "workers")),
  ];
  for (const full of files) {
    const relative = path.relative(root, full);
    if (operatorPaths.has(relative)) continue;
    if (relative.endsWith("remediate-991-sql-generated.ts")) continue;
    const source = readFileSync(full, "utf8");
    for (const match of source.matchAll(/\b(?:prisma|tx|db|database|client)\.([a-zA-Z][A-Za-z0-9_]*)\.(findUnique|findUniqueOrThrow|findFirst|findFirstOrThrow|findMany|create|createMany|createManyAndReturn|update|updateMany|upsert|delete|deleteMany|count|aggregate|groupBy)\b/g)) {
      const table = byCamel.get(match[1]);
      if (!table) continue;
      const entry = usage.get(table) ?? { privileges: new Set(), updateColumns: new Set() };
      for (const privilege of requiredPrivilegesForMethod(match[2])) entry.privileges.add(privilege);
      usage.set(table, entry);
    }
    if (!source.includes("queryRaw") && !source.includes("executeRaw")) continue;
    for (const sql of extractSqlTemplates(source)) {
      if (/\b(?:ALTER|CREATE|DROP|GRANT|REVOKE|TRUNCATE|SET\s+ROLE|SET\s+SESSION\s+AUTHORIZATION)\b/i.test(sql)) {
        ddl.push({ file: relative, statement: sql.slice(0, 160).replace(/\s+/g, " ") });
      }
      for (const ref of sqlTableReferences(sql)) {
        const entry = usage.get(ref.table) ?? { privileges: new Set(), updateColumns: new Set() };
        entry.privileges.add(ref.privilege);
        if (ref.privilege === "UPDATE") for (const column of ref.columns ?? []) entry.updateColumns.add(column);
        usage.set(ref.table, entry);
      }
    }
  }
  return { usage, ddl };
}

function extractSqlTemplates(source) {
  const out = [];
  for (const match of source.matchAll(/`/g)) {
    const start = match.index + 1;
    let index = start;
    let escaped = false;
    const chars = [];
    while (index < source.length) {
      const char = source[index];
      if (escaped) {
        chars.push(char);
        escaped = false;
      } else if (char === "\\") {
        chars.push(char);
        escaped = true;
      } else if (char === "`") {
        break;
      } else {
        chars.push(char);
      }
      index += 1;
    }
    const raw = chars.join("").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ").trim();
    if (/^(?:SELECT|WITH|INSERT|UPDATE|DELETE|LOCK|SET|SAVEPOINT|ROLLBACK)\b/i.test(raw)) out.push(raw);
  }
  return out;
}

function splitTopLevel(value) {
  const parts = [];
  let depth = 0;
  let current = "";
  let quote = null;
  for (const char of value) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
    } else if (char === "(") {
      depth += 1;
      current += char;
    } else if (char === ")") {
      depth = Math.max(0, depth - 1);
      current += char;
    } else if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function sqlTableReferences(sql) {
  const refs = [];
  const ctes = new Set();
  for (const match of sql.matchAll(/\bWITH\s+(?:RECURSIVE\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s+AS\b/gi)) ctes.add(match[1]);
  for (const match of sql.matchAll(/,\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+AS\s*\(/gi)) ctes.add(match[1]);
  const parseSql = sql.replace(/\bEXTRACT\s*\([\s\S]*?\bFROM\b[\s\S]*?\)/gi, "EXTRACT()");
  const add = (table, privilege, columns) => {
    if (!table || /^(?:select|where|set|values|dual|lateral|unnest)$/i.test(table) || ctes.has(table)) return;
    refs.push({ table, privilege, columns });
  };
  for (const match of parseSql.matchAll(/\bINSERT\s+INTO\s+(?:public\.)?["]?([a-zA-Z_][a-zA-Z0-9_]*)["]?/gi)) add(match[1], "INSERT");
  for (const match of parseSql.matchAll(/\bDELETE\s+FROM\s+(?:public\.)?["]?([a-zA-Z_][a-zA-Z0-9_]*)["]?/gi)) add(match[1], "DELETE");
  for (const match of parseSql.matchAll(/\bUPDATE\s+(?!OF\b)(?:public\.)?["]?([a-zA-Z_][a-zA-Z0-9_]*)["]?(?:\s+(?:AS\s+)?["]?[a-zA-Z_][a-zA-Z0-9_]*["]?)?\s+SET\s+([\s\S]*?)(?=\bWHERE\b|\bFROM\b|\bRETURNING\b|;|$)/gi)) {
    const columns = splitTopLevel(match[2]).map((part) => part.trim().match(/^["]?([a-zA-Z_][a-zA-Z0-9_]*)["]?\s*=/)?.[1]).filter(Boolean);
    add(match[1], "UPDATE", columns);
  }
  for (const match of parseSql.matchAll(/\bFROM\s+(?:public\.)?["]?([a-zA-Z_][a-zA-Z0-9_]*)["]?/gi)) add(match[1], "SELECT");
  for (const match of parseSql.matchAll(/\bJOIN\s+(?:public\.)?["]?([a-zA-Z_][a-zA-Z0-9_]*)["]?/gi)) add(match[1], "SELECT");
  return refs;
}

function hasPrivilege(entry, privilege, column) {
  if ((entry.privileges ?? []).includes(privilege)) return true;
  if (column && (entry.columnPrivileges?.[privilege] ?? []).includes(column)) return true;
  return false;
}

export function validateManifest(root, manifest) {
  const errors = [];
  const models = parsePrismaModels(root);
  const schemaTables = new Set(models.map(({ table }) => table));
  const manifestTables = new Set(Object.keys(manifest.tables));

  for (const table of schemaTables) {
    if (table === "_prisma_migrations") continue;
    if (!manifestTables.has(table)) errors.push(`schema table missing from manifest: ${table}`);
  }
  for (const table of manifestTables) {
    if (!schemaTables.has(table)) errors.push(`manifest table not present in Prisma schema: ${table}`);
  }
  if (!manifest.excludedRelations?._prisma_migrations) errors.push("_prisma_migrations must be explicitly excluded");
  if (manifestTables.has("_prisma_migrations")) errors.push("_prisma_migrations must not be granted");

  for (const table of ["platform_checkout_admissions", "platform_checkout_admission_audit", "platform_checkout_creation_gate"]) {
    if (!manifest.tables[table]) errors.push(`missing checkout security table: ${table}`);
  }
  const admissions = manifest.tables.platform_checkout_admissions;
  if (admissions) {
    if (JSON.stringify(admissions.privileges) !== JSON.stringify(["SELECT"])) errors.push("admissions table-level privileges must be exactly SELECT");
    if (JSON.stringify(admissions.columnPrivileges?.UPDATE) !== JSON.stringify(["attempt_id"])) errors.push("admissions UPDATE must be column-limited to attempt_id");
  }
  const audit = manifest.tables.platform_checkout_admission_audit;
  if (audit && JSON.stringify(audit.privileges) !== JSON.stringify(["SELECT"])) errors.push("admission audit privileges must be exactly SELECT");
  const gate = manifest.tables.platform_checkout_creation_gate;
  if (gate) {
    if (JSON.stringify(gate.privileges) !== JSON.stringify(["SELECT"])) errors.push("gate table-level privileges must be exactly SELECT");
    if (JSON.stringify(gate.columnPrivileges?.UPDATE) !== JSON.stringify(["last_admission_expires_at"])) errors.push("gate UPDATE must be column-limited to last_admission_expires_at");
  }

  for (const [table, entry] of Object.entries(manifest.tables)) {
    for (const privilege of entry.privileges ?? []) {
      if (!TABLE_PRIVILEGES.includes(privilege)) errors.push(`${table}: unknown table privilege ${privilege}`);
      if (manifest.prohibitedTablePrivileges.includes(privilege)) errors.push(`${table}: prohibited table privilege ${privilege}`);
    }
    if (entry.privileges?.includes("UPDATE") && entry.columnPrivileges?.UPDATE) errors.push(`${table}: table-level and column-level UPDATE are both present`);
  }

  for (const [name, entry] of Object.entries(manifest.sequences ?? {})) {
    for (const privilege of entry.privileges ?? []) {
      if (!SEQUENCE_PRIVILEGES.includes(privilege)) errors.push(`${name}: unknown sequence privilege ${privilege}`);
    }
  }
  for (const name of Object.keys(manifest.deniedSequences ?? {})) {
    if (manifest.sequences?.[name]) errors.push(`${name}: sequence cannot be both granted and denied`);
  }

  const migrationFunctions = parseMigrationFunctions(root);
  for (const name of migrationFunctions) {
    if (!manifest.functions?.[name]) errors.push(`migration function missing from manifest: ${name}`);
  }
  for (const name of Object.keys(manifest.functions ?? {})) {
    if (!migrationFunctions.includes(name)) errors.push(`manifest function not present in migrations: ${name}`);
  }
  for (const [name, entry] of Object.entries(manifest.functions ?? {})) {
    if (entry.securityDefiner && entry.runtimeExecute !== false) errors.push(`${name}: SECURITY DEFINER function must deny runtime execution`);
  }

  const { usage, ddl } = tableUsage(root);
  for (const [table, used] of usage) {
    const entry = manifest.tables[table];
    if (!entry) {
      errors.push(`runtime references table not in manifest: ${table}`);
      continue;
    }
    for (const privilege of used.privileges) {
      if (privilege === "UPDATE") {
        if ((entry.privileges ?? []).includes("UPDATE")) continue;
        const allowed = new Set(entry.columnPrivileges?.UPDATE ?? []);
        const columns = [...used.updateColumns];
        if (columns.length === 0) errors.push(`${table}: runtime uses UPDATE but manifest grants no table-level UPDATE`);
        for (const column of columns) if (!allowed.has(column)) errors.push(`${table}: runtime updates ${column} but manifest does not grant it`);
      } else if (!hasPrivilege(entry, privilege)) {
        errors.push(`${table}: runtime uses ${privilege} but manifest does not grant it`);
      }
    }
  }
  for (const item of ddl) errors.push(`runtime DDL/privilege statement outside operator-only paths: ${item.file}: ${item.statement}`);

  const modules = new Set(Object.values(manifest.tables).map((entry) => entry.module));
  for (const requiredModule of manifest.requiredModules ?? []) {
    if (!modules.has(requiredModule)) errors.push(`required module has no manifest table: ${requiredModule}`);
  }

  for (const entry of manifest.operatorOnly ?? []) {
    try {
      statSync(path.join(root, entry.path));
    } catch {
      errors.push(`operator-only path missing: ${entry.path}`);
    }
  }
  return errors;
}

export function renderGrantsSql(manifest) {
  const lines = [];
  lines.push("\\set ON_ERROR_STOP on");
  lines.push("BEGIN;");
  lines.push("SET LOCAL lock_timeout='3s';");
  lines.push("SET LOCAL statement_timeout='10s';");
  lines.push("SELECT set_config('dg.runtime_role', :'runtime_role', true);");
  lines.push("");
  lines.push("DO $runtime_role_precheck$");
  lines.push("DECLARE");
  lines.push("  v_role text := current_setting('dg.runtime_role', true);");
  lines.push("  v_oid oid;");
  lines.push("BEGIN");
  lines.push("  IF v_role IS NULL OR length(v_role)=0 THEN RAISE EXCEPTION 'runtime_role is required'; END IF;");
  lines.push("  SELECT oid INTO v_oid FROM pg_catalog.pg_roles WHERE rolname=v_role;");
  lines.push("  IF v_oid IS NULL THEN RAISE EXCEPTION 'runtime role does not exist: %', v_role; END IF;");
  lines.push("  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles r WHERE r.oid=v_oid AND (r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication OR r.rolbypassrls OR NOT r.rolcanlogin)) THEN RAISE EXCEPTION 'runtime role has unsafe attributes or cannot log in'; END IF;");
  lines.push("  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles x WHERE x.oid<>v_oid AND pg_catalog.pg_has_role(v_oid,x.oid,'MEMBER')) THEN RAISE EXCEPTION 'runtime role has role memberships'; END IF;");
  lines.push("  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_roles o ON o.oid=c.relowner WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','p','v','m','S','f') AND pg_catalog.pg_has_role(v_oid,o.oid,'MEMBER')) THEN RAISE EXCEPTION 'runtime role owns or inherits ownership of a public relation'; END IF;");
  lines.push("  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_roles o ON o.oid=p.proowner WHERE p.pronamespace='public'::regnamespace AND pg_catalog.pg_has_role(v_oid,o.oid,'MEMBER')) THEN RAISE EXCEPTION 'runtime role owns or inherits ownership of a public function'; END IF;");
  lines.push("  IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace n JOIN pg_catalog.pg_roles o ON o.oid=n.nspowner WHERE n.nspname='public' AND pg_catalog.pg_has_role(v_oid,o.oid,'MEMBER')) THEN RAISE EXCEPTION 'runtime role owns or inherits ownership of schema public'; END IF;");
  lines.push("  IF has_schema_privilege(v_oid,'public','CREATE') THEN RAISE EXCEPTION 'runtime role can create in schema public'; END IF;");
  lines.push("  IF has_database_privilege(v_oid,current_database(),'CREATE') THEN RAISE EXCEPTION 'runtime role has database CREATE'; END IF;");
  lines.push("END");
  lines.push("$runtime_role_precheck$;");
  lines.push("");
  lines.push("SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'runtime_role') \\gexec");
  lines.push("GRANT USAGE ON SCHEMA public TO :\"runtime_role\";");
  lines.push("");

  const groups = new Map();
  for (const [table, entry] of Object.entries(manifest.tables)) {
    const key = entry.privileges.join(",");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(table);
  }
  for (const [key, tables] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`GRANT ${key.replaceAll(",", ", ")} ON TABLE ${tables.map((table) => `public."${table}"`).join(", ")} TO :"runtime_role";`);
  }
  for (const [table, entry] of Object.entries(manifest.tables)) {
    for (const [privilege, columns] of Object.entries(entry.columnPrivileges ?? {})) {
      lines.push(`GRANT ${privilege} (${columns.join(", ")}) ON TABLE public."${table}" TO :"runtime_role";`);
    }
  }
  lines.push("");
  for (const [name, entry] of Object.entries(manifest.sequences)) {
    lines.push(`GRANT ${entry.privileges.join(", ")} ON SEQUENCE public."${name}" TO :"runtime_role";`);
  }
  lines.push("");
  lines.push("SELECT 'runtime_role_grants_applied' AS result;");
  lines.push("COMMIT;");
  lines.push("");
  return lines.join("\n");
}

export function renderVerifySql(manifest) {
  const lines = [];
  lines.push("\\set ON_ERROR_STOP on");
  lines.push("BEGIN;");
  lines.push("SET LOCAL lock_timeout='3s';");
  lines.push("SET LOCAL statement_timeout='10s';");
  lines.push("SELECT set_config('dg.runtime_role', :'runtime_role', true);");
  lines.push("CREATE TEMP TABLE dg_runtime_expected_tables (table_name text PRIMARY KEY, table_privileges text[] NOT NULL, column_privileges jsonb NOT NULL) ON COMMIT DROP;");
  for (const [table, entry] of Object.entries(manifest.tables)) {
    const privileges = entry.privileges.map((privilege) => `'${privilege}'`).join(",");
    const columns = JSON.stringify(entry.columnPrivileges ?? {}).replaceAll("'", "''");
    lines.push(`INSERT INTO dg_runtime_expected_tables VALUES ('${table}', ARRAY[${privileges}]::text[], '${columns}'::jsonb);`);
  }
  lines.push("CREATE TEMP TABLE dg_runtime_expected_sequences (sequence_name text PRIMARY KEY, sequence_privileges text[] NOT NULL) ON COMMIT DROP;");
  for (const [name, entry] of Object.entries(manifest.sequences)) {
    const privileges = entry.privileges.map((privilege) => `'${privilege}'`).join(",");
    lines.push(`INSERT INTO dg_runtime_expected_sequences VALUES ('${name}', ARRAY[${privileges}]::text[]);`);
  }
  lines.push("CREATE TEMP TABLE dg_runtime_denied_sequences (sequence_name text PRIMARY KEY) ON COMMIT DROP;");
  for (const name of Object.keys(manifest.deniedSequences)) {
    lines.push(`INSERT INTO dg_runtime_denied_sequences VALUES ('${name}');`);
  }
  lines.push("");
  lines.push("DO $runtime_role_verify$");
  lines.push("DECLARE");
  lines.push("  v_role text := current_setting('dg.runtime_role', true);");
  lines.push("  v_oid oid;");
  lines.push("  v_table record;");
  lines.push("  v_sequence record;");
  lines.push("  v_column record;");
  lines.push("  v_privilege text;");
  lines.push("  v_all text[] := ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'];");
  lines.push("BEGIN");
  lines.push("  IF v_role IS NULL OR length(v_role)=0 THEN RAISE EXCEPTION 'runtime_role is required'; END IF;");
  lines.push("  SELECT oid INTO v_oid FROM pg_catalog.pg_roles WHERE rolname=v_role;");
  lines.push("  IF v_oid IS NULL THEN RAISE EXCEPTION 'runtime role does not exist: %', v_role; END IF;");
  lines.push("  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles r WHERE r.oid=v_oid AND (r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication OR r.rolbypassrls OR NOT r.rolcanlogin)) THEN RAISE EXCEPTION 'runtime role has unsafe attributes or cannot log in'; END IF;");
  lines.push("  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles x WHERE x.oid<>v_oid AND pg_catalog.pg_has_role(v_oid,x.oid,'MEMBER')) THEN RAISE EXCEPTION 'runtime role has role memberships'; END IF;");
  lines.push("  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_roles o ON o.oid=c.relowner WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','p','v','m','S','f') AND pg_catalog.pg_has_role(v_oid,o.oid,'MEMBER')) THEN RAISE EXCEPTION 'runtime role owns or inherits ownership of a public relation'; END IF;");
  lines.push("  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_roles o ON o.oid=p.proowner WHERE p.pronamespace='public'::regnamespace AND pg_catalog.pg_has_role(v_oid,o.oid,'MEMBER')) THEN RAISE EXCEPTION 'runtime role owns or inherits ownership of a public function'; END IF;");
  lines.push("  IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace n JOIN pg_catalog.pg_roles o ON o.oid=n.nspowner WHERE n.nspname='public' AND pg_catalog.pg_has_role(v_oid,o.oid,'MEMBER')) THEN RAISE EXCEPTION 'runtime role owns or inherits ownership of schema public'; END IF;");
  lines.push("  IF has_schema_privilege(v_oid,'public','CREATE') THEN RAISE EXCEPTION 'runtime role can create in schema public'; END IF;");
  lines.push("  IF has_database_privilege(v_oid,current_database(),'CREATE') THEN RAISE EXCEPTION 'runtime role has database CREATE'; END IF;");
  lines.push("  IF NOT has_schema_privilege(v_oid,'public','USAGE') THEN RAISE EXCEPTION 'runtime role lacks schema USAGE'; END IF;");
  lines.push("  IF has_schema_privilege(v_oid,'public','USAGE WITH GRANT OPTION') THEN RAISE EXCEPTION 'runtime role can grant schema USAGE'; END IF;");
  lines.push("  IF NOT has_database_privilege(v_oid,current_database(),'CONNECT') THEN RAISE EXCEPTION 'runtime role lacks database CONNECT'; END IF;");
  lines.push("  IF has_database_privilege(v_oid,current_database(),'CONNECT WITH GRANT OPTION') THEN RAISE EXCEPTION 'runtime role can grant database CONNECT'; END IF;");
  lines.push("  FOR v_table IN SELECT * FROM dg_runtime_expected_tables LOOP");
  lines.push("    IF to_regclass(format('public.%I', v_table.table_name)) IS NULL THEN RAISE EXCEPTION 'expected table is absent: %', v_table.table_name; END IF;");
  lines.push("    FOREACH v_privilege IN ARRAY v_table.table_privileges LOOP");
  lines.push("      IF NOT has_table_privilege(v_oid, format('public.%I', v_table.table_name), v_privilege) THEN RAISE EXCEPTION 'missing % on %', v_privilege, v_table.table_name; END IF;");
  lines.push("    END LOOP;");
  lines.push("    FOREACH v_privilege IN ARRAY v_all LOOP");
  lines.push("      IF NOT (v_privilege = ANY(v_table.table_privileges)) AND has_table_privilege(v_oid, format('public.%I', v_table.table_name), v_privilege) THEN RAISE EXCEPTION 'unexpected % on %', v_privilege, v_table.table_name; END IF;");
  lines.push("      IF has_table_privilege(v_oid, format('public.%I', v_table.table_name), v_privilege || ' WITH GRANT OPTION') THEN RAISE EXCEPTION 'grant option % on %', v_privilege, v_table.table_name; END IF;");
  lines.push("    END LOOP;");
  lines.push("    FOR v_column IN SELECT attname FROM pg_catalog.pg_attribute WHERE attrelid=format('public.%I', v_table.table_name)::regclass AND attnum>0 AND NOT attisdropped LOOP");
  lines.push("      IF NOT (v_table.column_privileges ? 'UPDATE') THEN CONTINUE; END IF;");
  lines.push("      IF NOT (v_column.attname = ANY(ARRAY(SELECT jsonb_array_elements_text(v_table.column_privileges->'UPDATE')))) AND has_column_privilege(v_oid, format('public.%I', v_table.table_name), v_column.attname, 'UPDATE') THEN RAISE EXCEPTION 'unexpected UPDATE on %.%', v_table.table_name, v_column.attname; END IF;");
  lines.push("    END LOOP;");
  lines.push("    IF v_table.column_privileges ? 'UPDATE' THEN");
  lines.push("      FOR v_privilege IN SELECT jsonb_array_elements_text(v_table.column_privileges->'UPDATE') LOOP");
  lines.push("        IF NOT has_column_privilege(v_oid, format('public.%I', v_table.table_name), v_privilege, 'UPDATE') THEN RAISE EXCEPTION 'missing UPDATE on %.%', v_table.table_name, v_privilege; END IF;");
  lines.push("        IF has_column_privilege(v_oid, format('public.%I', v_table.table_name), v_privilege, 'UPDATE WITH GRANT OPTION') THEN RAISE EXCEPTION 'grant option UPDATE on %.%', v_table.table_name, v_privilege; END IF;");
  lines.push("      END LOOP;");
  lines.push("    END IF;");
  lines.push("  END LOOP;");
  lines.push("  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN");
  lines.push("    FOREACH v_privilege IN ARRAY v_all LOOP");
  lines.push("      IF has_table_privilege(v_oid,'public._prisma_migrations',v_privilege) THEN RAISE EXCEPTION 'runtime has % on _prisma_migrations', v_privilege; END IF;");
  lines.push("    END LOOP;");
  lines.push("  END IF;");
  lines.push("  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','p') AND c.relname<>'_prisma_migrations' AND c.relname NOT IN (SELECT table_name FROM dg_runtime_expected_tables)) THEN RAISE EXCEPTION 'unexpected public table not covered by manifest'; END IF;");
  lines.push("  FOR v_sequence IN SELECT * FROM dg_runtime_expected_sequences LOOP");
  lines.push("    IF to_regclass(format('public.%I', v_sequence.sequence_name)) IS NULL THEN RAISE EXCEPTION 'expected sequence is absent: %', v_sequence.sequence_name; END IF;");
  lines.push("    FOREACH v_privilege IN ARRAY v_sequence.sequence_privileges LOOP");
  lines.push("      IF NOT has_sequence_privilege(v_oid, format('public.%I', v_sequence.sequence_name), v_privilege) THEN RAISE EXCEPTION 'missing % on sequence %', v_privilege, v_sequence.sequence_name; END IF;");
  lines.push("      IF has_sequence_privilege(v_oid, format('public.%I', v_sequence.sequence_name), v_privilege || ' WITH GRANT OPTION') THEN RAISE EXCEPTION 'grant option % on sequence %', v_privilege, v_sequence.sequence_name; END IF;");
  lines.push("    END LOOP;");
  lines.push("    FOREACH v_privilege IN ARRAY ARRAY['USAGE','SELECT','UPDATE'] LOOP");
  lines.push("      IF NOT (v_privilege = ANY(v_sequence.sequence_privileges)) AND has_sequence_privilege(v_oid, format('public.%I', v_sequence.sequence_name), v_privilege) THEN RAISE EXCEPTION 'unexpected % on sequence %', v_privilege, v_sequence.sequence_name; END IF;");
  lines.push("    END LOOP;");
  lines.push("  END LOOP;");
  lines.push("  FOR v_sequence IN SELECT * FROM dg_runtime_denied_sequences LOOP");
  lines.push("    IF to_regclass(format('public.%I', v_sequence.sequence_name)) IS NOT NULL THEN");
  lines.push("      FOREACH v_privilege IN ARRAY ARRAY['USAGE','SELECT','UPDATE'] LOOP");
  lines.push("        IF has_sequence_privilege(v_oid, format('public.%I', v_sequence.sequence_name), v_privilege) THEN RAISE EXCEPTION 'runtime has % on denied sequence %', v_privilege, v_sequence.sequence_name; END IF;");
  lines.push("      END LOOP;");
  lines.push("    END IF;");
  lines.push("  END LOOP;");
  lines.push("  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind='S' AND c.relname NOT IN (SELECT sequence_name FROM dg_runtime_expected_sequences) AND c.relname NOT IN (SELECT sequence_name FROM dg_runtime_denied_sequences)) THEN RAISE EXCEPTION 'unexpected public sequence not covered by manifest'; END IF;");
  lines.push("  IF has_function_privilege(v_oid,'public.audit_platform_checkout_admission()','EXECUTE') THEN RAISE EXCEPTION 'runtime can execute admission audit definer function'; END IF;");
  lines.push("  IF has_function_privilege(v_oid,'public.audit_platform_checkout_admission()','EXECUTE WITH GRANT OPTION') THEN RAISE EXCEPTION 'runtime can grant admission audit execution'; END IF;");
  lines.push("  IF has_function_privilege(v_oid,'public.preserve_checkout_admission_audit()','EXECUTE') THEN RAISE EXCEPTION 'runtime can execute admission audit guard function'; END IF;");
  lines.push("  IF has_function_privilege(v_oid,'public.preserve_checkout_admission_audit()','EXECUTE WITH GRANT OPTION') THEN RAISE EXCEPTION 'runtime can grant admission audit guard execution'; END IF;");
  lines.push("  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.prosecdef AND has_function_privilege(v_oid,p.oid,'EXECUTE')) THEN RAISE EXCEPTION 'runtime can execute a public SECURITY DEFINER function'; END IF;");
  lines.push("END");
  lines.push("$runtime_role_verify$;");
  lines.push("SELECT 'runtime_role_verified' AS result;");
  lines.push("COMMIT;");
  lines.push("");
  return lines.join("\n");
}

export function readManifest(root) {
  return JSON.parse(readFileSync(path.join(root, "scripts/security/runtime-role-manifest.json"), "utf8"));
}

export function manifestStats(manifest) {
  const modules = {};
  for (const entry of Object.values(manifest.tables)) modules[entry.module] = (modules[entry.module] ?? 0) + 1;
  return { tables: Object.keys(manifest.tables).length, modules: Object.keys(modules).length, byModule: modules };
}
