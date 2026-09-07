# DigitalGate marketing visual assets

DigitalGate's visual storytelling rollout uses lightweight, accessible HTML/CSS primitives inside the native Website Studio content path. This preserves the established dark identity, avoids unnecessary media dependencies and lets motion respect `prefers-reduced-motion`.

## Runtime source of truth

Public rendering owns the visual layer:

- `src/lib/digitalgate-visual-storytelling.ts` — HTML primitives + idempotent enhance
- `src/components/websites/digitalgate-visual-storytelling-css.ts` — styles shipped with `websiteRendererCss`
- `WebsiteRenderer` calls `enhanceDigitalgateVisualHtml(html, pageSlug)` on HTML components

Optional Neon persistence remains available via `scripts/apply-digitalgate-insights-visual-storytelling.mjs`, but is **not required** for public visibility.

## First rollout — foundational Insights + Brain + Automation

### Part 1 — Connected Business
- Connect → Understand → Advise → Act → Learn intelligence rail

### Part 2 — Business Operating System
- Architectural hub map (Business Brain at centre) with Operations / Signals / Memory / Intelligence / Action / Learning
- Not cartoon anatomy

### Part 3 — Intelligence Loop
- Closed Signal → Insight → Advise → Action → Outcome → Learn diagram
- Intelligence rail retained as secondary scannable path

### Part 4 — Proactive Business Software
- Traditional: human asks → software responds
- DigitalGate: business signals → understands → recommends/acts → learns
- Recommendation card example

### Business Brain
- Connected knowledge network feeding a governed context layer

### Automation
- Trigger → context → decision → action → outcome timeline with SME examples

## Illustration direction

Final illustrations must use the current DigitalGate dark palette and be optimised for web delivery. Prefer renderer-owned SVG/HTML primitives over heavy image assets.
