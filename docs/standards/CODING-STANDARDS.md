# Coding Standards

**How we implement the architecture**

Architect defines **what & why**. Developers define **how** — within these guardrails.

---

## Repository layout

```
packages/platform-core/   # Domain types, registries — no React
packages/database/        # Prisma only
packages/ui/              # Design system — no business logic
src/                      # Next.js app — thin routes, calls Core
docs/                     # Architecture IP — update with code
```

---

## TypeScript

- Strict mode enabled  
- No `any` without comment  
- Shared types live in `platform-core`, not duplicated in `src/`  

---

## Naming

| Item | Convention |
|------|------------|
| App IDs | kebab-case (`real-estate`) |
| Feature IDs | dot notation (`crm.contacts.read`) |
| Events | dot notation (`contact.created`) |
| React components | PascalCase |
| Files | kebab-case or match export |

---

## UI

- Use `@dg/ui` components and tokens  
- Do not add one-off button/card styles in Apps  
- Mobile-responsive by default  

---

## API routes

- Validate input at boundary  
- Call service layer — no Prisma in page components  
- Return consistent error shape (see [API-STANDARDS.md](./API-STANDARDS.md))  

---

## Git

- Conventional commits preferred  
- Architecture changes → update docs + ADR in same PR  
- Do not commit `.env.local`  

---

## Gen 1 (WordPress)

- Bug fixes and connector endpoints only  
- No new modules without ADR  
- Match existing PHP conventions in `dg-platform/`  

---

## Testing (as we scale)

- Unit: Core services, Feature Registry, event handlers  
- Integration: API routes with tenant isolation  
- E2E: Critical paths (signup → dashboard → CRM)  
