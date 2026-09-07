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
`;
