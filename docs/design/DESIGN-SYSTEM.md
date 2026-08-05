# Design System

**Single source of truth for Platform UI**

Package: `@dg/ui` → `packages/ui/`

---

## Principles

1. **Apps do not build one-off UI** when a shared component exists  
2. **Mobile-ready** — responsive, touch-friendly targets  
3. **Dark-first** — matches DigitalGate brand (slate + blue)  
4. **Accessible** — semantic HTML, contrast WCAG AA minimum  

---

## Tokens

Defined in `packages/ui/src/tokens.ts`:

- **Brand:** blue `#3b82f6`, navy `#0a0e17`  
- **Surfaces:** base, raised, card, borders  
- **Text:** primary, secondary, muted  
- **Status:** success, warning, danger, info  

Import: `import { tokens } from "@dg/ui"`

---

## Components (scaffold)

| Component | Status |
|-----------|--------|
| Button (primary, secondary, ghost) | ✅ |
| Card, CardTitle, CardDescription | ✅ |
| Form inputs | Planned |
| Data tables | Planned |
| Charts | Planned |
| Icons | Planned |

Legacy app classes (`dg-card`, `dg-input` in `globals.css`) migrate to `@dg/ui` over time.

---

## Usage

```tsx
import { Button, Card, CardTitle } from "@dg/ui";

<Card>
  <CardTitle>Overview</CardTitle>
  <Button variant="primary">Action</Button>
</Card>
```

---

## Figma / brand

Brand assets stored in **Asset Library** (Platform Core) — logos, colours, fonts per org.

Global DigitalGate marketing brand remains on digitalgate.com.au; tenant brand kits are per-Organisation.

---

## Related

- [PLATFORM-PRINCIPLES.md](../PLATFORM-PRINCIPLES.md) — Mobile Ready  
- [PRODUCT-VISION.md](../PRODUCT-VISION.md) — Gateway aesthetic  
