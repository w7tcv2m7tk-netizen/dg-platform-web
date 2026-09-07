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
   DigitalGate visual STAGES (#48) — substantial article-expanded scenes.
   Reusable across Insights Parts 1–4 (and later Business Brain / Automation).
   =========================================================================== */
.dg-stage-suite {
  display: grid;
  gap: 2rem;
  margin: 2.75rem 0;
}
.dg-stage {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding: clamp(1.5rem, 3vw, 2.75rem);
  min-height: clamp(380px, 46vw, 560px);
  display: grid;
  align-content: start;
  gap: 1.4rem;
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 26px;
  background:
    radial-gradient(120% 90% at 8% 0%, rgba(59, 130, 246, 0.16), transparent 46%),
    radial-gradient(120% 120% at 100% 100%, rgba(124, 58, 237, 0.12), transparent 48%),
    linear-gradient(160deg, rgba(16, 24, 40, 0.98), rgba(6, 10, 18, 0.99));
  box-shadow: 0 40px 120px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
.dg-stage::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(120% 80% at 50% 0%, #000 30%, transparent 78%);
}
.dg-stage--chaos { border-color: rgba(248, 113, 113, 0.24); }
.dg-stage--os,
.dg-stage--loop { min-height: clamp(440px, 52vw, 620px); }
.dg-stage__intro { display: grid; gap: 0.45rem; max-width: 46rem; }
.dg-stage__index {
  font-family: Sora, Inter, sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.28em;
  color: rgba(96, 165, 250, 0.7) !important;
}
.wb-html-island--page:not(.wb-html-island--light) .dg-stage__eyebrow,
.dg-stage__eyebrow {
  display: block !important;
  font-size: 0.7rem !important;
  font-weight: 800 !important;
  letter-spacing: 0.14em !important;
  text-transform: uppercase !important;
  color: #93c5fd !important;
}
.wb-html-island--page:not(.wb-html-island--light) .dg-stage__title,
.dg-stage__title {
  margin: 0.1rem 0 0 !important;
  font-family: Sora, Inter, sans-serif !important;
  font-size: clamp(1.35rem, 2.4vw, 2rem) !important;
  font-weight: 800 !important;
  line-height: 1.12 !important;
  color: #f8fafc !important;
  letter-spacing: -0.01em;
}
.wb-html-island--page:not(.wb-html-island--light) .dg-stage__lede,
.dg-stage__lede {
  margin: 0 !important;
  font-size: clamp(0.92rem, 1.25vw, 1.05rem) !important;
  line-height: 1.55 !important;
  color: #cbd5e1 !important;
}
.wb-html-island--page:not(.wb-html-island--light) .dg-stage__caption,
.dg-stage__caption {
  margin: 0 !important;
  padding-top: 0.4rem;
  font-size: 0.78rem !important;
  line-height: 1.5 !important;
  color: #94a3b8 !important;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}
.dg-stage__scene { position: relative; }

/* Reusable Business Brain™ object */
.dg-brain { display: inline-grid; place-items: center; }
.dg-brain__glyph { width: clamp(48px, 8vw, 88px); height: auto; display: block; }
.dg-stage .dg-brain__glyph { filter: drop-shadow(0 6px 22px rgba(59, 130, 246, 0.35)); }

/* Reusable node */
.dg-node {
  display: grid;
  gap: 0.2rem;
  padding: 0.85rem 0.9rem;
  border: 1px solid rgba(36, 50, 68, 0.9);
  border-radius: 14px;
  background: rgba(9, 13, 22, 0.72);
}
.wb-html-island--page:not(.wb-html-island--light) .dg-node strong,
.dg-node strong { color: #f1f5f9 !important; font-size: 0.82rem !important; font-weight: 700 !important; font-family: Sora, Inter, sans-serif !important; }
.wb-html-island--page:not(.wb-html-island--light) .dg-node small,
.dg-node small { color: #94a3b8 !important; font-size: 0.7rem !important; line-height: 1.35 !important; }
.dg-node.is-signal { border-color: rgba(56, 189, 248, 0.45); }
.dg-node.is-live { border-color: rgba(96, 165, 250, 0.55); box-shadow: inset 0 0 30px rgba(59, 130, 246, 0.1); }
.dg-node.is-positive { border-color: rgba(52, 211, 153, 0.45); }
.dg-node.is-attention { border-color: rgba(251, 191, 36, 0.42); }
.dg-node.is-guard { border-color: rgba(167, 139, 250, 0.45); }

/* —— Part 1 · Scene 1: fragmented (owner at the centre of chaos) —— */
.dg-scatter { position: relative; min-height: clamp(300px, 40vw, 460px); }
.dg-scatter__field { position: absolute; inset: 0; }
.dg-scatter__chip {
  position: absolute;
  display: grid;
  gap: 0.1rem;
  padding: 0.55rem 0.7rem;
  border: 1px solid rgba(248, 113, 113, 0.28);
  border-radius: 12px;
  background: rgba(12, 16, 26, 0.82);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
}
.dg-scatter__chip strong { color: #fecaca !important; font-size: 0.76rem !important; font-weight: 700 !important; }
.dg-scatter__chip small { color: #94a3b8 !important; font-size: 0.62rem !important; }
.dg-scatter__chip--p1 { top: 2%; left: 4%; }
.dg-scatter__chip--p2 { top: 6%; right: 6%; }
.dg-scatter__chip--p3 { top: 28%; left: 0%; }
.dg-scatter__chip--p4 { top: 26%; right: 2%; }
.dg-scatter__chip--p5 { bottom: 30%; left: 3%; }
.dg-scatter__chip--p6 { bottom: 24%; right: 4%; }
.dg-scatter__chip--p7 { top: 46%; left: 16%; }
.dg-scatter__chip--p8 { top: 44%; right: 18%; }
.dg-scatter__chip--p9 { bottom: 4%; left: 22%; }
.dg-scatter__chip--p10 { bottom: 2%; right: 24%; }
.dg-scatter__owner {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  display: grid; place-items: center; gap: 0.25rem;
  width: clamp(120px, 22vw, 168px); height: clamp(120px, 22vw, 168px);
  border-radius: 50%;
  border: 1px solid rgba(248, 113, 113, 0.5);
  background: radial-gradient(circle, rgba(127, 29, 29, 0.35), rgba(9, 13, 22, 0.92));
  text-align: center;
}
.dg-scatter__owner-glyph svg { width: clamp(36px, 7vw, 52px); height: auto; }
.dg-scatter__owner strong { color: #fee2e2 !important; font-size: 0.86rem !important; }
.dg-scatter__owner small { color: #fca5a5 !important; font-size: 0.64rem !important; }

/* —— Part 1 · Scene 2: convergence —— */
.dg-converge {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  align-items: center;
  gap: 1rem;
  min-height: clamp(220px, 30vw, 320px);
}
.dg-converge__sources { display: grid; gap: 0.5rem; z-index: 2; }
.dg-converge__src {
  padding: 0.5rem 0.7rem;
  border: 1px solid rgba(51, 65, 85, 0.9);
  border-radius: 10px;
  background: rgba(9, 13, 22, 0.85);
  color: #cbd5e1 !important;
  font-size: 0.74rem; font-weight: 700;
}
.dg-converge__paths { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; }
.dg-converge__hub {
  position: relative; z-index: 2;
  display: grid; place-items: center; gap: 0.3rem;
  padding: 1.4rem;
  border: 1px solid rgba(96, 165, 250, 0.5);
  border-radius: 20px;
  background: linear-gradient(150deg, rgba(30, 64, 175, 0.24), rgba(9, 13, 22, 0.9));
  text-align: center;
}
.dg-converge__hub strong { color: #f8fafc !important; font-size: 1rem !important; font-family: Sora, Inter, sans-serif !important; }
.dg-converge__hub small { color: #93c5fd !important; font-size: 0.72rem !important; }

/* —— Part 1 · Scene 3: intelligence stack —— */
.dg-stack { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 1.25rem; align-items: center; }
.dg-stack__col { display: grid; gap: 0.35rem; justify-items: stretch; }
.dg-stack__layer {
  display: grid; gap: 0.15rem;
  padding: 0.95rem 1.1rem;
  border: 1px solid rgba(51, 65, 85, 0.95);
  border-radius: 14px;
  background: rgba(9, 13, 22, 0.8);
}
.dg-stack__layer--brain { grid-template-columns: auto 1fr; align-items: center; gap: 0.5rem 0.9rem; border-color: rgba(96, 165, 250, 0.55); background: linear-gradient(150deg, rgba(30, 64, 175, 0.2), rgba(9, 13, 22, 0.85)); }
.dg-stack__layer--brain .dg-stack__k, .dg-stack__layer--brain .dg-stack__v { grid-column: 2; }
.dg-stack__layer--brain .dg-brain { grid-row: span 2; }
.dg-stack__layer--act { border-color: rgba(52, 211, 153, 0.4); }
.dg-stack__k { color: #f8fafc !important; font-weight: 800; font-size: 0.9rem; font-family: Sora, Inter, sans-serif; }
.dg-stack__v { color: #94a3b8 !important; font-size: 0.74rem; }
.dg-stack__down { justify-self: center; width: 2px; height: 0.85rem; background: linear-gradient(#60a5fa, transparent); position: relative; }
.dg-stack__down::after { content: "▾"; position: absolute; left: 50%; bottom: -0.35rem; transform: translateX(-50%); color: #60a5fa; font-size: 0.6rem; }
.dg-stack__context { display: grid; gap: 0.4rem; align-content: center; }
.dg-stack__ctx {
  padding: 0.45rem 0.7rem;
  border: 1px dashed rgba(96, 165, 250, 0.3);
  border-radius: 999px;
  color: #93c5fd !important;
  font-size: 0.68rem; font-weight: 700; text-align: center;
}

/* —— Part 1 · Scene 4 + shared orbit (operating system) —— */
.dg-orbit { position: relative; display: grid; gap: 1.25rem; place-items: center; }
.dg-orbit__core { display: grid; place-items: center; gap: 0.3rem; text-align: center; z-index: 2; }
.dg-orbit__core strong { color: #f8fafc !important; font-size: 0.92rem !important; font-family: Sora, Inter, sans-serif !important; }
.dg-orbit__ring { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0.6rem; width: 100%; }
.dg-orbit__sat { display: grid; gap: 0.15rem; padding: 0.8rem 0.7rem; border: 1px solid rgba(51, 65, 85, 0.9); border-radius: 14px; background: rgba(9, 13, 22, 0.78); text-align: center; }
.dg-orbit__sat strong { color: #e2e8f0 !important; font-size: 0.78rem !important; font-family: Sora, Inter, sans-serif !important; }
.dg-orbit__sat small { color: #94a3b8 !important; font-size: 0.66rem !important; }
.dg-orbit__sat--learn { border-color: rgba(52, 211, 153, 0.4); }
.dg-orbit__movement { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; margin: 0 !important; }
.dg-orbit__movement span { position: relative; padding: 0.3rem 0.7rem; border-radius: 999px; background: rgba(30, 64, 175, 0.16); color: #bfdbfe !important; font-size: 0.68rem; font-weight: 800; }
.dg-orbit__movement span:not(:last-child)::after { content: "→"; margin-left: 0.55rem; color: #60a5fa; }

/* —— Part 2 · living-system architecture map —— */
.dg-anatomy { display: grid; grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr); gap: 1.5rem; align-items: center; }
.dg-anatomy__diagram { position: relative; display: grid; place-items: center; min-height: clamp(240px, 34vw, 360px); }
.dg-anatomy__ring { position: absolute; border-radius: 50%; border: 1px solid rgba(96, 165, 250, 0.22); }
.dg-anatomy__ring--2 { width: 62%; height: 62%; border-style: dashed; border-color: rgba(96, 165, 250, 0.3); }
.dg-anatomy__ring--3 { width: 96%; height: 96%; }
.dg-anatomy__core { position: relative; display: grid; place-items: center; gap: 0.3rem; padding: 1.1rem; border-radius: 50%; z-index: 2; text-align: center; }
.dg-anatomy__core strong { color: #f8fafc !important; font-size: 0.82rem !important; font-family: Sora, Inter, sans-serif !important; }
.dg-anatomy__legend { display: grid; gap: 0.5rem; }
.dg-anatomy__ring-label { margin: 0.3rem 0 0.1rem !important; color: #93c5fd !important; font-size: 0.66rem !important; font-weight: 800 !important; letter-spacing: 0.1em; text-transform: uppercase; }
.dg-anatomy__group { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.45rem; }
.dg-anatomy__group.is-inner { grid-template-columns: 1fr; }
.dg-anatomy__node { display: grid; gap: 0.1rem; padding: 0.6rem 0.75rem; border: 1px solid rgba(36, 50, 68, 0.9); border-radius: 12px; background: rgba(9, 13, 22, 0.7); }
.dg-anatomy__node strong { color: #e2e8f0 !important; font-size: 0.76rem !important; font-family: Sora, Inter, sans-serif !important; }
.dg-anatomy__node small { color: #94a3b8 !important; font-size: 0.66rem !important; }
.dg-anatomy__node.is-brain { border-color: rgba(96, 165, 250, 0.55); background: linear-gradient(150deg, rgba(30, 64, 175, 0.18), rgba(9, 13, 22, 0.8)); }
.dg-anatomy__node.is-guard { border-color: rgba(167, 139, 250, 0.42); }
.dg-anatomy__node.is-learn { border-color: rgba(52, 211, 153, 0.4); }

.dg-path { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0.55rem; }
.dg-path .dg-node { position: relative; text-align: center; }
.dg-path .dg-node:not(:last-child)::after { content: "→"; position: absolute; right: -0.55rem; top: 50%; transform: translateY(-50%); color: #60a5fa; font-weight: 800; z-index: 2; }

/* —— Part 3 · dominant loop —— */
.dg-loop { position: relative; min-height: clamp(340px, 44vw, 520px); display: grid; place-items: center; }
.dg-loop__ring { position: absolute; inset: 0; margin: auto; width: min(100%, 520px); height: auto; }
.dg-loop__center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: grid; place-items: center; gap: 0.25rem; text-align: center; z-index: 2; }
.dg-loop__center strong { color: #f8fafc !important; font-size: 0.82rem !important; font-family: Sora, Inter, sans-serif !important; }
.dg-loop__stops { list-style: none; margin: 0; padding: 0; position: relative; width: min(100%, 540px); aspect-ratio: 1 / 1; }
.dg-loop__stop { position: absolute; width: clamp(112px, 20vw, 150px); display: grid; gap: 0.05rem; padding: 0.6rem 0.7rem; border: 1px solid rgba(96, 165, 250, 0.4); border-radius: 14px; background: rgba(9, 13, 22, 0.88); text-align: center; transform: translate(-50%, -50%); }
.dg-loop__stop span { display: inline-grid; place-items: center; width: 1.3rem; height: 1.3rem; margin: 0 auto 0.15rem; border-radius: 999px; background: rgba(59, 130, 246, 0.2); color: #bfdbfe !important; font-size: 0.66rem; font-weight: 800; }
.dg-loop__stop strong { color: #f1f5f9 !important; font-size: 0.78rem !important; font-family: Sora, Inter, sans-serif !important; }
.dg-loop__stop small { color: #94a3b8 !important; font-size: 0.62rem !important; }
.dg-loop__stop--1 { top: 3%; left: 50%; }
.dg-loop__stop--2 { top: 36%; left: 96%; }
.dg-loop__stop--3 { top: 92%; left: 74%; }
.dg-loop__stop--4 { top: 92%; left: 26%; }
.dg-loop__stop--5 { top: 36%; left: 4%; }

/* —— Part 3 · scenario journey (explicit human gate) —— */
.dg-journey { list-style: none; margin: 0; padding: 0 0 0 0.4rem; display: grid; gap: 0.55rem; }
.dg-journey__step { position: relative; display: grid; grid-template-columns: auto 1fr; gap: 0.9rem; align-items: start; padding: 0.85rem 1rem 0.85rem 0.9rem; border: 1px solid rgba(36, 50, 68, 0.9); border-radius: 14px; background: rgba(9, 13, 22, 0.72); }
.dg-journey__step > div { display: grid; grid-template-columns: auto 1fr; gap: 0.1rem 0.6rem; align-items: center; }
.dg-journey__step > div > strong { grid-column: 1 / -1; }
.dg-journey__step .dg-brain { grid-row: span 2; }
.dg-journey__step .dg-brain + strong, .dg-journey__step .dg-brain ~ p { grid-column: 2; }
.dg-journey__step strong { color: #f1f5f9 !important; font-size: 0.86rem !important; font-family: Sora, Inter, sans-serif !important; }
.dg-journey__step p { margin: 0.1rem 0 0 !important; color: #94a3b8 !important; font-size: 0.76rem !important; }
.dg-journey__dot { width: 0.7rem; height: 0.7rem; margin-top: 0.4rem; border-radius: 999px; background: #60a5fa; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.14); }
.dg-journey__step.is-signal { border-color: rgba(56, 189, 248, 0.45); }
.dg-journey__step.is-signal .dg-journey__dot { background: #38bdf8; }
.dg-journey__step.is-brain { border-color: rgba(96, 165, 250, 0.55); background: linear-gradient(150deg, rgba(30, 64, 175, 0.16), rgba(9, 13, 22, 0.8)); }
.dg-journey__step.is-positive { border-color: rgba(52, 211, 153, 0.45); }
.dg-journey__step.is-positive .dg-journey__dot { background: #34d399; box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.14); }
.dg-journey__gate { border-color: rgba(251, 191, 36, 0.5); background: linear-gradient(150deg, rgba(120, 83, 8, 0.22), rgba(9, 13, 22, 0.82)); }
.dg-journey__gate .dg-journey__dot { background: #fbbf24; box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.16); }
.dg-gate__badge { display: inline-block; margin-top: 0.35rem; padding: 0.25rem 0.6rem; border: 1px solid rgba(251, 191, 36, 0.5); border-radius: 999px; color: #fde68a !important; font-size: 0.64rem; font-weight: 800; letter-spacing: 0.04em; }

/* —— Part 4 · maturity rail —— */
.dg-rail { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0.6rem; align-items: stretch; }
.dg-rail__step { position: relative; display: grid; gap: 0.25rem; padding: 1rem 0.8rem; border: 1px solid rgba(51, 65, 85, 0.9); border-radius: 16px; background: rgba(9, 13, 22, 0.75); text-align: center; }
.dg-rail__step:not(:last-child)::after { content: "→"; position: absolute; right: -0.55rem; top: 50%; transform: translateY(-50%); color: #60a5fa; font-weight: 800; z-index: 2; }
.dg-rail__num { display: inline-grid; place-items: center; width: 1.5rem; height: 1.5rem; margin: 0 auto; border-radius: 999px; background: rgba(59, 130, 246, 0.16); color: #93c5fd !important; font-size: 0.68rem; font-weight: 800; }
.dg-rail__step strong { color: #e2e8f0 !important; font-size: 0.8rem !important; font-family: Sora, Inter, sans-serif !important; }
.dg-rail__step small { color: #94a3b8 !important; font-size: 0.66rem !important; }
.dg-rail__step.is-live { border-color: rgba(96, 165, 250, 0.5); box-shadow: inset 0 0 30px rgba(59, 130, 246, 0.1); }
.dg-rail__step.is-peak { border-color: rgba(52, 211, 153, 0.5); background: linear-gradient(160deg, rgba(6, 78, 59, 0.24), rgba(9, 13, 22, 0.8)); }

/* —— Part 4 · comparison (interface frame) —— */
.dg-compare { display: grid; grid-template-columns: 0.8fr 1.2fr; gap: 1.1rem; align-items: stretch; }
.dg-compare__side { display: grid; gap: 0.7rem; align-content: start; padding: 1.1rem; border: 1px solid rgba(51, 65, 85, 0.9); border-radius: 18px; background: rgba(9, 13, 22, 0.72); }
.dg-compare__side--dg { border-color: rgba(96, 165, 250, 0.4); background: linear-gradient(160deg, rgba(30, 64, 175, 0.1), rgba(9, 13, 22, 0.82)); }
.dg-compare__tag { font-size: 0.66rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #94a3b8 !important; }
.dg-compare__side--dg .dg-compare__tag { color: #93c5fd !important; }
.dg-compare__stat { display: grid; place-items: center; padding: 1.2rem; }
.dg-compare__stat strong { color: #e2e8f0 !important; font-size: clamp(2.4rem, 6vw, 3.6rem) !important; font-weight: 800; font-family: Sora, Inter, sans-serif; line-height: 1; }
.dg-compare__stat small { color: #94a3b8 !important; font-size: 0.72rem !important; }
.dg-compare__note { margin: 0 !important; color: #94a3b8 !important; font-size: 0.72rem !important; }
.dg-frame { border: 1px solid rgba(96, 165, 250, 0.35); border-radius: 14px; overflow: hidden; background: rgba(4, 8, 16, 0.9); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35); }
.dg-frame__bar { display: flex; align-items: center; gap: 0.35rem; padding: 0.5rem 0.75rem; background: rgba(15, 23, 42, 0.95); border-bottom: 1px solid rgba(96, 165, 250, 0.2); }
.dg-frame__bar span { width: 0.55rem; height: 0.55rem; border-radius: 999px; background: rgba(148, 163, 184, 0.4); }
.dg-frame__bar em { margin-left: auto; font-style: normal; color: #93c5fd !important; font-size: 0.66rem; font-weight: 800; letter-spacing: 0.06em; }
.dg-frame__body { display: grid; gap: 0.5rem; padding: 0.9rem 1rem 1rem; }
.dg-frame__line { margin: 0 !important; color: #e2e8f0 !important; font-size: 0.84rem !important; line-height: 1.4 !important; }
.dg-frame__line--done { color: #a7f3d0 !important; }
.dg-frame__pill { display: inline-block; margin-right: 0.4rem; padding: 0.12rem 0.5rem; border-radius: 999px; background: rgba(251, 191, 36, 0.16); color: #fde68a !important; font-size: 0.64rem; font-weight: 800; }
.dg-frame__cta { display: inline-block; margin-top: 0.2rem; padding: 0.45rem 0.75rem; border-radius: 10px; border: 1px solid rgba(96, 165, 250, 0.4); color: #bfdbfe !important; font-size: 0.72rem; font-weight: 800; }

/* —— Part 4 · governance split —— */
.dg-govern { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; align-items: stretch; }
.dg-govern__col { display: grid; gap: 0.55rem; align-content: start; padding: 1rem; border: 1px solid rgba(51, 65, 85, 0.9); border-radius: 16px; background: rgba(9, 13, 22, 0.72); }
.dg-govern__col--human { border-color: rgba(251, 191, 36, 0.45); background: linear-gradient(160deg, rgba(120, 83, 8, 0.16), rgba(9, 13, 22, 0.8)); }
.dg-govern__col--system { border-color: rgba(52, 211, 153, 0.35); }
.dg-govern__role { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #93c5fd !important; }
.dg-govern__col--human .dg-govern__role { color: #fde68a !important; }
.dg-govern__col--system .dg-govern__role { color: #a7f3d0 !important; }
.dg-govern__col ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.35rem; }
.dg-govern__col li { position: relative; padding-left: 1rem; color: #cbd5e1 !important; font-size: 0.78rem; }
.dg-govern__col li::before { content: ""; position: absolute; left: 0; top: 0.5rem; width: 0.4rem; height: 0.4rem; border-radius: 999px; background: #60a5fa; }
.dg-govern__col--human li::before { background: #fbbf24; }
.dg-govern__col--system li::before { background: #34d399; }

/* —— Responsive: reflow, never shrink into microscopic labels —— */
@media (max-width: 900px) {
  .dg-stack { grid-template-columns: 1fr; }
  .dg-stack__context { grid-auto-flow: column; justify-content: center; }
  .dg-anatomy { grid-template-columns: 1fr; }
  .dg-compare { grid-template-columns: 1fr; }
  .dg-path { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .dg-path .dg-node:not(:last-child)::after { content: ""; }
}
@media (max-width: 680px) {
  .dg-stage { min-height: 0; padding: 1.35rem; border-radius: 20px; }
  .dg-converge { grid-template-columns: 1fr; }
  .dg-converge__paths { display: none; }
  .dg-converge__sources { grid-auto-flow: row; }
  /* Loop and rail become vertical sequences on mobile (relationships preserved) */
  .dg-loop { min-height: 0; }
  .dg-loop__ring, .dg-loop__center { display: none; }
  .dg-loop__stops { position: static; width: 100%; aspect-ratio: auto; display: grid; gap: 0.55rem; }
  .dg-loop__stop { position: static; width: auto; transform: none; text-align: left; grid-template-columns: auto 1fr; align-items: center; gap: 0.1rem 0.7rem; }
  .dg-loop__stop span { margin: 0; }
  .dg-loop__stop strong { grid-column: 2; }
  .dg-loop__stop small { grid-column: 2; }
  .dg-rail { grid-template-columns: 1fr; }
  .dg-rail__step:not(:last-child)::after { content: "↓"; right: 50%; top: auto; bottom: -0.55rem; transform: translateX(50%); }
  .dg-orbit__ring { grid-template-columns: 1fr 1fr; }
  .dg-govern { grid-template-columns: 1fr; }
  .dg-path { grid-template-columns: 1fr; }
  .dg-anatomy__group { grid-template-columns: 1fr; }
  .dg-scatter__owner { position: static; transform: none; margin: 0 auto 1rem; }
  .dg-scatter { min-height: 0; display: grid; gap: 0.5rem; }
  .dg-scatter__field { position: static; display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
  .dg-scatter__chip { position: static; }
  [class*="dg-scatter__chip--p"] { top: auto; bottom: auto; left: auto; right: auto; }
}

/* —— Motion: explains state/change; excellent static fallback by default —— */
@media (prefers-reduced-motion: no-preference) {
  .dg-brain__spark { animation: dgBrainSpark 3.2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  .dg-flow__line { stroke-dasharray: 5 9; animation: dgFlowMove 2.4s linear infinite; }
  .dg-flow__loop { stroke-dasharray: 7 12; animation: dgFlowMove 2.6s linear infinite; }
  .dg-stack__layer--brain { animation: dgStagePulse 3.6s ease-in-out infinite; }
  .dg-frame__line--done { animation: dgFrameReveal 0.6s ease-out 0.2s both; }
  @keyframes dgBrainSpark { 0%, 100% { opacity: 0.6; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.15); } }
  @keyframes dgFlowMove { to { stroke-dashoffset: -28; } }
  @keyframes dgStagePulse { 0%, 100% { box-shadow: inset 0 0 0 rgba(59,130,246,0); } 50% { box-shadow: inset 0 0 34px rgba(59,130,246,0.14); } }
  @keyframes dgFrameReveal { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
}
`;
