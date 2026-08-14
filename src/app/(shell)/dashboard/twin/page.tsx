import { IntelligenceSurfacePage } from "@/components/platform/IntelligenceSurfacePage";

export default function DigitalTwinPage() {
  return (
    <IntelligenceSurfacePage
      eyebrow="Business · Digital Twin"
      title="Digital Twin"
      summary="A live digital representation of your business — context for AI Advisor, health and recommended actions."
      body="Your Twin already informs Overview. This dedicated surface will deepen Twin context, connected systems and what the model knows about your business — without becoming another disconnected dashboard."
      primaryHref="/dashboard"
      primaryLabel="View Twin on Overview →"
    />
  );
}
