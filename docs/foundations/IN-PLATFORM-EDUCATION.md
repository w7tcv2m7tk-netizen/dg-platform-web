# In-Platform Education

**The platform should teach itself — users shouldn't leave to learn**

Education is a Core capability, not a marketing website afterthought.

---

## Education layers

| Layer | Purpose | Example |
|-------|---------|---------|
| **Checklists** | Guided setup | Onboarding steps on dashboard |
| **Tooltips** | Contextual help | "What is AI Visibility Score?" |
| **Guided tours** | First-run walkthrough | CRM contacts tour |
| **Help articles** | Deep reference | Searchable in-app help centre |
| **AI explanations** | Plain-language | "Why did my score drop?" |
| **Video walkthroughs** | Complex workflows | RE vendor pipeline setup |

---

## Architecture

```
Education Service (Platform Core)
  ├── Content registry (articles, tours, tooltips by feature ID)
  ├── Progress tracking (per user per org)
  ├── Context rules (show tooltip when feature first seen)
  └── AI explainer (uses Twin + score history)
```

Content keyed to **Feature Registry IDs** — e.g. tooltip on `crm.contacts.write` form.

---

## Content model

```typescript
EducationContent {
  id
  type: "tooltip" | "tour" | "article" | "video" | "checklist"
  featureId?         // links to Feature Registry
  appId?
  locale             // en-AU first
  title
  body               // markdown or video URL
  displayRules       // first_visit | always | until_complete
  order
}
```

```typescript
UserEducationProgress {
  userId
  organisationId
  contentId
  status: "not_started" | "in_progress" | "completed" | "dismissed"
  completedAt?
}
```

---

## AI explanations

When user asks "Why?" on a score or recommendation:

1. AI Service receives org-scoped Twin + score breakdown  
2. Returns plain-language explanation + link to relevant help article  
3. Logged per [AI-GOVERNANCE.md](./AI-GOVERNANCE.md)  

Not generic LLM fluff — grounded in their data.

---

## Phase plan

| Phase | Deliverable |
|-------|-------------|
| **1.0** | Onboarding checklist (existing pattern) |
| **1.5** | Tooltips on dashboard scores; 5 help articles |
| **2.0** | Guided tours (CRM, RE); AI explainer |
| **3.0** | App publishers can attach education content to manifests |

---

## Rules

1. Help content versioned with Platform Release  
2. No external redirect for core tasks — embed or slide-over panel  
3. Respect `locale` — [GLOBAL-READINESS.md](./GLOBAL-READINESS.md)  
4. Dismissed tours don't reappear unless content updated  

---

## Related

- [CUSTOMER-SUCCESS.md](./CUSTOMER-SUCCESS.md) — suggested training triggers  
- [design/DESIGN-SYSTEM.md](../design/DESIGN-SYSTEM.md) — help panel component (planned)  
