/**
 * DigitalGate visual storytelling styles — shipped with the public website
 * renderer so Neon/Website Studio HTML is not the only carrier of story CSS.
 *
 * Colours use !important where needed to beat the dark html-island type hammer
 * in website-renderer-css.ts (which otherwise flattens .dg-story-label / small).
 */
export const digitalgateVisualStorytellingCss = `
/* —— DigitalGate visual storytelling (#48) —— */
.dg-story-visual {
  position: relative;
  margin: 2.25rem auto;
  padding: 1.5rem 1.35rem 1.35rem;
  max-width: 920px;
  border: 1px solid rgba(96, 165, 250, 0.22);
  border-radius: 20px;
  background:
    radial-gradient(circle at 12% 0, rgba(59, 130, 246, 0.14), transparent 38%),
    radial-gradient(circle at 88% 100%, rgba(124, 58, 237, 0.08), transparent 40%),
    linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(7, 11, 18, 0.96));
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.22);
  overflow: hidden;
}
.dg-story-visual::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.025), transparent 70%);
}
.wb-html-island--page:not(.wb-html-island--light) .dg-story-label,
.dg-story-label {
  display: block !important;
  margin-bottom: 1rem !important;
  color: #93c5fd !important;
  font-size: 0.68rem !important;
  font-weight: 800 !important;
  letter-spacing: 0.12em !important;
  text-transform: uppercase !important;
}
.dg-story-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.7rem;
  align-items: stretch;
}
.dg-story-node {
  position: relative;
  display: flex;
  min-height: 92px;
  flex-direction: column;
  justify-content: center;
  padding: 0.9rem 0.7rem;
  border: 1px solid #243244;
  border-radius: 14px;
  background: rgba(10, 14, 23, 0.78);
  text-align: center;
}
.wb-html-island--page:not(.wb-html-island--light) .dg-story-node strong,
.dg-story-node strong {
  font-family: Sora, Inter, sans-serif !important;
  color: #f8fafc !important;
  font-size: 0.84rem !important;
  font-weight: 700 !important;
}
.wb-html-island--page:not(.wb-html-island--light) .dg-story-node small,
.dg-story-node small {
  margin-top: 0.28rem !important;
  color: #94a3b8 !important;
  font-size: 0.68rem !important;
  line-height: 1.35 !important;
}
.dg-story-node:not(:last-child)::after {
  content: "→";
  position: absolute;
  right: -0.72rem;
  top: 50%;
  z-index: 2;
  transform: translateY(-50%);
  color: #60a5fa;
  font-weight: 800;
}
.dg-story-node.is-live {
  border-color: rgba(96, 165, 250, 0.55);
  box-shadow: inset 0 0 28px rgba(59, 130, 246, 0.08), 0 0 24px rgba(59, 130, 246, 0.06);
}
.dg-story-node.is-positive {
  border-color: rgba(52, 211, 153, 0.45);
}
.dg-story-node.is-attention {
  border-color: rgba(251, 191, 36, 0.4);
}
.dg-story-loop {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.7rem;
}
.dg-story-compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.dg-story-panel {
  padding: 1.2rem;
  border: 1px solid #243244;
  border-radius: 16px;
  background: rgba(10, 14, 23, 0.72);
}
.dg-story-panel.is-dg {
  border-color: rgba(96, 165, 250, 0.45);
  background: linear-gradient(145deg, rgba(30, 64, 175, 0.12), rgba(10, 14, 23, 0.78));
}
.dg-story-panel h3 {
  margin: 0 0 0.7rem !important;
  color: #f8fafc !important;
  font-size: 1rem !important;
}
.dg-story-panel p {
  margin: 0.35rem 0 !important;
  color: #94a3b8 !important;
  font-size: 0.84rem !important;
}
.dg-story-recommendation {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1rem;
  align-items: center;
  padding: 1.1rem;
  border: 1px solid rgba(96, 165, 250, 0.42);
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.13), rgba(15, 23, 42, 0.8));
}
.dg-story-signal {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.16);
  box-shadow: 0 0 28px rgba(59, 130, 246, 0.2);
  color: #93c5fd !important;
  font-weight: 900;
}
.dg-story-recommendation strong {
  display: block;
  color: #f8fafc !important;
  font-family: Sora, Inter, sans-serif;
}
.dg-story-recommendation p {
  margin: 0.2rem 0 0 !important;
  color: #94a3b8 !important;
  font-size: 0.82rem !important;
}
.dg-story-action {
  padding: 0.55rem 0.75rem;
  border: 1px solid rgba(96, 165, 250, 0.35);
  border-radius: 10px;
  color: #bfdbfe !important;
  font-size: 0.72rem;
  font-weight: 800;
  white-space: nowrap;
}
.dg-story-caption {
  margin: 0.9rem 0 0 !important;
  color: #94a3b8 !important;
  font-size: 0.72rem !important;
  text-align: center;
}

/* Architectural living-system map (Part 2) — hub, not anatomy */
.dg-story-os {
  display: grid;
  gap: 1.1rem;
}
.dg-story-os-hub {
  position: relative;
  min-height: 280px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  border: 1px solid rgba(96, 165, 250, 0.18);
  background:
    radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.12), transparent 55%),
    rgba(8, 12, 20, 0.9);
  overflow: hidden;
}
.dg-story-os-hub svg {
  width: min(100%, 520px);
  height: auto;
  display: block;
}
.dg-story-os-legend {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
}
.dg-story-os-legend .dg-story-node {
  min-height: 72px;
}
.dg-story-os-legend .dg-story-node::after {
  display: none;
}
.dg-story-os-center-label {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  text-align: center;
  padding: 1rem;
}
.dg-story-os-center-label strong {
  display: block;
  color: #f8fafc !important;
  font-family: Sora, Inter, sans-serif;
  font-size: 0.95rem;
}
.dg-story-os-center-label small {
  display: block;
  margin-top: 0.25rem;
  color: #93c5fd !important;
  font-size: 0.7rem;
  max-width: 11rem;
  line-height: 1.35;
}

/* Closed intelligence loop (Part 3) */
.dg-story-closed-loop {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 1.1rem;
  align-items: center;
}
.dg-story-closed-loop svg {
  width: 100%;
  height: auto;
  display: block;
}
.dg-story-closed-loop-steps {
  display: grid;
  gap: 0.45rem;
}
.dg-story-closed-loop-steps .dg-story-node {
  min-height: 0;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem;
  text-align: left;
  padding: 0.7rem 0.85rem;
}
.dg-story-closed-loop-steps .dg-story-node::after {
  display: none;
}
.dg-story-step-index {
  display: grid;
  place-items: center;
  width: 1.55rem;
  height: 1.55rem;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.18);
  color: #93c5fd !important;
  font-size: 0.68rem;
  font-weight: 800;
  flex-shrink: 0;
}
.dg-story-closed-loop-steps .dg-story-node > div {
  min-width: 0;
}
.dg-story-closed-loop-steps .dg-story-node strong {
  display: block;
}
.dg-story-closed-loop-steps .dg-story-node small {
  margin-top: 0.1rem !important;
}

/* Flow comparison (Part 4) */
.dg-story-flow-compare {
  display: grid;
  gap: 1rem;
}
.dg-story-flow-row {
  display: grid;
  gap: 0.55rem;
}
.dg-story-flow-row-label {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8 !important;
}
.dg-story-flow-row.is-dg .dg-story-flow-row-label {
  color: #93c5fd !important;
}
.dg-story-flow-track {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.45rem;
}
.dg-story-flow-track.is-traditional {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  max-width: 420px;
}
.dg-story-flow-chip {
  padding: 0.7rem 0.75rem;
  border-radius: 12px;
  border: 1px solid #243244;
  background: rgba(10, 14, 23, 0.78);
  text-align: center;
  position: relative;
}
.dg-story-flow-chip:not(:last-child)::after {
  content: "→";
  position: absolute;
  right: -0.55rem;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  font-weight: 800;
  z-index: 1;
}
.dg-story-flow-row.is-dg .dg-story-flow-chip {
  border-color: rgba(96, 165, 250, 0.35);
  background: linear-gradient(145deg, rgba(30, 64, 175, 0.12), rgba(10, 14, 23, 0.78));
}
.dg-story-flow-row.is-dg .dg-story-flow-chip:not(:last-child)::after {
  color: #60a5fa;
}
.wb-html-island--page:not(.wb-html-island--light) .dg-story-flow-chip strong,
.dg-story-flow-chip strong {
  display: block;
  color: #f8fafc !important;
  font-size: 0.78rem !important;
}
.wb-html-island--page:not(.wb-html-island--light) .dg-story-flow-chip small,
.dg-story-flow-chip small {
  display: block;
  margin-top: 0.2rem !important;
  color: #94a3b8 !important;
  font-size: 0.65rem !important;
  line-height: 1.3 !important;
}

/* Connected knowledge network (Business Brain) */
.dg-story-network {
  display: grid;
  gap: 0.85rem;
}
.dg-story-network-canvas {
  position: relative;
  min-height: 260px;
  border-radius: 18px;
  border: 1px solid rgba(96, 165, 250, 0.18);
  background:
    radial-gradient(circle at 50% 48%, rgba(59, 130, 246, 0.14), transparent 42%),
    rgba(8, 12, 20, 0.92);
  overflow: hidden;
}
.dg-story-network-canvas svg {
  width: 100%;
  height: auto;
  display: block;
}
.dg-story-network-feeds {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
}
.dg-story-network-feeds .dg-story-node {
  min-height: 64px;
  padding: 0.65rem 0.5rem;
}
.dg-story-network-feeds .dg-story-node::after {
  display: none;
}

/* Automation process timeline */
.dg-story-timeline {
  display: grid;
  gap: 0.55rem;
}
.dg-story-timeline-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.85rem;
  align-items: start;
  padding: 0.85rem 0.95rem;
  border-radius: 14px;
  border: 1px solid #243244;
  background: rgba(10, 14, 23, 0.72);
}
.dg-story-timeline-item.is-live {
  border-color: rgba(96, 165, 250, 0.45);
  background: linear-gradient(145deg, rgba(30, 64, 175, 0.1), rgba(10, 14, 23, 0.78));
}
.dg-story-timeline-item.is-outcome {
  border-color: rgba(52, 211, 153, 0.35);
}
.dg-story-timeline-dot {
  width: 0.7rem;
  height: 0.7rem;
  margin-top: 0.35rem;
  border-radius: 999px;
  background: #60a5fa;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
}
.dg-story-timeline-item.is-outcome .dg-story-timeline-dot {
  background: #34d399;
  box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.12);
}
.dg-story-timeline-item strong {
  display: block;
  color: #f8fafc !important;
  font-size: 0.88rem !important;
}
.dg-story-timeline-item p {
  margin: 0.2rem 0 0 !important;
  color: #94a3b8 !important;
  font-size: 0.8rem !important;
}

.dg-story-examples {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
  margin-top: 0.85rem;
}
.dg-story-example {
  padding: 0.85rem;
  border-radius: 14px;
  border: 1px solid #243244;
  background: rgba(10, 14, 23, 0.7);
}
.dg-story-example strong {
  display: block;
  color: #e2e8f0 !important;
  font-size: 0.8rem !important;
  margin-bottom: 0.35rem;
}
.dg-story-example p {
  margin: 0 !important;
  color: #94a3b8 !important;
  font-size: 0.74rem !important;
  line-height: 1.4 !important;
}

@media (max-width: 860px) {
  .dg-story-closed-loop,
  .dg-story-os-legend,
  .dg-story-network-feeds,
  .dg-story-examples {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 760px) {
  .dg-story-grid,
  .dg-story-loop,
  .dg-story-os-legend,
  .dg-story-closed-loop,
  .dg-story-network-feeds,
  .dg-story-examples,
  .dg-story-compare {
    grid-template-columns: 1fr;
  }
  .dg-story-node:not(:last-child)::after {
    content: "↓";
    right: auto;
    top: auto;
    bottom: -0.9rem;
    left: 50%;
    transform: translateX(-50%);
  }
  .dg-story-recommendation {
    grid-template-columns: auto 1fr;
  }
  .dg-story-action {
    grid-column: 1 / -1;
    text-align: center;
  }
  .dg-story-flow-track,
  .dg-story-flow-track.is-traditional {
    grid-template-columns: 1fr;
    max-width: none;
  }
  .dg-story-flow-chip:not(:last-child)::after {
    content: "↓";
    right: auto;
    left: 50%;
    top: auto;
    bottom: -0.75rem;
    transform: translateX(-50%);
  }
  .dg-story-os-hub {
    min-height: 240px;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .dg-story-node.is-live {
    animation: dgStoryPulse 3.4s ease-in-out infinite;
  }
  .dg-story-node.is-live:nth-child(2) { animation-delay: 0.45s; }
  .dg-story-node.is-live:nth-child(3) { animation-delay: 0.9s; }
  .dg-story-node.is-live:nth-child(4) { animation-delay: 1.35s; }
  .dg-story-node.is-live:nth-child(5) { animation-delay: 1.8s; }
  .dg-story-os-hub .dg-story-orbit {
    transform-origin: 160px 140px;
    animation: dgStoryOrbit 18s linear infinite;
  }
  .dg-story-closed-loop .dg-story-loop-path {
    stroke-dasharray: 6 10;
    animation: dgStoryDash 1.8s linear infinite;
  }
  @keyframes dgStoryPulse {
    0%, 70%, 100% {
      box-shadow: inset 0 0 28px rgba(59, 130, 246, 0.06), 0 0 0 rgba(59, 130, 246, 0);
    }
    35% {
      box-shadow: inset 0 0 34px rgba(59, 130, 246, 0.13), 0 0 28px rgba(59, 130, 246, 0.12);
    }
  }
  @keyframes dgStoryOrbit {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes dgStoryDash {
    to { stroke-dashoffset: -32; }
  }
}

/* ===========================================================================
   DigitalGate INSIGHTS — dedicated four-chapter presentation system.
   ONE shell for all four articles, driven only by the frozen --insights-*
   tokens. No per-part selectors, no :has() repair, no per-article margin
   overrides. Website Studio owns the content; this owns the presentation.
   Scoped under .insights-article so it never leaks into other public pages.
   =========================================================================== */
:root {
  --insights-shell-max: 1440px;
  --insights-prose-max: 760px;
  --insights-stage-max: 1100px;
  --insights-gutter-desktop: 48px;
  --insights-gutter-tablet: 32px;
  --insights-gutter-mobile: 20px;
  --insights-hero-top: 40px;
  --insights-hero-bottom: 60px;
  --insights-section-gap: 80px;
  --insights-prose-gap: 32px;
  --insights-gutter: var(--insights-gutter-desktop);
  --insights-surface: #12121f;
  --insights-border: rgba(255, 255, 255, 0.06);
  --insights-purple: #7c3aed;
  --insights-purple-light: #a78bfa;
  --insights-blue: #3b82f6;
  --insights-green: #34d399;
  --insights-amber: #fbbf24;
  --insights-font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  --insights-font-mono: ui-monospace, "SF Mono", "Cascadia Code", "Source Code Pro", monospace;
}

.insights-article {
  display: block;
  width: 100%;
  font-family: var(--insights-font-sans);
  line-height: 1.6;
}
.insights-article *,
.insights-article *::before,
.insights-article *::after { box-sizing: border-box; }

/* Width model: an OUTER gutter shell (max 1440) carries the horizontal gutter;
   INNER blocks carry only their max-width so the real reading measure is a true
   760px and the signature stage is a true 1100px (no gutter double-counting). */
.insights-shell {
  max-width: var(--insights-shell-max);
  margin-left: auto;
  margin-right: auto;
  padding-left: var(--insights-gutter);
  padding-right: var(--insights-gutter);
}
.insights-hero-inner,
.insights-prose,
.insights-series-nav,
.insights-cta {
  max-width: var(--insights-prose-max);
  margin-left: auto;
  margin-right: auto;
}
.insights-figure {
  max-width: var(--insights-stage-max);
  margin-left: auto;
  margin-right: auto;
}

/* —— Hero —— */
.insights-hero {
  position: relative;
  padding: var(--insights-hero-top) 0 var(--insights-hero-bottom);
  background: radial-gradient(ellipse at 50% 30%, rgba(124, 58, 237, 0.06), transparent 70%);
}
.insights-hero-inner { position: relative; z-index: 1; }
.insights-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.insights-badge {
  display: inline-block; padding: 4px 14px; border-radius: 100px;
  background: rgba(124, 58, 237, 0.12); border: 1px solid rgba(124, 58, 237, 0.2);
  color: var(--insights-purple-light) !important;
  font-family: var(--insights-font-sans) !important;
  font-size: 12px !important; font-weight: 600 !important; letter-spacing: 0.05em; text-transform: uppercase;
}
.insights-part { color: #6b7280 !important; font-size: 13px !important; font-weight: 500; letter-spacing: 0.02em; }
.insights-progress { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.insights-progress-track { display: flex; gap: 6px; }
.insights-progress-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.04);
}
.insights-progress-dot.active {
  background: var(--insights-purple); border-color: var(--insights-purple);
  box-shadow: 0 0 16px rgba(124, 58, 237, 0.3);
}
.insights-progress-labels { display: flex; gap: 8px; font-family: var(--insights-font-mono); font-size: 12px; color: #6b7280; }
.insights-progress-labels .active { color: var(--insights-purple-light); font-weight: 600; }
.wb-html-island--page:not(.wb-html-island--light) .insights-title,
.insights-title {
  margin: 0 0 20px !important;
  font-family: var(--insights-font-sans) !important;
  font-size: clamp(40px, 5.5vw, 72px) !important;
  font-weight: 700 !important; line-height: 1.05 !important; letter-spacing: -0.02em !important;
  color: #ffffff !important; max-width: 18ch;
}
.insights-title-accent {
  background: linear-gradient(135deg, var(--insights-purple-light), var(--insights-blue));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent;
}
.wb-html-island--page:not(.wb-html-island--light) .insights-lede,
.insights-lede {
  margin: 0 0 24px !important;
  font-size: clamp(18px, 1.4vw, 22px) !important; line-height: 1.5 !important;
  color: #9ca3af !important; max-width: 600px;
}
.insights-byline { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #6b7280; }
.insights-avatar {
  display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 100px;
  font-family: var(--insights-font-sans); font-weight: 800; font-size: 11px; color: #ede9fe;
  background: linear-gradient(135deg, var(--insights-purple), var(--insights-blue));
}
.insights-author { font-weight: 500; color: #9ca3af; }
.insights-divider { color: #6b7280; opacity: 0.4; }

/* —— Body: deliberate editorial rhythm with generous negative space —— */
.insights-body { padding: 40px 0 var(--insights-section-gap); }
.insights-body .insights-shell > * { margin-top: var(--insights-section-gap); }
.insights-body .insights-shell > *:first-child { margin-top: 0; }
.insights-section { margin: 0; }
.insights-prose { display: flex; flex-direction: column; gap: var(--insights-prose-gap); }
.wb-html-island--page:not(.wb-html-island--light) .insights-prose h2,
.insights-prose h2 {
  margin: 8px 0 0 !important; font-family: var(--insights-font-sans) !important;
  font-size: clamp(28px, 2.8vw, 40px) !important; font-weight: 700 !important;
  line-height: 1.15 !important; letter-spacing: -0.01em !important; color: #ffffff !important;
}
.wb-html-island--page:not(.wb-html-island--light) .insights-prose h3,
.insights-prose h3 {
  margin: 4px 0 0 !important; font-family: var(--insights-font-sans) !important;
  font-size: clamp(20px, 1.6vw, 26px) !important; font-weight: 600 !important;
  line-height: 1.25 !important; color: #ffffff !important;
}
.wb-html-island--page:not(.wb-html-island--light) .insights-prose p,
.insights-prose p { margin: 0 !important; font-size: 18px !important; line-height: 1.7 !important; color: #9ca3af !important; }
.insights-prose p + p { margin-top: 16px !important; }
.insights-prose strong { color: #ffffff !important; font-weight: 600; }
.wb-html-island--page:not(.wb-html-island--light) .insights-prose a,
.insights-prose a { color: #93c5fd !important; text-decoration: none; }
.insights-prose a:hover { color: #c7d2fe !important; }
/* Website Studio content sits at the reading measure; drop inherited chrome. */
.insights-prose section { padding: 0 !important; border: 0 !important; background: none !important; margin: 0 !important; }
.insights-prose .container,
.insights-prose .container-wide,
.insights-prose .wide,
.insights-prose .prose { max-width: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
.insights-prose ul,
.insights-prose ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.insights-prose li { position: relative; padding-left: 22px; color: #9ca3af; font-size: 17px; line-height: 1.65; }
.insights-prose li::before { content: ""; position: absolute; left: 0; top: 11px; width: 6px; height: 6px; border-radius: 50%; background: var(--insights-blue); }
.insights-prose li em { color: #bfdbfe; font-style: normal; font-weight: 600; }

/* Pull-quote — an editorial moment, not a card. */
.insights-pullquote { margin: 8px 0; padding: 4px 0 4px 24px; border-left: 2px solid rgba(124, 58, 237, 0.5); }
.wb-html-island--page:not(.wb-html-island--light) .insights-pullquote p,
.insights-pullquote p {
  margin: 0 !important; font-size: clamp(20px, 2vw, 26px) !important; line-height: 1.4 !important;
  font-weight: 500; color: #e2e8f0 !important; letter-spacing: -0.01em;
}

/* Canonical definitions — editorial <dl>, not tiles. */
.insights-definitions-section .insights-prose { gap: 0; }
.insights-definitions { display: grid; gap: 0; margin: 0; padding: 8px 0 0; }
.insights-definitions > div { display: grid; grid-template-columns: minmax(140px, 200px) 1fr; gap: 8px 32px; padding: 20px 0; border-top: 1px solid var(--insights-border); }
.insights-definitions > div:last-child { border-bottom: 1px solid var(--insights-border); }
.wb-html-island--page:not(.wb-html-island--light) .insights-definitions dt,
.insights-definitions dt { font-family: var(--insights-font-sans); font-size: 18px !important; font-weight: 700; color: #ffffff !important; }
.wb-html-island--page:not(.wb-html-island--light) .insights-definitions dd,
.insights-definitions dd { margin: 0 !important; font-size: 17px !important; line-height: 1.6; color: #9ca3af !important; }

/* —— Supporting transformation rail: responsive, legible, one visual family —— */
.insights-figure-rail .insights-rail {
  list-style: none; margin: 0; padding: 28px 8px; display: flex; align-items: flex-start; gap: 0;
  background: var(--insights-surface); border: 1px solid var(--insights-border); border-radius: 16px;
}
.insights-rail-step { position: relative; flex: 1 1 0; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 0 6px; text-align: center; }
.insights-rail-step::before { display: none; }
.insights-rail-line { position: absolute; top: 8px; left: -50%; width: 100%; height: 1px; background: rgba(148, 163, 184, 0.22); z-index: 0; }
.insights-rail-node { position: relative; z-index: 1; width: 16px; height: 16px; border-radius: 50%; background: #0f0f1a; border: 2px solid #64748b; box-shadow: 0 0 0 4px rgba(15, 15, 26, 1); }
.insights-rail-text { display: flex; flex-direction: column; gap: 3px; }
.wb-html-island--page:not(.wb-html-island--light) .insights-rail-label,
.insights-rail-label { font-family: var(--insights-font-sans); font-size: 14px !important; font-weight: 700; color: #e2e8f0 !important; letter-spacing: -0.01em; }
.wb-html-island--page:not(.wb-html-island--light) .insights-rail-sub,
.insights-rail-sub { font-family: var(--insights-font-mono); font-size: 11px !important; line-height: 1.4; color: #6b7280 !important; }
.insights-rail-step.is-muted .insights-rail-node { border-color: #475569; }
.insights-rail-step.is-cyan .insights-rail-node { border-color: #22d3ee; box-shadow: 0 0 0 4px rgba(15, 15, 26, 1), 0 0 12px rgba(34, 211, 238, 0.35); }
.insights-rail-step.is-purple .insights-rail-node { border-color: var(--insights-purple); box-shadow: 0 0 0 4px rgba(15, 15, 26, 1), 0 0 12px rgba(124, 58, 237, 0.35); }
.insights-rail-step.is-violet .insights-rail-node { border-color: var(--insights-purple-light); box-shadow: 0 0 0 4px rgba(15, 15, 26, 1), 0 0 12px rgba(167, 139, 250, 0.35); }
.insights-rail-step.is-blue .insights-rail-node { border-color: var(--insights-blue); box-shadow: 0 0 0 4px rgba(15, 15, 26, 1), 0 0 12px rgba(59, 130, 246, 0.35); }
.insights-rail-step.is-amber .insights-rail-node { border-color: var(--insights-amber); box-shadow: 0 0 0 4px rgba(15, 15, 26, 1), 0 0 12px rgba(251, 191, 36, 0.4); }
.insights-rail-step.is-amber .insights-rail-label { color: var(--insights-amber) !important; }
.insights-rail-step.is-green .insights-rail-node { border-color: var(--insights-green); box-shadow: 0 0 0 4px rgba(15, 15, 26, 1), 0 0 12px rgba(52, 211, 153, 0.35); }
.insights-rail-step.is-green .insights-rail-label { color: #6ee7b7 !important; }

/* —— Figures —— */
.insights-figure { margin: 0 auto; }
.insights-diagram {
  width: 100%; background: var(--insights-surface); border: 1px solid var(--insights-border);
  border-radius: 16px; overflow: hidden;
}
.insights-diagram svg { display: block; width: 100%; height: auto; }
.wb-html-island--page:not(.wb-html-island--light) .insights-figcaption,
.insights-figcaption {
  margin: 16px auto 0 !important; max-width: 620px; text-align: center;
  font-size: 15px !important; color: #6b7280 !important; line-height: 1.5 !important;
}

/* —— Footer: series navigation + CTA —— */
.insights-footer { padding: 0 0 40px; }
.insights-series-nav { padding-top: 8px; }
.insights-series-nav-eyebrow {
  margin: 0 0 16px !important; font-family: var(--insights-font-sans) !important;
  font-size: 12px !important; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #6b7280 !important;
}
.insights-series-nav-list {
  list-style: none; margin: 0 0 24px !important; padding: 24px 0 !important;
  border-top: 1px solid var(--insights-border); border-bottom: 1px solid var(--insights-border);
  display: flex; flex-direction: column; gap: 8px;
}
.insights-series-nav-item { margin: 0; padding: 0; }
.insights-series-nav-item::before { display: none !important; }
.insights-series-nav-item a,
.insights-series-nav-item.active { display: flex; align-items: center; gap: 16px; padding: 8px 12px; border-radius: 8px; text-decoration: none; }
.insights-series-nav-item a:hover { background: rgba(255, 255, 255, 0.03); }
.insights-series-nav-item.active { background: rgba(124, 58, 237, 0.06); }
.insights-series-nav-num { min-width: 28px; font-family: var(--insights-font-mono); font-size: 13px; font-weight: 600; color: #6b7280; }
.insights-series-nav-item.active .insights-series-nav-num { color: var(--insights-purple-light); }
.wb-html-island--page:not(.wb-html-island--light) .insights-series-nav-label,
.insights-series-nav-label { font-size: 15px !important; color: #9ca3af !important; }
.insights-series-nav-item.active .insights-series-nav-label { color: #ffffff !important; font-weight: 500; }
.insights-series-nav-links {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  margin-bottom: 32px; padding-bottom: 32px; border-bottom: 1px solid var(--insights-border);
}
.insights-series-nav-links a { color: #9ca3af !important; text-decoration: none; font-size: 14px; font-weight: 500; }
.insights-series-nav-links a:hover { color: #ffffff !important; }
.insights-current { color: #ffffff; font-weight: 600; font-size: 14px; }
.insights-complete { color: var(--insights-green) !important; font-weight: 600; font-size: 14px; letter-spacing: 0.02em; }
.insights-cta { text-align: center; padding-top: 8px; }
.insights-cta p { margin: 0 0 20px !important; font-size: 18px !important; color: #9ca3af !important; }
.insights-cta-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px; }
.insights-btn-primary {
  display: inline-block; padding: 10px 22px; border-radius: 8px; text-decoration: none;
  font-weight: 600; font-size: 14px; color: #ffffff !important; background: var(--insights-purple);
  transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}
.insights-btn-primary:hover { background: #6d28d9; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(124, 58, 237, 0.3); }
.insights-btn-secondary {
  display: inline-block; padding: 10px 22px; border-radius: 8px; text-decoration: none;
  font-weight: 500; font-size: 14px; color: #9ca3af !important; border: 1px solid var(--insights-border);
  transition: border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
.insights-btn-secondary:hover { border-color: var(--insights-purple); color: #ffffff !important; transform: translateY(-1px); }

/* —— Responsive: one shared responsive system (no per-part fixes) —— */
@media (max-width: 1024px) {
  .insights-article { --insights-gutter: var(--insights-gutter-tablet); }
  .insights-title { font-size: clamp(36px, 5vw, 48px) !important; }
  .insights-prose p { font-size: 17px !important; }
}
@media (max-width: 768px) {
  .insights-article { --insights-gutter: var(--insights-gutter-mobile); }
  .insights-hero { padding: 24px 0 40px; }
  .insights-body { padding: 32px 0 40px; }
  .insights-body .insights-shell > * { margin-top: 56px; }
  .insights-body .insights-shell > *:first-child { margin-top: 0; }
  .insights-title { font-size: clamp(30px, 8vw, 40px) !important; }
  .insights-lede { font-size: 17px !important; }
  .insights-prose h2 { font-size: 26px !important; }
  .insights-prose h3 { font-size: 20px !important; }
  .insights-prose p { font-size: 16px !important; }
  .insights-diagram { border-radius: 12px; }
  .insights-figcaption { font-size: 13px !important; }
  .insights-series-nav-links { flex-wrap: wrap; justify-content: center; gap: 12px; }
  .insights-progress-dot { width: 8px; height: 8px; }
  /* Rail recomposes to a legible vertical spine (labels stay full size). */
  .insights-figure-rail .insights-rail { flex-direction: column; align-items: flex-start; gap: 20px; padding: 24px 22px; }
  .insights-rail-step { flex-direction: row; align-items: center; gap: 14px; text-align: left; padding: 0; width: 100%; }
  .insights-rail-line { top: 50%; left: 7px; width: 1px; height: 20px; transform: translateY(-100%); }
  .insights-rail-step:first-child .insights-rail-line { display: none; }
  .insights-definitions > div { grid-template-columns: 1fr; gap: 4px; padding: 16px 0; }
}
@media (max-width: 390px) {
  .insights-title { font-size: 30px !important; }
  .insights-lede { font-size: 16px !important; }
  .insights-prose p { font-size: 15px !important; }
  .insights-cta-actions { flex-direction: column; width: 100%; }
  .insights-cta-actions a { width: 100%; text-align: center; }
}
@media (max-width: 360px) {
  .insights-title { font-size: 28px !important; }
}

/* —— Reduced motion: static-first; the diagrams are SMIL-free already —— */
@media (prefers-reduced-motion: reduce) {
  .insights-btn-primary, .insights-btn-secondary { transition: none; }
  .insights-btn-primary:hover, .insights-btn-secondary:hover { transform: none; box-shadow: none; }
}
`;
